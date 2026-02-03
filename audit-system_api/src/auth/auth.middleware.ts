// src/auth/auth.middleware.ts
import { Body, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { authValidationResponse } from '../auth/domain/auth-middleware.interface';

// Extend Express Request type
declare module 'express-serve-static-core' {
  interface Request {
    user?: string;
    token?: string;
  }
}

// Routes ที่ ไม่ต้องมี token
const PUBLIC_ROUTES: { path: string; method: string }[] = [
  { path: '/api/login', method: 'POST' },
  { path: '/api/verify-otp', method: 'POST' },
  { path: '/api/resend-otp', method: 'POST' },
  { path: '/api/send-otp', method: 'POST' },
  { path: '/api/reset-password', method: 'POST' },
  { path: '/api/validate-reset-token', method: 'POST' },
];

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const method = req.method;
    const path = req.originalUrl.split('?')[0]; // ใช้ originalUrl และตัด query string

    // PUBLIC route → ผ่านเลย ไม่ต้อง token
    const isPublic = PUBLIC_ROUTES.some(
      (route) => route.path === path && route.method === method,
    );

    if (isPublic) {
      console.log(`🔓 Public: ${method} ${path}`);
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

    try {
      // Validate กับ Portal
      const response = await axios.post(
        `${process.env.PORTAL_API_URL}/validate`,
        {
          access_token: token,
        },
        {
          timeout: 5000,
        },
      );
      //   console.log(response);
      const validationData = response.data as authValidationResponse;
      if (validationData?.valid === true) {
        req.user = validationData.user?.userCode as string;
        req.token = token;
        return next();
      }

      return res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid token format.',
        tokenInvalid: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return res.status(401).json({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Token has expired. and Token  Please login again.',
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
