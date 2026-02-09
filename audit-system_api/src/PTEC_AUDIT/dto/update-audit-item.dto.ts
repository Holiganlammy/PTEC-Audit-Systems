import { PartialType } from '@nestjs/mapped-types';
import { CreateAuditItemDto } from './create-audit-item.dto';
import { IsOptional, IsInt } from 'class-validator';

export class UpdateAuditItemDto extends PartialType(CreateAuditItemDto) {
  @IsOptional()
  @IsInt()
  updateBy?: number;
}
