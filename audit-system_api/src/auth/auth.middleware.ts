// src/auth/auth.middleware.ts
// Version: 2.0.0 | Date: 2025-05-20 | Updated: Added auth_sessions DB check for Microsoft SSO + Portal fallback

import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { AuthSession } from '../PTEC_USERIGHT/domain/model/auth-session.entity';
import { authValidationResponse } from '../auth/domain/auth-middleware.interface';

declare module 'express-serve-static-core' {
  interface Request {
    user?: string;
    token?: string;
    userId?: number;
  }
}

const PUBLIC_ROUTES: { path: string; method: string }[] = [
  { path: '/api/login', method: 'POST' },
  { path: '/api/verify-otp', method: 'POST' },
  { path: '/api/resend-otp', method: 'POST' },
  { path: '/api/send-otp', method: 'POST' },
  { path: '/api/reset-password', method: 'POST' },
  { path: '/api/forget-password', method: 'POST' },
  { path: '/api/validate-reset-token', method: 'POST' },
  { path: '/api/user/change-password', method: 'POST' },
  { path: '/api/microsoft-session/save', method: 'POST' },
  { path: '/api/microsoft-session/token', method: 'GET' },
  { path: '/api/microsoft-session/validate', method: 'POST' },
  { path: '/api/microsoft-session/check', method: 'GET' },
];

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(AuthSession, 'auth')
    private readonly sessionRepo: Repository<AuthSession>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const method = req.method;
    const path = req.originalUrl.split('?')[0];

    // PUBLIC route → ผ่านเลย
    const isPublic = PUBLIC_ROUTES.some(
      (route) => route.path === path && route.method === method,
    );

    if (isPublic) {
      return next();
    }

    // PROTECTED route → ต้องมี token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required. Token not found or provided.',
        noToken: true,
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.split(' ')[1];

    // ══════════════════════════════════════════════════════════════════
    // Step 1: เช็คใน auth_sessions table ก่อน (Microsoft SSO + Local)
    // ══════════════════════════════════════════════════════════════════
    try {
      const session = await this.sessionRepo.findOne({
        where: {
          accessToken: token,
          isRevoked: false,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (session) {
        // พบ session + ยังไม่หมดอายุ + ไม่ถูก revoke
        const userData = JSON.parse(session.userData) as {
          userCode?: string;
          username?: string;
        };

        req.user = userData.userCode || userData.username || session.userCode;
        req.userId = session.userId;
        req.token = token;

        // อัพเดท lastAccessAt
        session.lastAccessAt = new Date();
        this.sessionRepo.save(session).catch((err) => {
          console.error('Failed to update lastAccessAt:', err);
        });

        return next();
      }
    } catch (error) {
      console.error('DB session check error:', error);
      // ไม่ return error → fallthrough ไปเช็ค Portal
    }

    // ══════════════════════════════════════════════════════════════════
    // Step 2: Fallback → validate กับ Portal (Local login token)
    // ══════════════════════════════════════════════════════════════════
    try {
      const response = await axios.post(
        `${process.env.PORTAL_API_URL}/validate`,
        { access_token: token },
        { timeout: 5000 },
      );

      const validationData = response.data as authValidationResponse;

      if (validationData?.valid === true) {
        req.user = validationData.user?.userCode as string;
        req.token = token;
        return next();
      }

      return res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid token.',
        tokenInvalid: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return res.status(401).json({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Token has expired. Please login again.',
          tokenExpired: true,
          timestamp: new Date().toISOString(),
        });
      }

      console.error(`❌ Portal validation error: ${error}`);
      return res.status(503).json({
        success: false,
        message: 'Auth service unavailable',
        error: 'SERVICE_UNAVAILABLE',
      });
    }
  }
}
