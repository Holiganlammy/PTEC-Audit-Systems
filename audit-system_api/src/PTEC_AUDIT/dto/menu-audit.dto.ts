// src/PTEC_AUDIT/dto/menu-audit.dto.ts
import { IsInt, IsOptional } from 'class-validator';

export class GetMenuByRoleDto {
  @IsInt()
  @IsOptional()
  roleId: number;
}

export class MenuAuditResponseDto {
  menuId: number;
  name: string;
  path: string | null;
  icon: string | null;
  parentId: number | null;
  orderNo: number;
  isActive: boolean;
  canView?: boolean; // from permission
  children?: MenuAuditResponseDto[];
}
