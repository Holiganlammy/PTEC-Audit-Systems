// src/modules/app/services/auth-session.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthSession } from '../domain/model/auth-session.entity';
import { User } from '../dto/interface/ptec_useright.interface';

// interface User {
//   UserID: number;
//   UserCode: string;
//   Email: string;
//   role_id: number;
//   fristName: string;
//   lastName: string;
//   img_profile: string;
//   branchid: number;
//   depid: number;
// }

interface SessionData {
  userId: number;
  userCode: string;
  username: string;
  role: number;
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
export class AuthSessionService {
  private readonly logger = new Logger(AuthSessionService.name);

  constructor(
    @InjectRepository(AuthSession, 'auth')
    private readonly sessionRepo: Repository<AuthSession>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Create session and save token
   */
  async createSession(
    user: User,
    source: string,
    deviceInfo: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<string> {
    try {
      // Generate JWT token
      const payload = {
        sub: user.UserCode,
        userId: user.UserID,
        username: user.UserCode,
        role: user.role_id,
        email: user.Email,
        source,
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: '4h',
      });

      // Prepare session data
      const sessionData: SessionData = {
        userId: user.UserID,
        userCode: user.UserCode,
        username: user.UserCode,
        role: user.role_id,
        email: user.Email,
        fristName: user.fristName,
        lastName: user.lastName,
        img_profile: user.img_profile,
        branchid: user.BranchID,
        depid: user.DepID,
        source,
        loginAt: new Date().toISOString(),
      };

      // Calculate expiry
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 4);

      // Save to database
      const session = this.sessionRepo.create({
        accessToken,
        userId: user.UserID,
        userCode: user.UserCode,
        userData: JSON.stringify(sessionData),
        source,
        expiresAt,
        deviceInfo,
        ipAddress,
        userAgent,
      });

      await this.sessionRepo.save(session);

      this.logger.log(
        `Session created for user: ${user.UserCode}, source: ${source}`,
      );

      return accessToken;
    } catch (error) {
      this.logger.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Validate session by token
   */
  async validateSession(accessToken: string): Promise<SessionData | null> {
    try {
      // Verify JWT signature
      this.jwtService.verify(accessToken);

      // Find session in database
      const session = await this.sessionRepo.findOne({
        where: {
          accessToken,
          isRevoked: false,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (!session) {
        this.logger.warn('Session not found or expired');
        return null;
      }

      // Update last access time
      session.lastAccessAt = new Date();
      await this.sessionRepo.save(session);

      return JSON.parse(session.userData) as SessionData;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Invalid token: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Revoke session
   */
  async revokeSession(accessToken: string): Promise<void> {
    try {
      await this.sessionRepo.update({ accessToken }, { isRevoked: true });
      this.logger.log(`Session revoked`);
    } catch (error) {
      this.logger.error('Error revoking session:', error);
      throw error;
    }
  }

  /**
   * Revoke all user sessions
   */
  async revokeAllUserSessions(
    userCode: string,
    source?: string,
  ): Promise<void> {
    try {
      const query = this.sessionRepo
        .createQueryBuilder()
        .update(AuthSession)
        .set({ isRevoked: true })
        .where('userCode = :userCode', { userCode })
        .andWhere('isRevoked = :isRevoked', { isRevoked: false });

      if (source) {
        query.andWhere('source = :source', { source });
      }

      await query.execute();
      this.logger.log(`All sessions revoked for user: ${userCode}`);
    } catch (error) {
      this.logger.error('Error revoking all sessions:', error);
      throw error;
    }
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(userCode: string): Promise<Partial<AuthSession>[]> {
    try {
      return await this.sessionRepo.find({
        where: {
          userCode,
          isRevoked: false,
          expiresAt: MoreThan(new Date()),
        },
        select: [
          'sessionId',
          'accessToken',
          'source',
          'deviceInfo',
          'ipAddress',
          'userAgent',
          'createdAt',
          'lastAccessAt',
          'expiresAt',
        ],
        order: {
          lastAccessAt: 'DESC',
        },
      });
    } catch (error) {
      this.logger.error('Error getting active sessions:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired sessions (for cron job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      // Revoke expired sessions older than 7 days
      const expiredResult = await this.sessionRepo
        .createQueryBuilder()
        .update(AuthSession)
        .set({ isRevoked: true })
        .where('expiresAt < :date', { date: sevenDaysAgo })
        .andWhere('isRevoked = :isRevoked', { isRevoked: false })
        .execute();

      // Revoke sessions older than 1 day
      const revokedResult = await this.sessionRepo
        .createQueryBuilder()
        .update(AuthSession)
        .set({ isRevoked: true })
        .where('isRevoked = :isRevoked', { isRevoked: false })
        .andWhere('createdAt < :date', { date: oneDayAgo })
        .execute();

      const totalRevoked =
        (expiredResult.affected || 0) + (revokedResult.affected || 0);
      this.logger.log(`Revoked ${totalRevoked} expired sessions`);
      return totalRevoked;
    } catch (error) {
      this.logger.error('Error cleaning up sessions:', error);
      throw error;
    }
  }
}
