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
  HttpException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, createReadStream } from 'fs';
import express from 'express';
import { AAJobsService } from '../service/aa-job.service';
import {
  PaginatedResponse,
  UserInfo,
} from '../domain/type/audit-job.interface';
import { CreateAuditJobDto } from '../dto/create-audit-job.dto';
import { UpdateAuditJobDto } from '../dto/update-audit-job.dto';
import { JwtService } from '@nestjs/jwt';
import { AuditUserRolesService } from '../../PTEC_USERIGHT/service/audit-user-roles.service';
import { AMFilesService } from '../service/am-files.service';
import { AuditFileType } from '../domain/enum/audit-file-type.enum';

const BASE_UPLOAD_PATH = 'D:\\files\\Audit_file';
const JOB_HEADER_PATH = join(BASE_UPLOAD_PATH, 'job-header');
const AA_CHECKLIST_PATH = join(BASE_UPLOAD_PATH, 'aa-checklist');

@Controller('aa-jobs')
export class AAJobsController implements OnModuleInit {
  constructor(
    private readonly aaJobsService: AAJobsService,
    private readonly jwtService: JwtService,
    private readonly auditUserRolesService: AuditUserRolesService,
    private readonly amFilesService: AMFilesService,
  ) {}

  onModuleInit() {
    this.ensureUploadDirectories();
  }

  private ensureUploadDirectories() {
    const directories = [BASE_UPLOAD_PATH, JOB_HEADER_PATH, AA_CHECKLIST_PATH];

    directories.forEach((dir) => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
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
  // Job CRUD Endpoints
  // ==========================================

  @Post('/create')
  async create(
    @Body() createAuditJobDto: CreateAuditJobDto,
    @Res() res: express.Response,
  ) {
    try {
      const aaJob = await this.aaJobsService.create(createAuditJobDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: aaJob,
        message: 'AA job created successfully',
      });
    } catch (error) {
      console.error('Error creating AA job:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error creating AA job',
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
    @Query('districtManagerUserId') districtManagerUserId?: string,
    @Query('branchManagerUserId') branchManagerUserId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('active') active?: string,
    @Req() req?: express.Request,
  ): Promise<PaginatedResponse> {
    const params = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status: status ? parseInt(status, 10) : undefined,
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      auditorUserId: auditorUserId ? parseInt(auditorUserId, 10) : undefined,
      districtManagerUserId: districtManagerUserId
        ? parseInt(districtManagerUserId, 10)
        : undefined,
      branchManagerUserId: branchManagerUserId
        ? parseInt(branchManagerUserId, 10)
        : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      search: search || undefined,
      active: active ? active === 'true' : undefined,
    };

    const user = req ? await this.getUserFromJWT(req) : undefined;

    if (!user) {
      throw new HttpException(
        {
          success: false,
          message: 'User information is required',
          unauthorized: true,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return await this.aaJobsService.findAll(params, user);
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

      const aaJob = await this.aaJobsService.findByJobNo(normalizedJobCode);

      return res.status(HttpStatus.OK).json({
        code: 200,
        success: true,
        data: aaJob,
        message: 'Success',
      });
    } catch (error) {
      console.error('❌ Error fetching AA job by jobcode:', error);

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
        message: 'Error fetching AA job',
      });
    }
  }

  @Get('detail')
  async findOneByJobCodeQuery(
    @Query('jobNo') jobNo: string,
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    try {
      const user = req ? await this.getUserFromJWT(req) : undefined;

      if (!user) {
        throw new HttpException(
          {
            success: false,
            message: 'User information is required',
            unauthorized: true,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const normalizedJobNo = typeof jobNo === 'string' ? jobNo.trim() : '';
      if (!normalizedJobNo) {
        throw new BadRequestException('jobNo is required');
      }

      const aaJob = await this.aaJobsService.findByJobNo(normalizedJobNo);

      return res.status(HttpStatus.OK).json({
        code: 200,
        success: true,
        data: aaJob,
        message: 'Detail fetched successfully',
      });
    } catch (error) {
      console.error('❌ Error fetching AA job by jobNo:', error);

      if (error instanceof HttpException && error.getStatus() === 401) {
        const errBody = error.getResponse() as Record<string, unknown>;
        return res.status(HttpStatus.UNAUTHORIZED).json({
          code: 401,
          success: false,
          unauthorized: true,
          message:
            typeof errBody.message === 'string'
              ? errBody.message
              : 'Unauthorized',
        });
      }

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
        message: 'Error fetching AA job',
      });
    }
  }

  @Get('status/:status')
  async findByStatus(
    @Param('status', ParseIntPipe) status: number,
    @Res() res: express.Response,
  ) {
    try {
      const aaJobs = await this.aaJobsService.findByStatus(status);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: aaJobs,
      });
    } catch (error) {
      console.error('Error fetching AA jobs by status:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching AA jobs by status',
      });
    }
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      const aaJob = await this.aaJobsService.findOne(id);

      return res.status(HttpStatus.OK).json({
        code: 200,
        success: true,
        data: aaJob,
        message: 'Success',
      });
    } catch (error) {
      console.error('❌ Error fetching AA job:', error);

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
        message: 'Error fetching AA job',
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
      const aaJob = await this.aaJobsService.update(id, updateAuditJobDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: aaJob,
        message: 'AA job updated successfully',
      });
    } catch (error) {
      console.error('Error updating AA job:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error updating AA job',
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
      const aaJob = await this.aaJobsService.confirm(id, confirmedBy || 0);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: aaJob,
        message: 'AA job confirmed and locked successfully',
      });
    } catch (error) {
      console.error('Error confirming AA job:', error);
      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error confirming AA job',
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
      await this.aaJobsService.remove(id, body.delete_reason, body.deleted_by);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `AA job ${id} has been deactivated`,
      });
    } catch (error) {
      console.error('Error removing AA job:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error removing AA job',
      });
    }
  }

  @Delete(':id/hard')
  async hardDelete(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      await this.aaJobsService.delete(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `AA job ${id} has been permanently deleted`,
      });
    } catch (error) {
      console.error('Error deleting AA job:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error deleting AA job',
      });
    }
  }

  // ==========================================
  // Job Header File Upload Endpoints
  // ==========================================

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
      limits: { fileSize: 30 * 1024 * 1024 },
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
          this.amFilesService.uploadFile({
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

  @Get(':id/header-attachments')
  async getJobHeaderAttachments(@Param('id', ParseIntPipe) jobId: number) {
    try {
      const files = await this.amFilesService.getFiles(
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

  @Get(':id/header-attachments/:fileId/download')
  async downloadJobHeaderAttachment(
    @Param('id', ParseIntPipe) jobId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    try {
      const file = await this.amFilesService.getFile(fileId);

      if (!file || !existsSync(file.physicalPath)) {
        throw new NotFoundException('File not found');
      }

      const fileStream = createReadStream(file.physicalPath);

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

  @Get(':id/header-attachments/:fileId/view')
  async viewJobHeaderAttachment(
    @Param('id', ParseIntPipe) jobId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    try {
      const file = await this.amFilesService.getFile(fileId);

      if (!file || !existsSync(file.physicalPath)) {
        throw new NotFoundException('File not found');
      }

      const fileStream = createReadStream(file.physicalPath);

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

      await this.amFilesService.deleteFile(fileId, deletedBy);

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
      throw new HttpException(
        { success: false, message: 'No token provided', unauthorized: true },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const userCode = req.user;
    if (!userCode) {
      throw new HttpException(
        {
          success: false,
          message: 'No user in request context',
          unauthorized: true,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    let userId: number | undefined;
    const token = authHeader.substring(7);
    try {
      const decoded = this.jwtService.decode<{ userId?: string }>(token);
      if (decoded?.userId) {
        userId = parseInt(decoded.userId, 10);
      }
    } catch {
      // userId is optional — ignore decode errors
    }

    const auditRole =
      await this.auditUserRolesService.getRoleByUserCode(userCode);

    if (!auditRole) {
      throw new HttpException(
        {
          success: false,
          message: `User ${userCode} is not registered in Audit System`,
          unauthorized: true,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return {
      user_id: userId ?? auditRole.userId,
      role_id: auditRole.roleId,
      username: userCode,
      is_admin: auditRole.roleId === 1,
    };
  }
}
