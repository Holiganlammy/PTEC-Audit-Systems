import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface FileAccessPayload {
  jobId: number;
  purpose: 'file_access';
}

@Injectable()
export class FileAccessService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * สร้าง JWT Token สำหรับ File Access
   */
  generateFileAccessToken(jobId: number): string {
    const payload: FileAccessPayload = {
      jobId,
      purpose: 'file_access',
    };

    return this.jwtService.sign(payload as unknown as Record<string, unknown>, {
      secret: process.env.FILE_ACCESS_SECRET,
      expiresIn: 48 * 60 * 60,
    });
  }

  /**
   * Verify JWT Token
   */
  verifyFileAccessToken(token: string): { jobId: number; valid: boolean } {
    try {
      const decoded = this.jwtService.verify<FileAccessPayload>(token, {
        secret: process.env.FILE_ACCESS_SECRET,
      });

      if (decoded.purpose !== 'file_access') {
        return { jobId: 0, valid: false };
      }

      return { jobId: decoded.jobId, valid: true };
    } catch (error) {
      console.error(
        'File access token verification failed:',
        error instanceof Error ? error.message : error,
      );
      return { jobId: 0, valid: false };
    }
  }

  /**
   * สร้าง URL พร้อม fileAccess token
   */
  buildJobUrlWithFileAccess(
    baseUrl: string,
    jobNo: string,
    jobId: number,
  ): string {
    const token = this.generateFileAccessToken(jobId);
    return `${baseUrl}/audit/edit_document?jobNo=${jobNo}&fileAccess=${token}`;
  }
}
