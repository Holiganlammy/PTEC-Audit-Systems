import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator'; // ใช้ class-validator เพื่อตรวจสอบความถูกต้องของข้อมูล

export class MenuAuditDto {
  @IsNumber()
  @IsNotEmpty()
  UserID: number;

  @IsOptional()
  @IsNumber()
  menuId?: number;
}
