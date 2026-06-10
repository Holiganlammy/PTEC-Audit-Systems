import { IsNumber, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsNumber()
  @IsNotEmpty()
  itemId!: number;

  @IsNumber()
  @IsNotEmpty()
  userId!: number;

  @IsString()
  @IsNotEmpty()
  note!: string;

  @IsNumber()
  @IsNotEmpty()
  createdBy!: number;

  @IsNumber()
  @IsOptional()
  approverStatus?: number; // เผื่ออนาคตมีการสร้าง comment ที่ไม่ต้องรออนุมัติ
}

export class UpdateCommentDto {
  @IsString()
  @IsOptional()
  note?: string;

  @IsNumber()
  @IsNotEmpty()
  updatedBy!: number;
}

export class ApproveCommentDto {
  @IsNumber()
  @IsNotEmpty()
  approverStatus!: number;

  @IsNumber()
  @IsNotEmpty()
  approverBy!: number;

  @IsString()
  @IsOptional()
  approverNote?: string; // เผื่อหัวหน้ามีหมายเหตุ
}
