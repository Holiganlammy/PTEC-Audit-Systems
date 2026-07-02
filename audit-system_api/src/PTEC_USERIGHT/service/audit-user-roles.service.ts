import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditUserRoles } from '../domain/model/audit-user-roles.entity';
import { RoleSystemAudit } from '../domain/model/role-system-audit.entity';
import { CreateUserRoleDto, UpdateUserRoleDto } from '../dto/User_Role.dto';

export interface AuditRoleInfo {
  roleId: number;
  roleName: string;
  userId?: number;
}

@Injectable()
export class AuditUserRolesService {
  constructor(
    @InjectRepository(AuditUserRoles)
    private readonly auditUserRolesRepo: Repository<AuditUserRoles>,
    @InjectRepository(RoleSystemAudit)
    private readonly roleSystemAuditRepo: Repository<RoleSystemAudit>,
  ) {}

  async getRoleByUserCode(userCode: string): Promise<AuditRoleInfo | null> {
    const userRole = await this.auditUserRolesRepo
      .createQueryBuilder('ur')
      .innerJoin(RoleSystemAudit, 'r', 'r.role_id = ur.role_id')
      .select([
        'ur.role_id AS roleId',
        'r.role_name AS roleName',
        'ur.user_id AS userId',
      ])
      .where('ur.user_code = :userCode', { userCode: userCode.toUpperCase() })
      .andWhere('ur.active = :active', { active: 1 })
      .getRawOne<{ roleId: number; roleName: string; userId: number }>();

    if (!userRole) return null;

    return {
      roleId: Number(userRole.roleId),
      roleName: userRole.roleName,
      userId: userRole.userId ? Number(userRole.userId) : undefined,
    };
  }

  async getRoleByUserId(userId: number): Promise<AuditRoleInfo | null> {
    const userRole = await this.auditUserRolesRepo
      .createQueryBuilder('ur')
      .innerJoin(RoleSystemAudit, 'r', 'r.role_id = ur.role_id')
      .select(['ur.role_id AS roleId', 'r.role_name AS roleName'])
      .where('ur.user_id = :userId', { userId })
      .andWhere('ur.active = :active', { active: 1 })
      .getRawOne<{ roleId: number; roleName: string }>();

    if (!userRole) return null;

    return {
      roleId: Number(userRole.roleId),
      roleName: userRole.roleName,
    };
  }

  async getAllRoles(currentRoleId?: number): Promise<RoleSystemAudit[]> {
    const query = this.roleSystemAuditRepo
      .createQueryBuilder('r')
      .orderBy('r.roleId', 'ASC');

    // Only Admin (role 1) can see role 1 in the list
    if (currentRoleId !== 1) {
      query.where('r.role_id != :adminRoleId', { adminRoleId: 1 });
    }

    return await query.getMany();
  }

  async findAll(filters?: {
    roleId?: number;
    active?: number;
    page?: number;
    limit?: number;
  }): Promise<{ data: AuditUserRoles[]; total: number }> {
    const query = this.auditUserRolesRepo
      .createQueryBuilder('ur')
      .leftJoinAndSelect('ur.role', 'role')
      .orderBy('ur.createdAt', 'DESC');

    if (filters?.roleId !== undefined) {
      query.andWhere('ur.role_id = :roleId', { roleId: filters.roleId });
    }

    if (filters?.active !== undefined) {
      query.andWhere('ur.active = :active', { active: filters.active });
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  async findOne(userRoleId: number): Promise<AuditUserRoles> {
    const userRole = await this.auditUserRolesRepo.findOne({
      where: { userRoleId },
      relations: ['role'],
    });

    if (!userRole) {
      throw new NotFoundException(`User role with ID ${userRoleId} not found`);
    }

    return userRole;
  }

  async create(createDto: CreateUserRoleDto): Promise<AuditUserRoles> {
    // Check if user already has an active role
    const existing = await this.auditUserRolesRepo.findOne({
      where: {
        userId: createDto.userId,
        active: 1,
      },
    });

    if (existing) {
      throw new ConflictException(
        `User ${createDto.userCode} already has an active role. Please deactivate it first.`,
      );
    }

    // Verify role exists
    const role = await this.roleSystemAuditRepo.findOne({
      where: { roleId: createDto.roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${createDto.roleId} not found`);
    }

    const userRole = this.auditUserRolesRepo.create({
      userId: createDto.userId,
      userCode: createDto.userCode.toUpperCase(),
      roleId: createDto.roleId,
      createdBy: createDto.createdBy || null,
      active: 1,
    });

    return await this.auditUserRolesRepo.save(userRole);
  }

  async update(
    userRoleId: number,
    updateDto: UpdateUserRoleDto,
  ): Promise<AuditUserRoles> {
    const userRole = await this.auditUserRolesRepo.findOneBy({ userRoleId });

    if (!userRole) {
      throw new NotFoundException(`User role with ID ${userRoleId} not found`);
    }

    if (updateDto.roleId === undefined && updateDto.updatedBy === undefined) {
      throw new BadRequestException(
        'At least one field is required: roleId or updatedBy',
      );
    }

    const updatePayload: Partial<AuditUserRoles> = {};

    if (updateDto.roleId !== undefined) {
      const role = await this.roleSystemAuditRepo.findOne({
        where: { roleId: updateDto.roleId },
      });

      if (!role) {
        throw new NotFoundException(
          `Role with ID ${updateDto.roleId} not found`,
        );
      }

      updatePayload.roleId = updateDto.roleId;
    }

    if (updateDto.updatedBy !== undefined) {
      updatePayload.updatedBy = updateDto.updatedBy;
    }

    await this.auditUserRolesRepo.update(userRoleId, updatePayload);

    return await this.findOne(userRoleId);
  }

  // Soft delete (deactivate)
  async remove(userRoleId: number, updatedBy?: number): Promise<void> {
    const userRole = await this.findOne(userRoleId);
    userRole.active = 0;
    userRole.updatedBy = updatedBy || null;
    await this.auditUserRolesRepo.save(userRole);
  }

  // Reactivate user role
  async reactivate(
    userRoleId: number,
    updatedBy?: number,
  ): Promise<AuditUserRoles> {
    const userRole = await this.findOne(userRoleId);

    // Check if user already has another active role
    const existing = await this.auditUserRolesRepo.findOne({
      where: {
        userId: userRole.userId,
        active: 1,
      },
    });

    if (existing && existing.userRoleId !== userRoleId) {
      throw new ConflictException(
        `User already has an active role. Please deactivate it first.`,
      );
    }

    userRole.active = 1;
    userRole.updatedBy = updatedBy || null;
    return await this.auditUserRolesRepo.save(userRole);
  }

  async delete(userRoleId: number): Promise<void> {
    const result = await this.auditUserRolesRepo.delete(userRoleId);
    if (result.affected === 0) {
      throw new NotFoundException(`User role with ID ${userRoleId} not found`);
    }
  }
}
