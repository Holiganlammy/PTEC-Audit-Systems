// lib/axios/types.ts

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginResponse {
  success: boolean;
  access_token?: string;
  user?: object;
  request_Mfa?: boolean;
  userCode?: string;
  message?: string;
  expiresAt?: number;
}

export interface VerifyOtpResponse {
  success: boolean;
  access_token?: string;
  user?: object;
  message?: string;
  error?: string;
}