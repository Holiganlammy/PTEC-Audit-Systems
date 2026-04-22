// Version: 2.0.0 | Date: 2025-04-07 17:00:00 | Updated: เพิ่ม Job Header File Upload endpoints

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
  Res,
  Req,
  BadRequestException,
  NotFoundException,
  UseInterceptors,
  UploadedFiles,
  OnModuleInit,
  StreamableFile,
  InternalServerErrorException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, createReadStream } from 'fs';
import express from 'express';
import { AuditJobsService } from '../service/audit-job.service';
import {
  PaginatedResponse,
  UserInfo,
} from '../domain/type/audit-job.interface';
import { CreateAuditJobDto } from '../dto/create-audit-job.dto';
import { UpdateAuditJobDto } from '../dto/update-audit-job.dto';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuditUserRolesService } from '../../PTEC_USERIGHT/service/audit-user-roles.service';
import { AuditFilesService } from '../service/audit-files.service';
import { AuditFileType } from '../domain/enum/audit-file-type.enum';

const BASE_UPLOAD_PATH = 'D:\\files\\Audit_file';
const JOB_HEADER_PATH = join(BASE_UPLOAD_PATH, 'job-header');
const AM_CHECKLIST_PATH = join(BASE_UPLOAD_PATH, 'am-checklist');

@Controller('audit-jobs')
export class AuditJobsController implements OnModuleInit {
  constructor(
    private readonly auditJobsService: AuditJobsService,
    private readonly jwtService: JwtService,
    private readonly auditUserRolesService: AuditUserRolesService,
    private readonly auditFilesService: AuditFilesService,
  ) {}

  onModuleInit() {
    this.ensureUploadDirectories();
  }

  private ensureUploadDirectories() {
    const directories = [BASE_UPLOAD_PATH, JOB_HEADER_PATH, AM_CHECKLIST_PATH];

    directories.forEach((dir) => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      } else {
        console.log(`✓ Directory exists: ${dir}`);
      }
    });
  }

  private extractFileInfo(file: Express.Multer.File) {
    return {
      fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  // ==========================================
  // Job CRUD Endpoints (existing)
  // ==========================================

  @Post('/create')
  async create(
    @Body() createAuditJobDto: CreateAuditJobDto,
    @Res() res: express.Response,
  ) {
    try {
      const auditJob = await this.auditJobsService.create(createAuditJobDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: auditJob,
        message: 'Audit job created successfully',
      });
    } catch (error) {
      console.error('Error creating audit job:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error creating audit job',
      });
    }
  }

  @Get('/list')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('auditorUserId') auditorUserId?: string,
    @Query('active') active?: string,
    @Req() req?: express.Request,
  ): Promise<PaginatedResponse> {
    const params = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status: status ? parseInt(status, 10) : undefined,
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      auditorUserId: auditorUserId ? parseInt(auditorUserId, 10) : undefined,
      active: active ? active === 'true' : undefined,
    };

    const user = req ? await this.getUserFromJWT(req) : undefined;

    if (!user) {
      throw new UnauthorizedException('User information is required');
    }

    return await this.auditJobsService.findAll(params, user);
  }

  @Post('edit')
  async findOneByJobCode(
    @Body('jobcode') jobcode: string,
    @Res() res: express.Response,
  ) {
    try {
      const normalizedJobCode =
        typeof jobcode === 'string' ? jobcode.trim() : '';
      if (!normalizedJobCode) {
        throw new BadRequestException('jobcode is required');
      }

      const auditJob =
        await this.auditJobsService.findByJobNo(normalizedJobCode);

      return res.status(HttpStatus.OK).json({
        code: 200,
        success: true,
        data: auditJob,
        message: 'Success',
      });
    } catch (error) {
      console.error('❌ Error fetching audit job by jobcode:', error);

      if (error instanceof BadRequestException) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          code: 400,
          success: false,
          message: error.message,
        });
      }

      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          code: 404,
          success: false,
          message: error.message,
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        code: 500,
        success: false,
        message: 'Error fetching audit job',
      });
    }
  }

  @Get('detail')
  async findOneByJobCodeQuery(
    @Query('jobNo') jobNo: string,
    @Res() res: express.Response,
  ) {
    try {
      const normalizedJobNo = typeof jobNo === 'string' ? jobNo.trim() : '';
      if (!normalizedJobNo) {
        throw new BadRequestException('jobNo is required');
      }

      const auditJob = await this.auditJobsService.findByJobNo(normalizedJobNo);

      return res.status(HttpStatus.OK).json({
        code: 200,
        success: true,
        data: auditJob,
        message: 'Detail fetched successfully',
      });
    } catch (error) {
      console.error('❌ Error fetching audit job by jobNo:', error);

      if (error instanceof BadRequestException) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          code: 400,
          success: false,
          message: error.message,
        });
      }

      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          code: 404,
          success: false,
          message: error.message,
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        code: 500,
        success: false,
        message: 'Error fetching audit job',
      });
    }
  }

  @Get('status/:status')
  async findByStatus(
    @Param('status', ParseIntPipe) status: number,
    @Res() res: express.Response,
  ) {
    try {
      const auditJobs = await this.auditJobsService.findByStatus(status);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: auditJobs,
      });
    } catch (error) {
      console.error('Error fetching audit jobs by status:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching audit jobs by status',
      });
    }
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      console.log('🔍 Fetching audit job:', id);

      const auditJob = await this.auditJobsService.findOne(id);

      return res.status(HttpStatus.OK).json({
        code: 200,
        success: true,
        data: auditJob,
        message: 'Success',
      });
    } catch (error) {
      console.error('❌ Error fetching audit job:', error);

      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          code: 404,
          success: false,
          message: error.message,
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        code: 500,
        success: false,
        message: 'Error fetching audit job',
      });
    }
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAuditJobDto: UpdateAuditJobDto,
    @Res() res: express.Response,
  ) {
    try {
      const auditJob = await this.auditJobsService.update(
        id,
        updateAuditJobDto,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        data: auditJob,
        message: 'Audit job updated successfully',
      });
    } catch (error) {
      console.error('Error updating audit job:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error updating audit job',
      });
    }
  }

  @Patch(':id/confirm')
  async confirm(
    @Param('id', ParseIntPipe) id: number,
    @Body('confirmedBy') confirmedBy: number,
    @Res() res: express.Response,
  ) {
    try {
      const auditJob = await this.auditJobsService.confirm(
        id,
        confirmedBy || 0,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        data: auditJob,
        message: 'Audit job confirmed and locked successfully',
      });
    } catch (error) {
      console.error('Error confirming audit job:', error);
      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error confirming audit job',
      });
    }
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { delete_reason?: string; deleted_by?: number },
    @Res() res: express.Response,
  ) {
    try {
      await this.auditJobsService.remove(
        id,
        body.delete_reason,
        body.deleted_by,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Audit job ${id} has been deactivated`,
      });
    } catch (error) {
      console.error('Error removing audit job:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error removing audit job',
      });
    }
  }

  @Delete(':id/hard')
  async hardDelete(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      await this.auditJobsService.delete(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Audit job ${id} has been permanently deleted`,
      });
    } catch (error) {
      console.error('Error deleting audit job:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error deleting audit job',
      });
    }
  }

  // ==========================================
  // Job Header File Upload Endpoints
  // ==========================================

  // POST /audit-jobs/:id/header-attachments - Upload Files
  @Post(':id/header-attachments')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: JOB_HEADER_PATH,
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('File type not allowed'), false);
        }
      },
    }),
  )
  async uploadJobHeaderAttachments(
    @Param('id', ParseIntPipe) jobId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('uploadedBy') uploadedBy: string,
  ) {
    try {
      if (!files || files.length === 0) {
        throw new BadRequestException('No files uploaded');
      }

      const uploadedFiles = await Promise.all(
        files.map((file) =>
          this.auditFilesService.uploadFile({
            fileType: AuditFileType.JOB_HEADER,
            referenceId: jobId,
            ...this.extractFileInfo(file),
            uploadedBy: uploadedBy ? parseInt(uploadedBy, 10) : undefined,
          }),
        ),
      );

      return {
        success: true,
        data: uploadedFiles,
        message: `${uploadedFiles.length} files uploaded successfully`,
      };
    } catch (error) {
      console.error('Error uploading job header attachments:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error uploading files');
    }
  }

  // GET /audit-jobs/:id/header-attachments - Get Files
  @Get(':id/header-attachments')
  async getJobHeaderAttachments(@Param('id', ParseIntPipe) jobId: number) {
    try {
      const files = await this.auditFilesService.getFiles(
        AuditFileType.JOB_HEADER,
        jobId,
      );

      return {
        success: true,
        data: files,
      };
    } catch (error) {
      console.error('Error fetching job header attachments:', error);
      throw new InternalServerErrorException('Error fetching files');
    }
  }

  // GET /audit-jobs/:id/header-attachments/:fileId/download - Download File
  @Get(':id/header-attachments/:fileId/download')
  async downloadJobHeaderAttachment(
    @Param('id', ParseIntPipe) jobId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    try {
      const file = await this.auditFilesService.getFile(fileId);

      if (!file || !existsSync(file.filePath)) {
        throw new NotFoundException('File not found');
      }

      const fileStream = createReadStream(file.filePath);

      res.set({
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          file.fileName,
        )}"`,
      });

      return new StreamableFile(fileStream);
    } catch (error) {
      console.error('Error downloading file:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('File not found');
    }
  }

  // GET /audit-jobs/:id/header-attachments/:fileId/view - Preview File
  @Get(':id/header-attachments/:fileId/view')
  async viewJobHeaderAttachment(
    @Param('id', ParseIntPipe) jobId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    try {
      const file = await this.auditFilesService.getFile(fileId);

      if (!file || !existsSync(file.filePath)) {
        throw new NotFoundException('File not found');
      }

      const fileStream = createReadStream(file.filePath);

      res.set({
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(
          file.fileName,
        )}"`,
      });

      return new StreamableFile(fileStream);
    } catch (error) {
      console.error('Error viewing file:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('File not found');
    }
  }

  // DELETE /audit-jobs/:id/header-attachments/:fileId - Delete File
  @Delete(':id/header-attachments/:fileId')
  async deleteJobHeaderAttachment(
    @Body('deletedBy', ParseIntPipe) deletedBy: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @Req() req: express.Request,
  ) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new BadRequestException('No authorization token provided');
      }

      // const userId = 1;

      await this.auditFilesService.deleteFile(fileId, deletedBy);

      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting job header attachment:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error deleting file');
    }
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private async getUserFromJWT(
    req: express.Request | undefined,
  ): Promise<UserInfo | undefined> {
    if (!req) {
      return undefined;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.substring(7);

    try {
      const decoded = this.jwtService.verify<{
        userId: string;
        username: string;
        role: string;
      }>(token, {
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!decoded.username) {
        throw new Error('Username is missing from JWT');
      }

      const auditRole = await this.auditUserRolesService.getRoleByUserCode(
        decoded.username,
      );

      if (!auditRole) {
        throw new UnauthorizedException(
          `User ${decoded.username} is not registered in Audit System`,
        );
      }

      return {
        user_id: parseInt(decoded.userId, 10),
        role_id: auditRole.roleId,
        username: decoded.username,
        is_admin: auditRole.roleId === 1,
      };
    } catch (error) {
      console.error('❌ Authorization failed:', error);
      throw new UnauthorizedException(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
