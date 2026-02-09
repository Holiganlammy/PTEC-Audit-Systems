import {
  Get,
  Post,
  Res,
  Controller,
  Body,
  Query,
  Inject,
  // HttpException,
  HttpStatus,
  Put,
  Param,
  Req,
  // Req,
} from '@nestjs/common';
import express from 'express';
import { AppService } from '../service/ptec_useright.service';
import {
  ChangPasswordDto,
  CheckUserPermissionDto,
  GetUserWithRolesDto,
  LoginDto,
  // LoginDto,
  resetPasswordDTO,
  VerifyOtpDto,
  // VerifyOtpDto,
} from '../dto/Login.dto';
import { EditUserDto } from '../dto/EditUser.dto';
import axios, { AxiosError, AxiosResponse } from 'axios';
import {
  // User,
  PortalLoginResponse,
  PortalLoginRequest,
  PortalVerifyOtpResponse,
  PortalResendOtpResponse,
} from '../domain/model/ptec_useright.entity';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import { Department } from '../domain/model/ptec_useright.entity';
import { Section } from '../domain/model/ptec_useright.entity';
import { Position } from '../domain/model/ptec_useright.entity';

@Controller('')
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('REDIS') private readonly redis: Redis,
  ) {}

  @Get('/users')
  async getUser(
    @Req() req: express.Request,
    @Query('usercode') usercode?: string | null,
    @Query('UserID') UserID?: string | null,
  ) {
    // const currentUser = (req as any).user;
    // console.log('👤 Requested by:', currentUser?.UserCode);
    const users = await this.appService.getUsersFromProcedure(
      usercode ? usercode : null,
      UserID ? Number(UserID) : null,
    );
    const filterOutUsers = users.map(({ ...user }) => user);
    return filterOutUsers;
  }

  @Post('login')
  async login(
    @Body() LoginDto: LoginDto,
    @Res() res: express.Response,
  ): Promise<express.Response> {
    try {
      const response: AxiosResponse<PortalLoginResponse> =
        await axios.post<PortalLoginResponse>(
          `${process.env.PORTAL_API_URL}/login`,
          {
            loginname: LoginDto.loginname,
            password: LoginDto.password,
            source: 'audit',
          } satisfies PortalLoginRequest,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
          },
        );

      // ✅ Destructure with proper typing
      const data: PortalLoginResponse = response.data;
      const {
        success,
        access_token,
        user,
        message,
        request_Mfa,
        userCode,
        expiresAt,
      } = data;

      // Handle OTP case
      if (request_Mfa === true) {
        return res.status(HttpStatus.OK).json({
          success: true,
          request_Mfa: true,
          userCode: userCode ?? '',
          message: message ?? 'OTP sent to your email',
          expiresAt: expiresAt ?? 0,
        });
      }

      // Handle success login
      if (success === true && access_token) {
        return res.status(HttpStatus.OK).json({
          success: true,
          access_token,
          user: user ?? null,
          message: message ?? 'Login successful',
        });
      }

      // Handle failure
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: message ?? 'Login failed',
      });
    } catch (error: unknown) {
      console.error('Login error:', error);

      // ✅ Type guard for AxiosError
      if (error && typeof error === 'object' && 'isAxiosError' in error) {
        const axiosError = error as AxiosError<PortalLoginResponse>;

        if (axiosError.response) {
          const status: number = axiosError.response.status;
          const errorMessage: string =
            axiosError.response.data?.message ?? 'Login failed';

          return res.status(status).json({
            success: false,
            message: errorMessage,
          });
        }

        // Network error
        if (axiosError.code === 'ECONNREFUSED') {
          return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
            success: false,
            message: 'Authentication service is unavailable',
          });
        }

        // Timeout
        if (axiosError.code === 'ECONNABORTED') {
          return res.status(HttpStatus.REQUEST_TIMEOUT).json({
            success: false,
            message: 'Request timeout',
          });
        }
      }

      // Unknown error
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Login failed',
      });
    }
  }

  @Post('resend-otp')
  async resendOtp(
    @Body() body: { usercode: string },
    @Res() res: express.Response,
  ): Promise<express.Response> {
    try {
      const { usercode } = body;

      // Validate input
      if (!usercode) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'UserCode is required',
        });
      }

      console.log('🔄 Resending OTP for user:', usercode);

      // Forward to Portal Backend
      const response: AxiosResponse<PortalResendOtpResponse> =
        await axios.post<PortalResendOtpResponse>(
          `${process.env.PORTAL_API_URL}/resend-otp`,
          {
            usercode: usercode.toUpperCase(),
            source: 'audit', // บอก Portal ว่ามาจาก audit
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
          },
        );

      const data = response.data;

      // Success
      if (data.success) {
        console.log('✅ OTP resent successfully for user:', usercode);
        return res.status(HttpStatus.OK).json({
          success: true,
          message: data.message ?? 'OTP resent successfully',
          expiresAt: data.expiresAt ?? Date.now() + 300000, // 5 minutes
        });
      }

      //  Failed
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: data.message ?? 'Failed to resend OTP',
      });
    } catch (error: unknown) {
      console.error('❌ Resend OTP error:', error);

      // Handle network errors
      if (error && typeof error === 'object' && 'code' in error) {
        const err = error as { code?: string };

        if (err.code === 'ECONNREFUSED') {
          return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
            success: false,
            message: 'Authentication service is unavailable',
          });
        }

        if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
          return res.status(HttpStatus.REQUEST_TIMEOUT).json({
            success: false,
            message: 'Request timeout',
          });
        }
      }

      // Handle Axios errors
      if (error && typeof error === 'object' && 'isAxiosError' in error) {
        const axiosError = error as AxiosError<PortalResendOtpResponse>;

        if (axiosError.response) {
          return res.status(axiosError.response.status).json({
            success: false,
            message:
              axiosError.response.data?.message ?? 'Failed to resend OTP',
          });
        }
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to resend OTP',
      });
    }
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() body: VerifyOtpDto,
    @Res() res: express.Response,
  ): Promise<express.Response> {
    try {
      const { usercode, otpCode, trustDevice } = body;

      // Validate input
      if (!usercode || !otpCode) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'UserCode and OTP are required',
        });
      }

      // ✅ Forward to Portal Backend
      const response: AxiosResponse<PortalLoginResponse> =
        await axios.post<PortalLoginResponse>(
          `${process.env.PORTAL_API_URL}/verify-otp`,
          {
            usercode: usercode.toUpperCase(),
            otpCode,
            trustDevice: trustDevice ?? false,
            source: 'audit',
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
          },
        );

      const data = response.data;

      // ✅ Success - OTP ถูกต้อง
      if (data.success && data.access_token) {
        console.log('✅ OTP verified successfully for user:', usercode);
        return res.status(HttpStatus.OK).json({
          success: true,
          access_token: data.access_token,
          user: data.user,
          message: data.message ?? 'OTP verified successfully',
        });
      }

      // ✅ OTP ผิด
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        // error: data.error ?? 'OTP_INVALID',
        message: data.message ?? 'Invalid or expired OTP',
      });
    } catch (error: unknown) {
      console.error('❌ Verify OTP error:', error);

      // Handle network errors
      if (error && typeof error === 'object' && 'code' in error) {
        const err = error as { code?: string };

        if (err.code === 'ECONNREFUSED') {
          return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
            success: false,
            message: 'Authentication service is unavailable',
          });
        }

        if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
          return res.status(HttpStatus.REQUEST_TIMEOUT).json({
            success: false,
            message: 'Request timeout',
          });
        }
      }

      // Handle Axios errors
      if (error && typeof error === 'object' && 'isAxiosError' in error) {
        const axiosError = error as AxiosError<PortalVerifyOtpResponse>;

        if (axiosError.response) {
          return res.status(axiosError.response.status).json({
            success: false,
            message:
              axiosError.response.data?.message ?? 'OTP verification failed',
            error: axiosError.response.data?.error ?? 'VERIFICATION_ERROR',
          });
        }
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'OTP verification failed',
      });
    }
  }

  @Put('/user/:id')
  async getUserById(
    @Param('id') id: string,
    @Body() editUserDto: EditUserDto,
    @Res() res: express.Response,
  ) {
    try {
      const user = await this.appService.editUser(id, editUserDto);
      if (user) {
        res.status(200).send({
          success: true,
          user,
        });
      } else {
        res.status(404).send({
          success: false,
          message: 'User not found',
        });
      }
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      res.status(500).send({
        success: false,
        message: 'Error fetching user by ID',
      });
    }
  }

  @Post('/user/change-password')
  async changePassword(
    @Body() req: ChangPasswordDto,
    @Res() res: express.Response,
  ) {
    try {
      const result = await this.appService.changePassword(req);
      if (result) {
        res.status(200).send({
          success: true,
          message: 'Password changed successfully',
        });
      } else {
        res.status(404).send({
          success: false,
          message: 'User not found',
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).send({
        success: false,
        message: 'Error changing password',
      });
    }
  }

  @Put('/user/activate/:UserID')
  async activateUser(
    @Param('UserID') UserID: string,
    @Body('actived') actived: string,
    @Res() res: express.Response,
  ) {
    try {
      await this.appService.changeStatus(UserID, actived);
      res.status(200).send({
        success: true,
        message: 'User status updated successfully',
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).send({
        success: false,
        message: 'Error updating user status',
      });
    }
  }

  // @Public()
  // @Post('/forget-password')
  // async forgetPassword(
  //   @Body('Email') Email: string,
  //   @Req() req: express.Request,
  //   @Res() res: express.Response,
  // ) {
  //   try {
  //     const token = crypto.randomBytes(32).toString('hex');
  //     const tokenHash = crypto.createHash('sha256').update(token).digest();
  //     const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  //     const ip = this.getClientIp(req);
  //     const userAgent = req.headers['user-agent'] || 'unknown';
  //     const baseUrl = process.env.APP_URL;
  //     const resetLink = `${baseUrl}/reset-password?token=${token}`;
  //     const result = await this.appService.forgetPassword({
  //       email: Email,
  //       token_hash: tokenHash,
  //       expires_at: expiresAt,
  //       ip_address: ip,
  //       user_agent: userAgent,
  //     });

  //     if (result) {
  //       const { result: spResult, message, user_id, fullname } = result;

  //       if (spResult === 1 && user_id) {
  //         try {
  //           await sendResetPasswordWithGmailAPI(Email, fullname, resetLink);
  //         } catch (mailError) {
  //           console.error('❌ Failed to send email:', mailError);
  //         }
  //         res.status(200).send({
  //           success: true,
  //           message: 'Password reset email sent successfully',
  //         });
  //       } else {
  //         res.status(400).send({
  //           success: false,
  //           message: message || 'User not found',
  //         });
  //       }
  //     } else {
  //       res.status(500).send({
  //         success: false,
  //         message: 'Database error',
  //       });
  //     }
  //   } catch (error) {
  //     console.error('Error sending forgot password email:', error);
  //     res.status(500).send({
  //       success: false,
  //       message: 'Error sending forgot password email',
  //     });
  //   }
  // }

  // @Public()
  @Post('/validate-reset-token')
  async validateResetToken(
    @Body('token') token: string,
    @Res() res: express.Response,
  ) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest();
      const isValid = await this.appService.validateResetToken(tokenHash);
      if (isValid.isValid === true) {
        return res.status(200).send({
          success: true,
          message: 'Validate token successfully',
          UserID: isValid.UserID,
        });
      } else {
        return res.status(400).send({
          success: false,
          message: 'Invalid or expired token',
        });
      }
    } catch (err) {
      console.error('Token validation error:', err);
      return res.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  // @Public()
  @Post('/reset-password')
  async resetPassword(
    @Body() req: resetPasswordDTO,
    @Res() res: express.Response,
  ) {
    try {
      if (req.newPassword !== req.confirmPassword) {
        return res.status(400).send({
          success: false,
          message: 'New password and confirm password do not match',
        });
      }
      const tokenHash = crypto.createHash('sha256').update(req.token).digest();
      const isValid = await this.appService.validateResetToken(tokenHash);
      if (isValid.isValid === true) {
        const users = await this.appService.getUsersFromProcedure(
          null,
          isValid.UserID,
        );
        const user = users && users.length > 0 ? users[0] : null;
        if (!user) {
          return res.status(404).send({
            success: false,
            message: 'User not found',
          });
        }
        const resetResult = await this.appService.resetPassword({
          UserID: isValid.UserID ? isValid.UserID : 0,
          userCode: user.UserCode,
          newPassword: req.newPassword,
          tokenHash: tokenHash,
          token: '',
          confirmPassword: '',
        });

        if (resetResult?.samePassword === 1) {
          return res.status(400).send({
            success: false,
            samePassword: true,
            message:
              'รหัสผ่านใหม่และรหัสผ่านเก่าไม่สามารถตรงกันได้ กรุณาเปลี่ยนรหัสผ่านใหม่',
          });
        }
        return res.status(200).send({
          success: true,
          message: 'Password reset successfully',
        });
      } else {
        return res.status(400).send({
          success: false,
          message: 'Invalid or expired token',
        });
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      return res.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  @Get('/CheckUserPermission')
  async CheckUserPermission(
    @Query() req: CheckUserPermissionDto,
    @Res() res: express.Response,
  ) {
    try {
      const result = await this.appService.CheckUserPermission(req);
      res.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching users with roles:', error);
      res.status(500).send({
        success: false,
        message: 'Error fetching users with roles',
      });
    }
  }

  @Get('/GetUserWithRoles')
  async getUserWithRoles(
    @Query() req: GetUserWithRolesDto,
    @Res() res: express.Response,
  ) {
    try {
      const result = await this.appService.getUserWithRoles(req);
      res.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching users with roles:', error);
      res.status(500).send({
        success: false,
        message: 'Error fetching users with roles',
      });
    }
  }
  @Get('/branch')
  async getBranch(@Res() res: express.Response) {
    try {
      const branches = await this.appService.getBranch();
      res.status(200).send({
        success: true,
        data: branches,
      });
    } catch (error) {
      console.error('Error fetching branches:', error);
      res.status(500).send({
        success: false,
        message: 'Error fetching branches',
      });
    }
  }

  @Get('/department')
  async getDepartment(@Res() res: express.Response) {
    try {
      const departments = await this.appService.getDepartment();
      const filterDepartments = departments.filter(
        (dept: Department) => dept.branchid !== 0,
      );
      res.status(200).send({
        success: true,
        data: filterDepartments,
      });
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).send({
        success: false,
        message: 'Error fetching departments',
      });
    }
  }

  @Get('/section')
  async getSection(@Res() res: express.Response) {
    try {
      const sections = await this.appService.getSection();
      const filterSections = sections.filter((sec: Section) => sec.secid !== 0);
      res.status(200).send({
        success: true,
        data: filterSections,
      });
    } catch (error) {
      console.error('Error fetching sections:', error);
      res.status(500).send({
        success: false,
        message: 'Error fetching sections',
      });
    }
  }

  @Get('/position')
  async getPosition(@Res() res: express.Response) {
    try {
      const positions = await this.appService.getPosition();
      const filterPositions = positions.filter(
        (pos: Position) => pos.positionid !== 0,
      );
      res.status(200).send({
        success: true,
        data: filterPositions,
      });
    } catch (error) {
      console.error('Error fetching positions:', error);
      res.status(500).send({
        success: false,
        message: 'Error fetching positions',
      });
    }
  }
}
