import {
  IsOptional,
  IsInt,
  IsString,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class CreateAuditItemDto {
  @IsOptional()
  @IsInt()
  jobId?: number;

  @IsOptional()
  @IsInt()
  categoryItemId?: number;

  @IsOptional()
  @IsDateString()
  inspectionDate?: string;

  @IsOptional()
  @IsInt()
  itemStatus?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsInt()
  createdBy?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
