import { PartialType } from '@nestjs/mapped-types';
import { CreateAuditJobDto } from './create-audit-job.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateAuditJobDto extends PartialType(CreateAuditJobDto) {
  @IsOptional()
  @IsString()
  updatedBy?: string;
}
