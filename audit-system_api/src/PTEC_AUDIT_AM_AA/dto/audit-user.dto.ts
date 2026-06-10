import { IsInt, IsOptional } from 'class-validator';

export class CreateAuditUserDto {
  @IsInt()
  userId!: number;

  @IsInt()
  @IsOptional()
  createdBy?: number;
}

export class AuditUserResponseDto {
  taggedUserId!: number;
  itemId!: number;
  userId!: number;
  userCode?: string;
  fullname?: string;
  email?: string;
  position?: string;
  branchId?: number;
  createdBy!: number;
  createdAt!: Date;
  active!: boolean;
}
