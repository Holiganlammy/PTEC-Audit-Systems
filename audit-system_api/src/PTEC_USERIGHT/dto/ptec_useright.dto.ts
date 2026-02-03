import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator'; // ใช้ class-validator เพื่อตรวจสอบความถูกต้องของข้อมูล

export class User {
  @IsNotEmpty()
  @IsNumber()
  UserID: number;

  @IsNotEmpty()
  @IsString()
  UserCode: string;

  @IsOptional()
  @IsString()
  Fullname: string;

  @IsOptional()
  @IsNumber()
  BranchID: number;

  @IsOptional()
  @IsNumber()
  DepID: number;

  @IsOptional()
  @IsString()
  Email: string;

  @IsOptional()
  @IsString()
  SecCode: string;

  @IsOptional()
  @IsString()
  DepCode: string;

  @IsOptional()
  @IsString()
  UserType: string;

  @IsOptional()
  @IsString()
  img_profile: string;

  @IsOptional()
  @IsString()
  fristName: string;

  @IsOptional()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsNumber()
  Tel: number;

  @IsOptional()
  @IsNumber()
  Actived: number;

  @IsOptional()
  @IsString()
  Position: string;

  @IsOptional()
  @IsString()
  PositionCode: string;

  @IsOptional()
  @IsNumber()
  PositionID: number;

  @IsOptional()
  @IsString()
  EmpUpper: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

export class GetWelfareDto {
  @IsString()
  usercode: string;

  @IsNumber()
  welfaretypeid: number;

  @IsString()
  sbc_hotelProvince: string;
}
