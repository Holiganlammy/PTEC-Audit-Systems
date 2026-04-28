import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuditCreateDocGmailApiService } from '../../email/audit-create-doc-gmail-api.service';
import { SendAuditJobEmailDto } from '../dto/send-audit-email.dto';

@Controller('audit-email')
export class AuditEmailController {
  constructor(
    private readonly auditCreateDocGmailService: AuditCreateDocGmailApiService,
  ) {}

  /**
   * POST /audit-email/send-job-created
   * Body: SendAuditJobEmailDto
   * ส่งเมลแจ้งเตือนเมื่อสร้าง Audit Document ใหม่ (เรียกผ่าน API ได้เลย)
   */
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
}
