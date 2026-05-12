// src/PTEC_AUDIT/service/ptec_audit.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuAudit } from '../domain/model/menu-audit.entity';
import { MenuAuditPermission } from '../domain/model/menu-audit-permission.entity';
import { MenuAuditResponseDto } from '../dto/menu-audit.dto';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';
import { AuditUserRolesService } from '../../PTEC_USERIGHT/service/audit-user-roles.service';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(MenuAudit)
    private readonly menuAuditRepository: Repository<MenuAudit>,
    @InjectRepository(MenuAuditPermission)
    private readonly menuPermissionRepository: Repository<MenuAuditPermission>,
    private readonly userRightService: UserRightService,
    private readonly auditUserRolesService: AuditUserRolesService,
  ) {}

  private async getRoleIdByUserId(userId: number): Promise<number | null> {
    // Prefer Audit role mapping (Audit_User_Roles) over Portal role_id
    const auditRole = await this.auditUserRolesService.getRoleByUserId(userId);
    if (auditRole?.roleId !== undefined && auditRole?.roleId !== null) {
      return Number(auditRole.roleId);
    }

    // Fallback: pull role_id from portal user info if audit mapping is missing
    const users = await this.userRightService.getUsersFromProcedure(
      null,
      userId,
    );
    const roleId = users?.[0]?.role_id;
    if (roleId === undefined || roleId === null) return null;
    return Number(roleId);
  }

  private async getRoleIdByUserCode(userCode: string): Promise<number | null> {
    const auditRole =
      await this.auditUserRolesService.getRoleByUserCode(userCode);
    if (auditRole?.roleId !== undefined && auditRole?.roleId !== null) {
      return Number(auditRole.roleId);
    }
    return null;
  }

  // async getMenusByUserCode(userCode: string): Promise<MenuAuditResponseDto[]> {
  //   const roleId = await this.getRoleIdByUserCode(userCode);
  //   console.log(`UserCode ${userCode} has roleId:`, roleId);
  //   if (roleId === null) {
  //     return [];
  //   }
  //   return this.getMenusByRole(roleId);
  // }

  async getMenuTreeByUserCode(
    userCode: string,
  ): Promise<MenuAuditResponseDto[]> {
    const roleId = await this.getRoleIdByUserCode(userCode);
    // console.log(`UserCode ${userCode} has roleId:`, roleId); logging นี้อาจจะมีความสำคัญในการดีบัก ถ้า userCode ที่ส่งมาไม่มี mapping ในระบบ จะทำให้ roleId เป็น null และไม่สามารถดึงเมนูได้
    if (roleId === null) {
      return [];
    }
    return this.getMenuTreeByRole(roleId);
  }

  async getMenusByUserId(userId: number): Promise<MenuAuditResponseDto[]> {
    const roleId = await this.getRoleIdByUserId(userId);
    if (roleId === null) {
      return [];
    }
    return this.getMenusByRole(roleId);
  }

  async getMenuTreeByUserId(userId: number): Promise<MenuAuditResponseDto[]> {
    const roleId = await this.getRoleIdByUserId(userId);
    if (roleId === null) {
      return [];
    }
    return this.getMenuTreeByRole(roleId);
  }

  /**
   * ดึง menu ทั้งหมด (active only)
   */
  async getAllMenus(): Promise<MenuAudit[]> {
    return await this.menuAuditRepository.find({
      where: { isActive: true },
      order: { orderNo: 'ASC' },
    });
  }

  /**
   * ดึง menu ตาม role_id (แบบ flat list)
   */
  async getMenusByRole(roleId: number): Promise<MenuAuditResponseDto[]> {
    interface RawMenuResult {
      menuId: number;
      name: string;
      path: string;
      icon: string;
      parentId: number | null;
      orderNo: number;
      isActive: number;
      canView: number;
    }

    const rows = await this.menuAuditRepository
      .createQueryBuilder('menu')
      .innerJoin(
        MenuAuditPermission,
        'perm',
        'perm.menu_id = menu.menu_id AND perm.role_id = :roleId',
        { roleId },
      )
      .where('menu.is_active = 1')
      .andWhere('perm.can_view = 1')
      .select([
        'menu.menu_id AS menuId',
        'menu.name AS name',
        'menu.path AS path',
        'menu.icon AS icon',
        'menu.parent_id AS parentId',
        'menu.order_no AS orderNo',
        'menu.is_active AS isActive',
        'perm.can_view AS canView',
      ])
      .orderBy('menu.order_no', 'ASC')
      .getRawMany<RawMenuResult>();

    return rows.map((r) => ({
      menuId: Number(r.menuId),
      name: r.name,
      path: r.path,
      icon: r.icon,
      parentId: r.parentId === null ? null : Number(r.parentId),
      orderNo: Number(r.orderNo),
      isActive: Boolean(r.isActive),
      canView: Boolean(r.canView),
    }));
  }

  /**
   * ดึง menu ตาม role_id (แบบ hierarchical tree)
   */
  async getMenuTreeByRole(roleId: number): Promise<MenuAuditResponseDto[]> {
    const flatMenus = await this.getMenusByRole(roleId);
    const menuMap = new Map<number, MenuAuditResponseDto>();
    const rootMenus: MenuAuditResponseDto[] = [];

    // สร้าง map
    flatMenus.forEach((menu: MenuAuditResponseDto) => {
      menuMap.set(menu.menuId, { ...menu, children: [] });
    });

    // สร้าง tree
    flatMenus.forEach((menu: MenuAuditResponseDto) => {
      const menuItem = menuMap.get(menu.menuId)!;

      if (menu.parentId === null) {
        // Root menu
        rootMenus.push(menuItem);
      } else {
        // Child menu
        const parent = menuMap.get(menu.parentId);
        if (parent) {
          parent.children!.push(menuItem);
        }
      }
    });

    return rootMenus;
  }

  /**
   * ตรวจสอบว่า user มี permission กับ menu นี้หรือไม่
   */
  // async checkMenuPermission(roleId: number, menuId: number): Promise<boolean> {
  //   const permission = await this.menuPermissionRepository.findOne({
  //     where: {
  //       roleId,
  //       menuId,
  //       canView: true,
  //     },
  //   });

  //   return !!permission;
  // }

  async getPermittedMenusByRole(roleId: number): Promise<
    Array<{
      menu_id: number;
      name: string | null;
      path: string | null;
      icon: string | null;
      parent_id: number | null;
      order_no: number | null;
      is_active: boolean;
    }>
  > {
    interface RawPermittedMenu {
      menu_id: number;
      name: string | null;
      path: string | null;
      icon: string | null;
      parent_id: number | null;
      order_no: number | null;
      is_active: number | boolean | null;
    }

    // NOTE: ไม่กรอง menu.is_active ที่นี่ เพื่อให้เมนูที่ซ่อน (is_active = 0)
    // ยังถูกคืนกลับไปใช้สำหรับอนุญาติเข้า path ได้
    const rows = await this.menuAuditRepository
      .createQueryBuilder('menu')
      .leftJoin(
        MenuAuditPermission,
        'perm',
        'perm.menu_id = menu.menu_id AND perm.role_id = :roleId',
        { roleId },
      )
      .where('(perm.can_view = 1 OR perm.can_view IS NULL)')
      .select([
        'menu.menu_id AS menu_id',
        'menu.name AS name',
        'menu.path AS path',
        'menu.icon AS icon',
        'menu.parent_id AS parent_id',
        'menu.order_no AS order_no',
        'menu.is_active AS is_active',
      ])
      .orderBy('menu.order_no', 'ASC')
      .addOrderBy('menu.menu_id', 'ASC')
      .getRawMany<RawPermittedMenu>();

    return rows.map((r) => ({
      menu_id: Number(r.menu_id),
      name: r.name ?? null,
      path: r.path ?? null,
      icon: r.icon ?? null,
      parent_id: r.parent_id === null ? null : Number(r.parent_id),
      order_no: r.order_no === null ? null : Number(r.order_no),
      is_active: Boolean(r.is_active),
    }));
  }

  async getPermittedMenusByUserId(userId: number): Promise<
    Array<{
      menu_id: number;
      name: string | null;
      path: string | null;
      icon: string | null;
      parent_id: number | null;
      order_no: number | null;
      is_active: boolean;
    }>
  > {
    const roleId = await this.getRoleIdByUserId(userId);
    if (roleId === null) {
      return [];
    }
    return this.getPermittedMenusByRole(roleId);
  }

  async checkMenuPermissionByRole(
    roleId: number,
    menuId: number,
  ): Promise<boolean> {
    const row = await this.menuAuditRepository
      .createQueryBuilder('menu')
      .leftJoin(
        MenuAuditPermission,
        'perm',
        'perm.menu_id = menu.menu_id AND perm.role_id = :roleId',
        { roleId },
      )
      .where('menu.menu_id = :menuId', { menuId })
      .andWhere('(perm.can_view = 1 OR perm.can_view IS NULL)')
      .select(['menu.menu_id AS menuId'])
      .getRawOne<{ menuId: number }>();

    return !!row;
  }

  async checkMenuPermission(userId: number, menuId: number): Promise<boolean> {
    const roleId = await this.getRoleIdByUserId(userId);
    if (roleId === null) {
      return false;
    }
    return this.checkMenuPermissionByRole(roleId, menuId);
  }

  /**
   * ดึง menu permissions ทั้งหมดของ role
   */
  async getMenuPermissionsByRole(
    roleId: number,
  ): Promise<MenuAuditPermission[]> {
    return await this.menuPermissionRepository.find({
      where: { roleId },
      relations: ['menu'],
    });
  }
}
