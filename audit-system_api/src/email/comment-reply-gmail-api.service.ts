import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { escapeHtml } from './html-escape.util';
import { sendMailViaGraph } from './microsoft-graph-mail.service';

@Injectable()
export class CommentReplyGmailApiService {
  async sendHtmlMail(params: {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
      filename: string;
      path: string;
      cid: string;
    }>;
  }) {
    const attachments = (params.attachments ?? []).flatMap((attachment) => {
      try {
        return [
          {
            cid: attachment.cid,
            filename: attachment.filename,
            contentType: 'image/png',
            base64Content: fs.readFileSync(attachment.path).toString('base64'),
            isInline: true,
          },
        ];
      } catch (error) {
        console.error(`Error reading attachment ${attachment.path}:`, error);
        return [];
      }
    });

    await sendMailViaGraph({
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments,
    });
  }

  async sendCommentReplyEmail(params: {
    to: string;
    repliedToFullname?: string;
    replierFullname?: string;
    originalCommentText: string;
    replyText: string;
    itemId: number;
    itemName?: string;
    jobNo?: string;
    branchName?: string;
    auditItemUrl?: string;
    formType?: string; // 'AM' | 'AA' | 'Audit'
  }) {
    const repliedToName = escapeHtml(
      params.repliedToFullname?.trim() || 'ผู้ใช้งาน',
    );
    const replierName = escapeHtml(
      params.replierFullname?.trim() || 'ผู้ใช้งานในระบบ',
    );
    const itemName = escapeHtml(params.itemName?.trim() || 'รายการตรวจสอบ');
    const jobNo = params.jobNo?.trim() || '-';
    const branchName = escapeHtml(params.branchName?.trim() || '-');
    const originalCommentText = escapeHtml(params.originalCommentText);
    const replyText = escapeHtml(params.replyText);
    const formType = params.formType?.toUpperCase() || 'Audit';
    const formTypeLabel =
      formType === 'AM'
        ? 'Area Manager (AM)'
        : formType === 'AA'
          ? 'Area Assistant (AA)'
          : 'Audit';

    const baseUrl = process.env.FRONTEND_URL || 'https://audit.purethai.co.th';
    const defaultUrl =
      jobNo !== '-'
        ? formType === 'AM' || formType === 'AA'
          ? `${baseUrl}/areamanage/edit_document?jobNo=${jobNo}&formType=${formType}`
          : `${baseUrl}/audit/edit_document?jobNo=${jobNo}`
        : '#';
    const itemUrl = params.auditItemUrl || defaultUrl;

    const logoPath = path.resolve(process.cwd(), 'src/images/Header_Mail.png');

    const subject = `${replierName} ตอบกลับความคิดเห็นของคุณ JobNo #${params.jobNo}`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Sarabun', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 90%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 0; text-align: center; border-radius: 8px 8px 0 0; overflow: hidden;">
              <img src="cid:header_logo" alt="PTEC Audit System" style="width: 100%; max-width: 600px; height: auto; display: block; border: none;" />
            </td>
          </tr>

          <!-- Title Bar -->
          <tr>
            <td style="background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); padding: 24px 32px; text-align: center;">
              <h1 style="margin: 0; color: #000000; font-size: 22px; font-weight: bold;">มีการตอบกลับความคิดเห็นของคุณ</h1>
              <p style="margin: 6px 0 0; color: #000000; font-size: 13px;">${formTypeLabel} — PTEC Audit System</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">

              <!-- Greeting -->
              <p style="margin: 0 0 24px; font-size: 16px; color: #1F2937;">
                เรียน <strong>${repliedToName}</strong>
              </p>

              <!-- Message -->
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
                <strong>${replierName}</strong> ได้ตอบกลับความคิดเห็นของคุณในรายการตรวจสอบ
                กรุณาตรวจสอบรายละเอียดเพิ่มเติม
              </p>

              <!-- Details Card -->
              <table role="presentation" style="width: 100%; border: 1px solid #E5E7EB; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px; background-color: #F9FAFB;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280; width: 140px;">รายการตรวจสอบ:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937; font-weight: 600;">${itemName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">เลขเอกสาร ${formTypeLabel}:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${jobNo}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">สาขา:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${branchName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280; vertical-align: top;">ความคิดเห็นของคุณ:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280; font-style: italic;">${originalCommentText}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280; vertical-align: top;">ข้อความตอบกลับ:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${replyText}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${itemUrl}"
                       style="display: inline-block; padding: 12px 32px; background-color: #1E40AF; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                      คลิกเพื่อดูรายการตรวจสอบ
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Additional Info -->
              <p style="margin: 0; font-size: 14px; color: #6B7280; line-height: 1.5;">
                หากมีข้อสงสัยหรือต้องการความช่วยเหลือ กรุณาติดต่อทีม ${formTypeLabel}
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #9CA3AF; text-align: center;">
                อีเมลฉบับนี้ถูกส่งโดยอัตโนมัติจากระบบ PTEC Audit System
              </p>
              <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-align: center;">
                กรุณาอย่าตอบกลับอีเมลนี้
              </p>
              <p style="margin: 16px 0 0; font-size: 12px; color: #9CA3AF; text-align: center;">
                © ${new Date().getFullYear()} PURE THAI ENERGY. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const attachments: Array<{ filename: string; path: string; cid: string }> =
      [];
    try {
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'Header_Mail.png',
          path: logoPath,
          cid: 'header_logo',
        });
      } else {
        console.warn(`Logo not found at: ${logoPath}`);
      }
    } catch (error) {
      console.error('Error checking logo file:', error);
    }

    await this.sendHtmlMail({
      to: params.to,
      subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  }
}
