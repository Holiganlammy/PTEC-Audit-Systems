// lib/api/password-reset.ts
import client from "@/lib/axios/interceptors";

/**
 * Password Reset API Client
 *
 * Backend Endpoints ที่มีอยู่:
 * - POST /forgot-password      → ส่ง Email พร้อม Reset Link
 * - POST /validate-reset-token  → ตรวจสอบ Token
 * - POST /reset-password        → อัพเดทรหัสผ่านใหม่
 */
export const passwordResetApi = {
  /**
   * ขอรีเซ็ตรหัสผ่าน (ส่ง Email)
   * POST /forget-password
   * Body: { Email: string }
   */
  async requestReset(
    email: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await client.post("/forget-password", {
      Email: email,
    });
    return response.data;
  },

  /**
   * ตรวจสอบ Reset Token
   * POST /validate-reset-token
   * Body: { token: string }
   */
  async validateToken(
    token: string
  ): Promise<{
    success: boolean;
    message: string;
    UserID?: number;
  }> {
    const response = await client.post("/validate-reset-token", {
      token,
    });
    return response.data;
  },

  /**
   * รีเซ็ตรหัสผ่านด้วย Token
   * POST /reset-password
   * Body: { token: string, newPassword: string }
   */
  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await client.post("/reset-password", {
      token,
      newPassword,
      confirmPassword,
    });
    return response.data;
  },
};