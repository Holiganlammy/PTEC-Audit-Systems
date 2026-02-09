import {
  IsOptional,
  IsInt,
  IsString,
  IsDateString,
  IsBoolean,
} from 'class-validator';
// import { Type } from 'class-transformer';

export class CreateAuditJobDto {
  @IsOptional()
  @IsString()
  jobNo?: string;

  @IsOptional()
  @IsInt()
  branchId?: number;

  @IsOptional()
  @IsString()
  branchName?: string;

  @IsOptional()
  @IsDateString()
  auditDate?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  pmCode?: string;

  @IsOptional()
  @IsInt()
  auditorUserId?: number;

  @IsOptional()
  @IsInt()
  districtManagerUserId?: number;

  @IsOptional()
  @IsInt()
  branchManagerUserId?: number;

  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @IsOptional()
  @IsString()
  excelFileName?: string;

  @IsOptional()
  @IsString()
  excelFilePath?: string;

  @IsOptional()
  @IsInt()
  status?: number;

  @IsOptional()
  @IsInt()
  createdBy?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
