import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  ConflictException,
} from '@nestjs/common';
import { AuditCreateDocGmailApiService } from '../../email/audit-create-doc-gmail-api.service';
import {
  SendAuditJobEmailDto,
  SendAuditSummaryEmailDto,
  SendMentionEmailDto,
} from '../dto/send-audit-email.dto';
import { AMItemsService } from '../service/am-item.service';
import { AMJobsService } from '../service/audit-job.service';
import { MentionEmailService } from '../../email/mention-comment-gmail.api.service';
import express from 'express';
import { AuditJobWithUsers } from '../domain/type/audit-job.interface';
import { AuditSummaryEmailService } from '../../email/audit-sumary-comment-send-items.api.service';
import { FileAccessService } from '../service/file-access.service';

@Controller('am-email')
export class AuditEmailController {
  constructor(
    private readonly auditCreateDocGmailService: AuditCreateDocGmailApiService,
    private readonly mentionEmailService: MentionEmailService,
    private readonly amItemsService: AMItemsService,
    private readonly auditJobsService: AMJobsService,
    private readonly auditSummaryService: AuditSummaryEmailService,
    private readonly fileAccessService: FileAccessService,
  ) {}

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

      const itemData = await this.amItemsService.findOne(dto.itemId);

      if (!dto.jobNo) {
        jobData = await this.auditJobsService.findOne(itemData.jobId);
      }

      const emailParams = {
        categoryName:
          dto.categoryName || itemData.categoryItem?.categoryName || '-',
        jobNo: dto.jobNo || jobData?.jobNo || '-',
        branchName: dto.branchName || '-',
        itemStatus: itemData.itemStatusRelation?.amStatusItemId ?? null,
        itemStatusEditName:
          itemData.itemStatusEditRelation?.amStatusItemId ?? null,
        amChecklistStatus:
          dto.amChecklistStatus ?? itemData.headerChecklistStatus ?? null,
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
}
