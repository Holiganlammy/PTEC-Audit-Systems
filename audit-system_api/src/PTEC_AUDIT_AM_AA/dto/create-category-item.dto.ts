import { IsOptional, IsInt, IsString, IsBoolean } from 'class-validator';

export class CreateCategoryItemDto {
  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsInt()
  categoryCode?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  createdBy?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
