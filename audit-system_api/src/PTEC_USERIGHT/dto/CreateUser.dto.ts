import { IsString, IsNotEmpty } from 'class-validator'; // ใช้ class-validator เพื่อตรวจสอบความถูกต้องของข้อมูล

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  Name: string;

  @IsString()
  @IsNotEmpty()
  Firstname: string;

  @IsString()
  @IsNotEmpty()
  Lastname: string;

  @IsString()
  @IsNotEmpty()
  loginname: string;

  @IsString()
  @IsNotEmpty()
  branchid: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsString()
  secid: string;

  @IsString()
  @IsNotEmpty()
  positionid: string;

  @IsString()
  @IsNotEmpty()
  empupper: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  role_id: string;
}
