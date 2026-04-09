import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  Res,
  Req,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
  StreamableFile,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, createReadStream } from 'fs';
import express from 'express';
import { AuditFilesService } from '../service/audit-files.service';
import { AuditFileType } from '../domain/enum/audit-file-type.enum';

const BASE_UPLOAD_PATH = 'D:\\files\\Audit_file';
const AM_CHECKLIST_PATH = join(BASE_UPLOAD_PATH, 'am-checklist');

@Controller('audit-items')
export class AuditFilesController implements OnModuleInit {
  constructor(private readonly auditFilesService: AuditFilesService) {}

  // สร้าง Folder อัตโนมัติเมื่อ Start Server
  onModuleInit() {
    this.ensureUploadDirectories();
  }

  private ensureUploadDirectories() {
    const directories = [
      BASE_UPLOAD_PATH,
      AM_CHECKLIST_PATH,
      join(BASE_UPLOAD_PATH, 'job-header'), // สำหรับอนาคต
    ];

    directories.forEach((dir) => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      } else {
        console.log(`✓ Directory exists: ${dir}`);
      }
    });
  }

  // Helper function - Extract file info
  private extractFileInfo(file: Express.Multer.File) {
    return {
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  //  POST /audit-items/:id/am-checklist/attachments - Upload Files
  @Post(':id/am-checklist/attachments')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: AM_CHECKLIST_PATH, // เปลี่ยนเป็น D:\files\Audit_file\am-checklist
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel .xlsx
          'application/vnd.ms-excel', // Excel .xls
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('File type not allowed'), false);
        }
      },
    }),
  )
  async uploadAMChecklistAttachments(
    @Param('id', ParseIntPipe) itemId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('uploadedBy') uploadedBy: string,
  ) {
    try {
      if (!files || files.length === 0) {
        throw new BadRequestException('No files uploaded');
      }

      // Upload each file
      const uploadedFiles = await Promise.all(
        files.map((file) =>
          this.auditFilesService.uploadFile({
            fileType: AuditFileType.AM_CHECKLIST,
            referenceId: itemId,
            ...this.extractFileInfo(file), // ใช้ helper function
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
      console.error('Error uploading AM checklist attachments:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error uploading files');
    }
  }

  // GET /audit-items/:id/am-checklist/attachments - Get Files
  @Get(':id/am-checklist/attachments')
  async getAMChecklistAttachments(@Param('id', ParseIntPipe) itemId: number) {
    try {
      const files = await this.auditFilesService.getFiles(
        AuditFileType.AM_CHECKLIST,
        itemId,
      );

      return {
        success: true,
        data: files,
      };
    } catch (error) {
      console.error('Error fetching AM checklist attachments:', error);
      throw new InternalServerErrorException('Error fetching files');
    }
  }

  // GET /audit-items/:id/am-checklist/attachments/:fileId/download - Download File
  @Get(':id/am-checklist/attachments/:fileId/download')
  async downloadAMChecklistAttachment(
    @Param('id', ParseIntPipe) itemId: number,
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

  // GET /audit-items/:id/am-checklist/attachments/:fileId/view - Preview File
  @Get(':id/am-checklist/attachments/:fileId/view')
  async viewAMChecklistAttachment(
    @Param('id', ParseIntPipe) itemId: number,
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

  // DELETE /audit-items/:id/am-checklist/attachments/:fileId - Delete File
  @Delete(':id/am-checklist/attachments/:fileId')
  async deleteAMChecklistAttachment(
    @Param('id', ParseIntPipe) itemId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @Req() req: express.Request,
  ) {
    try {
      // Get user from JWT
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new BadRequestException('No authorization token provided');
      }

      // Decode JWT to get user_id (ถ้ามี JwtService)
      // const decoded = this.jwtService.verify(token);
      // const userId = decoded.UserID;

      // ถ้ายังไม่มี JWT verification ใช้ค่า default ไปก่อน
      const userId = 1; // TODO: แทนที่ด้วย user_id จริงจาก JWT

      await this.auditFilesService.deleteFile(fileId, userId);

      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting AM checklist attachment:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error deleting file');
    }
  }
}
