import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  ConflictException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  OnModuleInit,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, unlink } from 'fs';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { AuditCreateDocGmailApiService } from '../../email/audit-create-doc-gmail-api.service';
import {
  SendAuditJobEmailDto,
  SendAuditSummaryEmailDto,
  SendMentionEmailDto,
} from '../dto/send-audit-email.dto';
import { AuditItemsService } from '../service/audit-item.service';
import { AuditJobsService } from '../service/audit-job.service';
import { MentionEmailService } from '../../email/mention-comment-gmail.api.service';
import express from 'express';
import { AuditJobWithUsers } from '../domain/type/audit-job.interface';
import { AuditSummaryEmailService } from '../../email/audit-sumary-comment-send-items.api.service';
import { FileAccessService } from '../service/file-access.service';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';

const TMP_EMAIL_PDF_PATH = join('D:\\files\\Audit_file', 'tmp-email-pdf');

@Controller('audit-email')
export class AuditEmailController implements OnModuleInit {
  constructor(
    private readonly auditCreateDocGmailService: AuditCreateDocGmailApiService,
    private readonly mentionEmailService: MentionEmailService,
    private readonly auditItemsService: AuditItemsService,
    private readonly auditJobsService: AuditJobsService,
    private readonly auditSummaryService: AuditSummaryEmailService,
    private readonly fileAccessService: FileAccessService,
    private readonly userRightService: UserRightService,
  ) {}

  onModuleInit(): void {
    if (!existsSync(TMP_EMAIL_PDF_PATH)) {
      mkdirSync(TMP_EMAIL_PDF_PATH, { recursive: true });
    }
  }

  @Post('send-job-created')
  @HttpCode(HttpStatus.OK)
  async sendJobCreatedEmail(@Body() body: SendAuditJobEmailDto) {
    const { alreadySent, sentAt } =
      await this.auditJobsService.checkAndMarkJobCreatedEmail(
        body.jobId,
        body.userby,
      );

    if (alreadySent) {
      throw new ConflictException({
        code: 409,
        success: false,
        message: `เมลถูกส่งไปแล้วสำหรับเอกสารนี้ (jobNo: ${body.jobNo})`,
        sentAt,
      });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://audit.purethai.co.th';
    const jobUrlWithFileAccess =
      this.fileAccessService.buildJobUrlWithFileAccess(
        baseUrl,
        body.jobNo,
        body.jobId,
      );

    await this.auditCreateDocGmailService.sendAuditJobCreatedEmail({
      groupEmails: body.groupEmails,
      additionalRecipients: body.additionalRecipients,
      jobNo: body.jobNo,
      branchName: body.branchName,
      auditDate: body.auditDate,
      createdByFullname: body.createdByFullname,
      auditorFullname: body.auditorFullname,
      districtManagerFullname: body.districtManagerFullname,
      branchManagerFullname: body.branchManagerFullname,
      jobUrl: jobUrlWithFileAccess,
      additionalNotes: body.additionalNotes,
    });

    return {
      code: 200,
      success: true,
      message: `ส่งเมลสำเร็จ (jobNo: ${body.jobNo})`,
    };
  }

  @Post('mention-email')
  async sendMentionEmail(
    @Body() dto: SendMentionEmailDto,
    @Res() res: express.Response,
  ) {
    try {
      let jobData: AuditJobWithUsers | null = null;

      const itemData = await this.auditItemsService.findOne(dto.itemId);

      if (!dto.jobNo) {
        jobData = await this.auditJobsService.findOne(itemData.jobId);
      }

      const emailParams = {
        categoryName:
          dto.categoryName || itemData.categoryItem?.categoryName || '-',
        jobNo: dto.jobNo || jobData?.jobNo || '-',
        branchName: dto.branchName || '-',
        itemStatus: itemData.itemStatusRelation?.auditStatusItemId ?? null,
        itemStatusEditName:
          itemData.itemStatusEditRelation?.auditStatusItemId ?? null,
        amChecklistStatus:
          dto.amChecklistStatus ?? itemData.amChecklistStatus ?? null,
        // auditChecked: dto.auditChecked ?? false,
        auditDate: itemData.inspectionDate
          ? new Date(itemData.inspectionDate).toISOString()
          : '-',
      };

      for (const user of dto.mentionedUsers) {
        if (!user.email) {
          console.warn(`⚠️ User ${user.userCode} has no email, skipping...`);
          continue;
        }

        try {
          await this.mentionEmailService.sendMentionNotification({
            recipientEmail: user.email,
            recipientFullname: user.fullname,
            recipientUserCode: user.userCode,
            senderName: dto.senderName,
            commentText: dto.commentText,
            itemId: dto.itemId,
            threadType: dto.threadType,
            ...emailParams,
          });

          console.log(
            `✓ Mention email sent to ${user.userCode} (${user.email})`,
          );
        } catch (emailError) {
          console.error(
            `✗ Failed to send mention email to ${user.userCode}:`,
            emailError,
          );
        }
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Sent ${dto.mentionedUsers.length} mention notifications`,
      });
    } catch (error) {
      console.error('Error sending mention emails:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error sending mention emails',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post('send-summary')
  @HttpCode(HttpStatus.OK)
  async sendSummaryEmail(
    @Body() dto: SendAuditSummaryEmailDto,
    @Res() res: express.Response,
  ) {
    try {
      // Type helper
      type CombinedSummaryPayload = Parameters<
        AuditSummaryEmailService['sendCombinedSummaryEmail']
      >[0];
      type CommentData = CombinedSummaryPayload['auditComments'][number];

      const toCommentDataArray = (value: unknown): CommentData[] => {
        if (!Array.isArray(value)) {
          return [];
        }
        return value.map((comment) => comment as CommentData);
      };

      const auditComments = toCommentDataArray(dto.auditComments);
      const otherComments = toCommentDataArray(dto.otherComments);

      // ตรวจสอบว่ามี comment อย่างน้อย 1 อัน
      if (auditComments.length === 0 && otherComments.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'No comments to send',
        });
      }

      await this.auditSummaryService.sendCombinedSummaryEmail({
        recipientEmails: dto.branchEmails,
        jobNo: dto.jobNo,
        branchName: dto.branchName,
        categoryName: dto.categoryName,
        itemStatus: dto.itemStatus,
        amChecklistStatus: dto.amChecklistStatus,
        auditItemStatus: dto.auditItemStatus,
        auditDate: dto.auditDate,
        auditComments,
        otherComments,
      });

      console.log(
        `✓ Combined summary email sent (${auditComments.length} audit + ${otherComments.length} other) to ${dto.branchEmails.length} recipients`,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Summary email sent successfully',
        emailCount: 1,
        recipientCount: dto.branchEmails.length,
        auditCommentsCount: auditComments.length,
        otherCommentsCount: otherComments.length,
      });
    } catch (error) {
      console.error('❌ Error sending summary email:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to send summary email',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST /audit-email/send-branch-summary - ส่งเมลสรุปผลการตรวจไปยังสาขา พร้อมแนบ PDF
  // (ยิงเพิ่มเติมจาก send-job-created หลังทุกรายการปิดเคสแล้วเท่านั้น)
  @Post('send-branch-summary')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('pdf', {
      storage: diskStorage({
        destination: TMP_EMAIL_PDF_PATH,
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF files are allowed'), false);
        }
      },
    }),
  )
  async sendBranchSummaryEmail(
    @UploadedFile() file: Express.Multer.File,
    @Body('jobId') jobIdRaw: string,
    @Res() res: express.Response,
  ) {
    const cleanup = () => {
      if (file?.path) unlink(file.path, () => {});
    };

    try {
      if (!file) {
        throw new BadRequestException('PDF file is required');
      }

      const jobId = parseInt(jobIdRaw, 10);
      if (!jobId) {
        cleanup();
        throw new BadRequestException('jobId is required');
      }

      const job = (await this.auditJobsService.findOne(
        jobId,
      )) as unknown as AuditJobWithUsers & {
        jobId: number;
        jobNo: string;
        branchId: number;
        branchName: string;
        auditDate: string;
        additionalNotes?: string;
        branchAssignment?: string;
      };

      // เช็คซ้ำฝั่ง backend ว่าทุกรายการมีสถานะแล้วจริง (ไม่เชื่อ flag จาก frontend อย่างเดียว)
      // ไม่ต้องปิดเคสทั้งหมด แค่ต้องมีสถานะ (itemStatusEdit ไม่ใช่ null/undefined)
      // กรองเฉพาะ item ที่ active เท่านั้น — job.items จาก findOne() ไม่ได้ filter active
      // มาให้ (ต่างจาก /audit-items/job/:jobId ที่ frontend ใช้) เลยต้อง filter เองไม่งั้น
      // item ที่ถูกลบ (soft delete, active=false) แต่ยังไม่มีสถานะ จะติดเช็คผิดๆ
      const items = (job.items ?? []).filter(
        (i) => (i as unknown as { active: boolean }).active,
      ) as unknown as Array<{
        itemStatusEdit: number | null;
      }>;
      if (
        items.length === 0 ||
        !items.every(
          (i) => i.itemStatusEdit !== null && i.itemStatusEdit !== undefined,
        )
      ) {
        cleanup();
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'ยังมีรายการตรวจสอบที่ยังไม่มีสถานะ ไม่สามารถส่งเมลสรุปผลได้',
        });
      }

      const branchUsers = await this.userRightService.getUsersByBranch(
        job.branchId,
      );
      const branchEmails = branchUsers
        .map((u) => u.Email)
        .filter((email): email is string => !!email);

      if (branchEmails.length === 0) {
        cleanup();
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: `ไม่พบอีเมลของสาขา (branchId: ${job.branchId})`,
        });
      }

      await this.auditCreateDocGmailService.sendBranchSummaryEmail({
        to: branchEmails,
        jobNo: job.jobNo,
        branchName: job.branchName,
        auditDate: job.auditDate
          ? format(new Date(job.auditDate), 'dd MMMM yyyy', { locale: th })
          : '-',
        createdByFullname: job.createdByUser?.fullname,
        auditorFullname: job.auditor?.fullname,
        districtManagerFullname: job.districtManager?.fullname,
        branchManagerFullname: job.branchManager?.fullname,
        additionalNotes: job.additionalNotes,
        branchAssignment: job.branchAssignment,
        pdfPath: file.path,
        pdfFilename: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: `ส่งเมลสรุปผลการตรวจไปยังสาขาสำเร็จ (${branchEmails.length} คน)`,
      });
    } catch (error) {
      console.error('Error sending branch summary email:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'ไม่สามารถส่งเมลสรุปผลการตรวจไปยังสาขาได้',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      cleanup();
    }
  }
}
