import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryItemDto } from './create-category-item.dto';
import { IsOptional, IsInt } from 'class-validator';

export class UpdateCategoryItemDto extends PartialType(CreateCategoryItemDto) {
  @IsOptional()
  @IsInt()
  updatedBy?: number;
}
