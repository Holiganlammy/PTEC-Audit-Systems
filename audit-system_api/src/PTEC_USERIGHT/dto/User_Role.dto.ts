// ==========================================
// DTOs for User Roles Management
// ==========================================

import { IsInt, IsString, IsOptional } from 'class-validator';

// ── Create User Role DTO ──────────────────────────────────────────────────
export class CreateUserRoleDto {
  @IsInt()
  userId: number;

  @IsString()
  userCode: string;

  @IsInt()
  roleId: number;

  @IsInt()
  @IsOptional()
  createdBy?: number;
}

// ── Update User Role DTO ──────────────────────────────────────────────────
export class UpdateUserRoleDto {
  @IsInt()
  @IsOptional()
  roleId?: number;

  @IsInt()
  @IsOptional()
  updatedBy?: number;
}

// ── User Role Response DTO ────────────────────────────────────────────────
export class UserRoleResponseDto {
  userRoleId: number;
  userId: number;
  userCode: string;
  roleId: number;
  roleName: string;
  fullname?: string;
  email?: string;
  position?: string;
  BranchID?: number;
  BranchName?: string;
  createdBy: number | null;
  createdAt: Date | null;
  updatedBy: number | null;
  updatedAt: Date | null;
  active: number;
}

export class RoleDto {
  roleId: number;
  roleName: string;
}
