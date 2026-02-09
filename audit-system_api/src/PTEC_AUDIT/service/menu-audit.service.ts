// src/PTEC_AUDIT/service/ptec_audit.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuAudit } from '../domain/menu-audit.entity';
import { MenuAuditPermission } from '../domain/menu-audit-permission.entity';
import { MenuAuditResponseDto } from '../dto/menu-audit.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(MenuAudit)
    private readonly menuAuditRepository: Repository<MenuAudit>,
    @InjectRepository(MenuAuditPermission)
    private readonly menuPermissionRepository: Repository<MenuAuditPermission>,
  ) {}

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
      .leftJoin(
        MenuAuditPermission,
        'perm',
        'perm.menu_id = menu.menu_id AND perm.role_id = :roleId',
        { roleId },
      )
      .where('menu.is_active = 1')
      .andWhere('(perm.can_view = 1 OR perm.can_view IS NULL)')
      .select([
        'menu.menu_id AS menuId',
        'menu.name AS name',
        'menu.path AS path',
        'menu.icon AS icon',
        'menu.parent_id AS parentId',
        'menu.order_no AS orderNo',
        'menu.is_active AS isActive',
        'ISNULL(perm.can_view, 1) AS canView',
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

    // สร้าง tree structure
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
  async checkMenuPermission(roleId: number, menuId: number): Promise<boolean> {
    const permission = await this.menuPermissionRepository.findOne({
      where: {
        roleId,
        menuId,
        canView: true,
      },
    });

    return !!permission;
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
