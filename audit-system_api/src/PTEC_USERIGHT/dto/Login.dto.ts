import {
  IsString,
  IsNotEmpty,
  IsBooleanString,
  IsNumber,
} from 'class-validator'; // ใช้ class-validator เพื่อตรวจสอบความถูกต้องของข้อมูล

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  loginname: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  usercode: string;

  @IsString()
  @IsNotEmpty()
  otpCode: string;

  @IsBooleanString()
  @IsNotEmpty()
  trustDevice: boolean | string;
}

export class TrustDeviceDto {
  @IsString()
  @IsNotEmpty()
  userCode: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsNotEmpty()
  userAgent: string;

  @IsString()
  @IsNotEmpty()
  ipAddress: string;

  @IsString()
  @IsNotEmpty()
  os: string;

  @IsString()
  @IsNotEmpty()
  browser: string;

  @IsString()
  @IsNotEmpty()
  deviceType: string;
}

export class GetTrustedDeviceDto {
  @IsString()
  @IsNotEmpty()
  userCode: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsNotEmpty()
  userAgent: string;

  @IsString()
  @IsNotEmpty()
  ipAddress: string;
}

export class ChangPasswordDto {
  @IsString()
  @IsNotEmpty()
  userCode: string;

  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

export class ForgetPasswordDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  token_hash: Buffer;

  @IsString()
  @IsNotEmpty()
  expires_at: Date;

  @IsString()
  @IsNotEmpty()
  ip_address: string;

  @IsString()
  @IsNotEmpty()
  user_agent: string;
}

export class resetPasswordDTO {
  @IsNumber()
  @IsNotEmpty()
  UserID: number;

  @IsString()
  @IsNotEmpty()
  userCode: string;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  tokenHash: Buffer;

  @IsString()
  @IsNotEmpty()
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

export class CheckUserPermissionDto {
  @IsString()
  @IsNotEmpty()
  UserCode: string;

  @IsString()
  @IsNotEmpty()
  SystemCode: string;
}

export class GetUserWithRolesDto {
  @IsString()
  @IsNotEmpty()
  UserCode: string;
}
