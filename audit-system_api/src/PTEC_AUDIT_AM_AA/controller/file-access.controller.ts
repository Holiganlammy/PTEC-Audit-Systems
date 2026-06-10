import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { FileAccessService } from '../service/file-access.service';

class VerifyFileAccessDto {
  token!: string;
  jobNo!: string;
}

@Controller('am-jobs')
export class FileAccessController {
  constructor(private readonly fileAccessService: FileAccessService) {}

  /**
   * POST /am-jobs/verify-file-access
   */
  @Post('verify-file-access')
  @HttpCode(HttpStatus.OK)
  verifyFileAccess(@Body() body: VerifyFileAccessDto) {
    if (!body.token) {
      return {
        success: false,
        canViewFiles: false,
        message: 'Token is required',
      };
    }

    const result = this.fileAccessService.verifyFileAccessToken(body.token);

    if (!result.valid) {
      return {
        success: false,
        canViewFiles: false,
        message: 'Invalid or expired file access token',
      };
    }

    return {
      success: true,
      canViewFiles: true,
      jobId: result.jobId,
      message: 'File access granted',
    };
  }
}
