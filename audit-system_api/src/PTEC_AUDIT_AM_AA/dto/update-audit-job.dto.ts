import {
  IsInt,
  IsString,
  IsDate,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class UpdateAuditJobDto {
  @IsInt()
  @IsOptional()
  branchId?: number;

  @IsString()
  @IsOptional()
  branchName?: string;

  @IsDate()
  @IsOptional()
  auditDate?: Date;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  pmCode?: string;

  @IsInt()
  @IsOptional()
  auditorUserId?: number;

  @IsInt()
  @IsOptional()
  districtManagerUserId?: number;

  @IsInt()
  @IsOptional()
  branchManagerUserId?: number;

  @IsString()
  @IsOptional()
  additionalNotes?: string;

  @IsString()
  @IsOptional()
  excelFileName?: string;

  @IsString()
  @IsOptional()
  excelFilePath?: string;

  @IsInt()
  @IsOptional()
  status?: number;

  @IsInt()
  @IsOptional()
  updatedBy?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  @IsOptional()
  positionType?: string;
}
