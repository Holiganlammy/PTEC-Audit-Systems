import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { AuditCreateDocGmailApiService } from '../../email/audit-create-doc-gmail-api.service';
import {
  SendAuditJobEmailDto,
  SendMentionEmailDto,
} from '../dto/send-audit-email.dto';
import { AuditItemsService } from '../service/audit-item.service';
import { AuditJobsService } from '../service/audit-job.service';
import { MentionEmailService } from '../../email/mention-comment-gmail.api.service';
import express from 'express';
import { AuditJobWithUsers } from '../domain/type/audit-job.interface';

@Controller('audit-email')
export class AuditEmailController {
  constructor(
    private readonly auditCreateDocGmailService: AuditCreateDocGmailApiService,
    private readonly mentionEmailService: MentionEmailService,
    private readonly auditItemsService: AuditItemsService,
    private readonly auditJobsService: AuditJobsService,
  ) {}

  @Post('send-job-created')
  @HttpCode(HttpStatus.OK)
  async sendJobCreatedEmail(@Body() body: SendAuditJobEmailDto) {
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
      jobUrl: body.jobUrl,
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
        auditChecked: dto.auditChecked ?? false,
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
}
