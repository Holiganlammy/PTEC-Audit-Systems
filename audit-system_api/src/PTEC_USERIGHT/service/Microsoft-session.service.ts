// src/services/microsoft-session.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthSession } from '../domain/model/auth-session.entity'; // ใช้ entity เดิม
import { AppService } from './ptec_useright.service';
import { AuditUserRolesService } from './audit-user-roles.service';
import axios from 'axios';

interface SessionData {
  userId: number;
  userCode: string;
  username: string;
  role: number;
  role_name: string;
  email: string;
  fristName: string;
  lastName: string;
  img_profile: string;
  branchid: number;
  depid: number;
  source: string;
  loginAt: string;
}

@Injectable()
export class MicrosoftSessionService {
  constructor(
    @InjectRepository(AuthSession, 'auth')
    private sessionRepo: Repository<AuthSession>,
    private appService: AppService,
    private auditUserRolesService: AuditUserRolesService,
  ) {}
  async saveSession(data: {
    sessionId: string;
    sessionToken: string;
    microsoftToken: string;
    email: string;
    name: string;
    source: string;
    ipAddress?: string;
  }): Promise<{
    success: boolean;
    sessionId: number;
    userData: string;
  }> {
    try {
      const {
        sessionToken,
        microsoftToken,
        email,
        source,
        ipAddress = 'unknown',
      } = data;

      // Validate token กับ Microsoft ก่อน
      const isValid = await this.validateMicrosoftToken(microsoftToken);

      if (!isValid) {
        console.error('[Microsoft Session] ❌ Invalid token');
        throw new Error('Invalid Microsoft token');
      }

      console.log('[Microsoft Session]  Token valid, saving session...');

      // ดึงข้อมูล user จาก database
      const users = await this.appService.getUsersFromProcedure(
        null,
        null,
        email,
      );

      if (!users || users.length === 0) {
        throw new Error('User not found in database');
      }

      const user = users[0];

      // ดึง role จาก Audit_User_Roles แทน PTEC_Userright
      const auditRole = await this.auditUserRolesService.getRoleByUserCode(
        user.UserCode,
      );
      const roleId = auditRole?.roleId ?? user.role_id;
      const roleName = auditRole?.roleName ?? '';

      // กำหนดเวลาหมดอายุ (4 ชั่วโมง)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 4);

      const sessionData: SessionData = {
        userId: user.UserID,
        userCode: user.UserCode,
        username: user.UserCode,
        role: roleId,
        role_name: roleName,
        email: user.Email,
        fristName: user.fristName,
        lastName: user.lastName,
        img_profile: user.img_profile,
        branchid: user.BranchID,
        depid: user.DepID,
        source,
        loginAt: new Date().toISOString(),
      };

      // // ลบเฉพาะ sessions ที่ยัง active อยู่ (ไม่ลบตัวที่ถูก revoke)
      const existingSessions = await this.sessionRepo.find({
        where: {
          userId: user.UserID,
          source,
          isRevoked: false, // ลบเฉพาะที่ยัง active
        },
      });

      if (existingSessions.length > 0) {
        await this.sessionRepo.update(
          { userId: user.UserID, source, isRevoked: false },
          { isRevoked: true },
        );
        console.log(
          '[Microsoft Session] Removed old active sessions:',
          existingSessions.length,
        );
      }

      // สร้าง session ใหม่ โดยใช้ sessionToken (UUID) แทน Microsoft token เพื่อหลีกเลี่ยง cookie too large
      const session = this.sessionRepo.create({
        accessToken: sessionToken,
        userId: user.UserID,
        userCode: user.UserCode,
        userData: JSON.stringify(sessionData),
        source,
        expiresAt,
        deviceInfo: 'Microsoft SSO',
        ipAddress,
        userAgent: 'Microsoft SSO',
        isRevoked: false,
      });

      const savedSession = await this.sessionRepo.save(session);

      console.log(
        '[Microsoft Session] Session saved, ID:',
        savedSession.sessionId,
      );

      return {
        success: true,
        sessionId: savedSession.sessionId,
        userData: JSON.stringify(sessionData),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('[Microsoft Session] ❌ Save error:', errorMessage);
      throw new Error(errorMessage);
    }
  }
  async getTokenBySessionId(sessionId: string): Promise<string | null> {
    try {
      const session = await this.sessionRepo.findOne({
        where: { sessionId: Number(sessionId) },
      });

      if (!session) {
        console.log('[Microsoft Session] ❌ Session not found:', sessionId);
        return null;
      }

      // เช็คว่าหมดอายุหรือยัง
      const now = new Date();
      if (now > session.expiresAt) {
        console.log('[Microsoft Session] ⏰ Session expired');
        await this.sessionRepo.delete({ sessionId: Number(sessionId) }); // ลบ session ที่หมดอายุ
        return null;
      }

      return session.accessToken;
    } catch (error) {
      console.error(
        '[Microsoft Session] ❌ Get token error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return null;
    }
  }
  /**
   * Validate Microsoft token และบันทึก session
   */
  async validateAndCreateSession(
    microsoftToken: string,
    source: string = 'AuditSystem',
  ): Promise<{
    valid: boolean;
    userEmail?: string;
    userName?: string;
    sessionId?: string;
  }> {
    try {
      // 1. Validate token กับ Microsoft Graph API
      const userInfo = await this.getMicrosoftUserInfo(microsoftToken);

      if (!userInfo) {
        return { valid: false };
      }

      const email = userInfo.mail || userInfo.userPrincipalName;
      const name = userInfo.displayName;

      console.log('[Microsoft Session]  Token valid:', email);

      // 2. ดึงข้อมูล user จาก database
      const users = await this.appService.getUsersFromProcedure(
        null,
        null,
        email,
      );

      if (!users || users.length === 0) {
        console.error('[Microsoft Session] ❌ User not found in database');
        return { valid: false };
      }

      const user = users[0];

      // ดึง role จาก Audit_User_Roles แทน PTEC_Userright
      const auditRole2 = await this.auditUserRolesService.getRoleByUserCode(
        user.UserCode,
      );
      const roleId2 = auditRole2?.roleId ?? user.role_id;

      // 3. บันทึก session ลง database
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 4); // 4 ชั่วโมง

      const sessionData: SessionData = {
        userId: user.UserID,
        userCode: user.UserCode,
        username: user.UserCode,
        role: roleId2,
        role_name: auditRole2?.roleName ?? '',
        email: user.Email,
        fristName: user.fristName,
        lastName: user.lastName,
        img_profile: user.img_profile,
        branchid: user.BranchID,
        depid: user.DepID,
        source,
        loginAt: new Date().toISOString(),
      };

      const session = this.sessionRepo.create({
        accessToken: microsoftToken,
        userId: user.UserID,
        userCode: user.UserCode,
        userData: JSON.stringify(sessionData),
        source,
        expiresAt,
        createdAt: new Date(),
        deviceInfo: 'Microsoft SSO',
        ipAddress: 'N/A',
        userAgent: 'Microsoft SSO',
      });

      const savedSession = await this.sessionRepo.save(session);

      return {
        valid: true,
        userEmail: email,
        userName: name,
        sessionId: String(savedSession.sessionId),
      };
    } catch (error) {
      console.error(
        '[Microsoft Session] ❌ Validation failed:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return { valid: false };
    }
  }

  /**
   * ดึงข้อมูล user จาก Microsoft Graph API
   */
  private async getMicrosoftUserInfo(token: string): Promise<{
    id: string;
    mail?: string;
    userPrincipalName?: string;
    displayName?: string;
  } | null> {
    try {
      const response = await axios.get<{
        id: string;
        mail?: string;
        userPrincipalName?: string;
        displayName?: string;
      }>('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.error('[Microsoft Session] Token expired or invalid');
      }
      return null;
    }
  }

  /**
   * เช็คว่า session ยังใช้งานได้ไหม (เช็คเวลาที่เรากำหนด)
   */
  async validateMicrosoftToken(token: string): Promise<boolean> {
    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });

      return response.status === 200;
    } catch {
      return false;
    }
  }
  async validateSession(accept_token: string): Promise<{
    valid: boolean;
    reason?: string;
    expired?: boolean;
    revoked?: boolean;
  }> {
    const session = await this.sessionRepo.findOne({
      where: { accessToken: accept_token },
    });

    if (!session) {
      return {
        valid: false,
        reason: 'Session not found',
      };
    }

    // เช็คว่าถูก revoke หรือยัง
    if (session.isRevoked) {
      return {
        valid: false,
        reason: 'Session has been revoked',
        revoked: true,
      };
    }

    // เช็คว่าหมดเวลาหรือยัง
    const now = new Date();
    if (now > session.expiresAt) {
      console.log('[Microsoft Session] ⏰ Session expired');
      return {
        valid: false,
        reason: 'Session has expired',
        expired: true,
      };
    }

    return {
      valid: true,
    };
  }

  /**
   * Logout - ลบ session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepo.update(
      { sessionId: Number(sessionId) },
      { isRevoked: true },
    );
    console.log('[Microsoft Session] 🚪 Session revoked:', sessionId);
  }

  async getUserInfo(token: string): Promise<{
    email: string;
    name: string;
    microsoftId: string;
  } | null> {
    try {
      const response = await axios.get<{
        id: string;
        mail?: string;
        userPrincipalName?: string;
        displayName?: string;
      }>('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });

      return {
        email: response.data.mail || response.data.userPrincipalName || '',
        name: response.data.displayName || '',
        microsoftId: response.data.id,
      };
    } catch (error) {
      console.error(
        '[Microsoft Session] ❌ Get user info error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return null;
    }
  }
}
