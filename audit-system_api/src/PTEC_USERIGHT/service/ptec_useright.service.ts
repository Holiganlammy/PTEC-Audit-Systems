import { Injectable } from '@nestjs/common';
import {
  ForgetPasswordModel,
  User,
  CreateUserResult,
  CheckUserPermission,
  UserWithRoles,
  UserAssets,
  Province,
} from '../domain/model/ptec_useright.entity';
import { Branch } from '../domain/model/ptec_useright.entity';
import { Department } from '../domain/model/ptec_useright.entity';
import { Section } from '../domain/model/ptec_useright.entity';
import { Position } from '../domain/model/ptec_useright.entity';
import { databaseConfig } from '../config/database.config';
import * as sql from 'mssql';
import {
  ChangPasswordDto,
  CheckUserPermissionDto,
  ForgetPasswordDto,
  GetTrustedDeviceDto,
  GetUserWithRolesDto,
  LoginDto,
  resetPasswordDTO,
  TrustDeviceDto,
} from '../dto/Login.dto';
import { CreateUserDto } from '../dto/CreateUser.dto';
import { EditUserDto } from '../dto/EditUser.dto';
// import { JwtService } from '@nestjs/jwt';
import { DatabaseManagerService } from 'src/database/database-manager.service';
import { GetWelfareDto } from '../dto/ptec_useright.dto';

@Injectable()
export class AppService {
  constructor(
    // private jwtService: JwtService,
    // private otpStore = new Map<string, string>(),
    private readonly dbManager: DatabaseManagerService,
  ) {}

  // signToken(user: User): string {
  //   const payload = {
  //     sub: user.UserCode, // ✅ เพิ่ม sub field
  //     userId: user.UserID,
  //     username: user.UserCode,
  //     role: user.PositionCode,
  //   };
  //   return this.jwtService.sign(payload);
  // }

  async getUserLogin(req: LoginDto) {
    return this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.User_Login_Cloud`,
      [
        { name: 'loginname', type: sql.NVarChar(50), value: req.loginname },
        { name: 'password', type: sql.NVarChar(50), value: req.password },
      ],
    );
  }

  async getUsersFromProcedure(
    usercode?: string | null,
    UserID?: number | null,
  ): Promise<User[]> {
    return this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.User_List_II`,
      [
        { name: 'usercode', type: sql.NVarChar(20), value: usercode },
        { name: 'UserID', type: sql.Int(), value: UserID },
      ],
    );
  }

  async createUser(req: CreateUserDto): Promise<CreateUserResult[]> {
    return this.dbManager.executeStoredProcedure<CreateUserResult>(
      `${databaseConfig.database}.dbo.User_Save_Cloud`,
      [
        { name: 'Name', type: sql.NVarChar(100), value: req.Name },
        { name: 'Firstname', type: sql.NVarChar(50), value: req.Firstname },
        { name: 'Lastname', type: sql.NVarChar(50), value: req.Lastname },
        { name: 'loginname', type: sql.NVarChar(20), value: req.loginname },
        { name: 'branchid', type: sql.Int(), value: req.branchid },
        { name: 'department', type: sql.NVarChar(20), value: req.department },
        { name: 'secid', type: sql.Int(), value: req.secid },
        { name: 'positionid', type: sql.Int(), value: req.positionid },
        { name: 'empupper', type: sql.NVarChar(10), value: req.empupper },
        { name: 'email', type: sql.NVarChar(100), value: req.email },
        { name: 'password', type: sql.NVarChar(50), value: req.password },
        { name: 'role_id', type: sql.VarChar(50), value: req.role_id },
      ],
    );
  }

  async editUser(id: string, req: EditUserDto) {
    const params = [
      { name: 'Firstname', type: sql.NVarChar(50), value: req.Firstname },
      { name: 'Lastname', type: sql.NVarChar(50), value: req.Lastname },
      { name: 'Name', type: sql.NVarChar(100), value: req.Name },
      { name: 'loginname', type: sql.NVarChar(20), value: req.loginname },
      { name: 'branchid', type: sql.Int(), value: req.branchid },
      { name: 'department', type: sql.NVarChar(20), value: req.department },
      { name: 'secid', type: sql.Int(), value: req.secid },
      { name: 'positionid', type: sql.Int(), value: req.positionid },
      { name: 'empupper', type: sql.NVarChar(10), value: req.empupper },
      { name: 'email', type: sql.NVarChar(100), value: req.email },
      { name: 'role_id', type: sql.VarChar(50), value: req.role_id },
    ];

    if (req.password) {
      params.push({
        name: 'password',
        type: sql.NVarChar(50),
        value: req.password,
      });
    }

    return this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.User_Save_Cloud`,
      params,
    );
  }

  async changeStatus(ID: string, actived: string): Promise<void> {
    await this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.User_Delete`,
      [
        { name: 'UserID', type: sql.VarChar(50), value: ID },
        { name: 'actived', type: sql.VarChar(10), value: actived },
      ],
    );
  }

  async getBranch(): Promise<Branch[]> {
    return this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.Branch_ListAll`,
      [],
    );
  }

  async getDepartment(): Promise<Department[]> {
    return this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.Department_List`,
      [],
    );
  }

  async getSection(): Promise<Section[]> {
    return this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.Section_List`,
      [],
    );
  }

  async getPosition(): Promise<Position[]> {
    return await this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.Position_List`,
      [],
    );
  }

  async saveTrustedDevice(req: TrustDeviceDto) {
    await this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.UserLogin_SaveTrustedDevice`,
      [
        { name: 'user_code', type: sql.VarChar(50), value: req.userCode },
        { name: 'device_id', type: sql.VarChar(100), value: req.deviceId },
        {
          name: 'user_agent',
          type: sql.NVarChar(sql.MAX),
          value: req.userAgent,
        },
        { name: 'ip_address', type: sql.VarChar(50), value: req.ipAddress },
        { name: 'os', type: sql.NVarChar(50), value: req.os },
        { name: 'browser', type: sql.NVarChar(50), value: req.browser },
        { name: 'deviceType', type: sql.NVarChar(50), value: req.deviceType },
      ],
    );
  }

  async checkTrustedDevice(req: GetTrustedDeviceDto) {
    const result =
      ((await this.dbManager.executeStoredProcedure(
        `${databaseConfig.database}.dbo.UserLogin_CheckTrustedDevice`,
        [
          { name: 'user_code', type: sql.VarChar(50), value: req.userCode },
          { name: 'device_id', type: sql.VarChar(100), value: req.deviceId },
          {
            name: 'user_agent',
            type: sql.NVarChar(sql.MAX),
            value: req.userAgent,
          },
          { name: 'ip_address', type: sql.VarChar(50), value: req.ipAddress },
        ],
      )) as unknown as Array<{ is_trusted: boolean }>) || [];
    return result?.[0]?.is_trusted === true;
  }

  async changePassword(req: ChangPasswordDto) {
    return this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.User_Change_Password_Cloud`,
      [
        { name: 'userCode', type: sql.VarChar(50), value: req.userCode },
        {
          name: 'newPassword',
          type: sql.VarChar(255),
          value: req.newPassword,
        },
        {
          name: 'confirmPassword',
          type: sql.VarChar(255),
          value: req.confirmPassword,
        },
        {
          name: 'currentPassword',
          type: sql.VarChar(255),
          value: req.currentPassword,
        },
      ],
    );
  }

  async forgetPassword(req: ForgetPasswordDto) {
    const result = await this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.User_ForgotPassword_New_Cloud`,
      [
        { name: 'email', type: sql.NVarChar(255), value: req.email },
        { name: 'token_hash', type: sql.VarBinary(32), value: req.token_hash },
        { name: 'expires_at', type: sql.DateTime2(0), value: req.expires_at },
        { name: 'ip_address', type: sql.VarChar(45), value: req.ip_address },
        { name: 'user_agent', type: sql.NVarChar(400), value: req.user_agent },
        // OUTPUT parameters
        { name: 'result', type: sql.Int(), output: true },
        { name: 'message', type: sql.NVarChar(500), output: true },
        { name: 'user_id', type: sql.BigInt(), output: true },
        { name: 'fullname', type: sql.NVarChar(100), output: true },
      ],
    );
    return result?.[0] as unknown as ForgetPasswordModel;
  }

  async validateResetToken(tokenHash: Buffer) {
    const result =
      ((await this.dbManager.executeStoredProcedure(
        `${databaseConfig.database}.dbo.User_Validate_Reset_Token`,
        [{ name: 'token_hash', type: sql.VarBinary(32), value: tokenHash }],
      )) as unknown as Array<{ is_valid: number; UserID: number | null }>) ||
      [];

    const row = result[0];
    return {
      isValid: row?.is_valid === 1,
      UserID: row?.UserID ?? null,
    };
  }

  async resetPassword(req: resetPasswordDTO) {
    const result =
      ((await this.dbManager.executeStoredProcedure(
        `${databaseConfig.database}.dbo.User_ResetPassword_Cloud`,
        [
          { name: 'UserID', type: sql.Int(), value: req.UserID },
          { name: 'userCode', type: sql.VarChar(50), value: req.userCode },
          {
            name: 'newPassword',
            type: sql.VarChar(255),
            value: req.newPassword,
          },
          { name: 'token_hash', type: sql.VarBinary(32), value: req.tokenHash },
        ],
      )) as unknown as Array<{
        success: number;
        samePassword: number | null;
      }>) || [];

    const row = result[0];
    return {
      success: row?.success === 1,
      samePassword: row?.samePassword ?? null,
    };
  }

  async CheckUserPermission(
    req: CheckUserPermissionDto,
  ): Promise<CheckUserPermission[]> {
    return this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.CheckUserPermission`,
      [
        { name: 'UserCode', type: sql.NVarChar(50), value: req.UserCode },
        { name: 'SystemCode', type: sql.NVarChar(50), value: req.SystemCode },
      ],
    );
  }

  async getUserWithRoles(req: GetUserWithRolesDto): Promise<UserWithRoles[]> {
    return this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.GetUserWithRoles_Cloud`,
      [{ name: 'UserCode', type: sql.NVarChar(50), value: req.UserCode }],
    );
  }

  async getsUserForAssetsControl(): Promise<UserAssets[]> {
    return this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.Fix_Assets_Control_Fetching_Users`,
      [],
    );
  }

  async getProvincesList(): Promise<Province[]> {
    return this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.Provinces_List`,
      [],
    );
  }

  async useright_getWelfare(req: GetWelfareDto) {
    return this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.useright_getWelfare`,
      [
        { name: 'usercode', type: sql.NVarChar(50), value: req.usercode },
        { name: 'welfaretypeid', type: sql.Int(), value: req.welfaretypeid },
        {
          name: 'sbc_hotelProvince',
          type: sql.NVarChar(100),
          value: req.sbc_hotelProvince,
        },
      ],
    );
  }

  async running_number(type: string) {
    return this.dbManager.executeStoredProcedure(
      `${databaseConfig.database}.dbo.RunningNo`,
      [
        { name: 'code', type: sql.NVarChar(50), value: type },
        { name: 'date', type: sql.DateTime(), value: new Date() },
        { name: 'docno', type: sql.VarChar(100), value: '' },
      ],
    );
  }
}
