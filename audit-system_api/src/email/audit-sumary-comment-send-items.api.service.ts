// email/audit-summary-gmail-api.service.ts

import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface CommentData {
  author: string;
  authorUserCode: string;
  text: string;
  createdAt: string;
}

interface CombinedSummaryEmailParams {
  recipientEmails: string[];
  jobNo: string;
  branchName: string;
  categoryName: string;
  itemStatus: number | null;
  amChecklistStatus: number | null;
  auditItemStatus: number | null;
  auditDate: string;
  auditComments: CommentData[];
  otherComments: CommentData[];
  formType?: string; // 'AM' | 'AA' | 'Audit'
}

interface GoogleCredentials {
  web?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
  installed?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

interface GoogleToken {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
}

@Injectable()
export class AuditSummaryEmailService {
  private oauth2Client!: InstanceType<typeof google.auth.OAuth2>;

  constructor() {
    this.initializeOAuth();
  }

  private initializeOAuth(): void {
    const credentialsPath =
      process.env.GOOGLE_GMAIL_CREDENTIALS_PATH || 'credentials.json';
    const tokenPath = process.env.GOOGLE_GMAIL_TOKEN_PATH || 'token.json';

    const credentials = JSON.parse(
      fs.readFileSync(path.resolve(credentialsPath), 'utf-8'),
    ) as GoogleCredentials;

    const { client_secret, client_id, redirect_uris } =
      credentials.web ?? credentials.installed!;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris?.[0],
    );

    const token = JSON.parse(
      fs.readFileSync(path.resolve(tokenPath), 'utf-8'),
    ) as GoogleToken;
    oAuth2Client.setCredentials(token);
    this.oauth2Client = oAuth2Client;
  }

  /**
   * ส่งเมลสรุปรวม (Audit + Other ในเมลเดียว)
   */
  async sendCombinedSummaryEmail(
    params: CombinedSummaryEmailParams,
  ): Promise<void> {
    const {
      recipientEmails,
      jobNo,
      branchName,
      categoryName,
      itemStatus,
      amChecklistStatus,
      auditItemStatus,
      auditComments,
      otherComments,
    } = params;

    const formType = params.formType?.toUpperCase() || 'Audit';
    const formTypeLabel =
      formType === 'AM' ? 'AM' : formType === 'AA' ? 'AA' : 'Audit';

    // ถ้าไม่มี comment เลย ไม่ต้องส่ง
    if (auditComments.length === 0 && otherComments.length === 0) {
      console.log('⚠️ No comments to send');
      return;
    }

    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    const from = process.env.Email || 'no-reply@ptec.co.th';

    const itemStatusBadge = this.getItemStatusBadge(itemStatus);
    const amChecklistBadge = this.getAMChecklistBadge(amChecklistStatus);
    const auditItemStatusBadge = this.getAuditItemStatusBadge(auditItemStatus);

    // สร้าง HTML สำหรับ Audit Comments
    const auditCommentsHtml =
      auditComments.length > 0
        ? `
      <div style="margin-bottom: 24px;">
        <div style="font-size: 14px; font-weight: 600; color: #1E293B; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #3B82F6;">
          ความคิดเห็นจาก ${formTypeLabel} (${auditComments.length} รายการ)
        </div>
        ${auditComments
          .map(
            (comment, index) => `
        <div style="background-color: ${index % 2 === 0 ? '#F0F9FF' : '#FFFFFF'}; padding: 16px; border-radius: 4px; margin-bottom: 12px; border-left: 3px solid #3B82F6;">
          <div style="margin-bottom: 8px;">
            <span style="font-weight: 600; color: #1E293B; font-size: 14px;">${comment.author}</span>
            <span style="color: #64748B; font-size: 12px; margin-left: 8px;">(${comment.authorUserCode})</span>
          </div>
          
          <div style="font-size: 14px; color: #1E293B; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; margin-bottom: 8px;">
${comment.text}
          </div>
          
          <div style="font-size: 12px; color: #78716C;">
            ${format(new Date(comment.createdAt), 'd MMMM yyyy · HH:mm น.', { locale: th })}
          </div>
        </div>
      `,
          )
          .join('')}
      </div>
    `
        : '';

    // สร้าง HTML สำหรับ Other Comments
    const otherCommentsHtml =
      otherComments.length > 0
        ? `
      <div style="margin-bottom: 24px;">
        <div style="font-size: 14px; font-weight: 600; color: #1E293B; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #8B5CF6;">
          ความคิดเห็นจากหน่วยงานอื่นๆ (${otherComments.length} รายการ)
        </div>
        ${otherComments
          .map(
            (comment, index) => `
        <div style="background-color: ${index % 2 === 0 ? '#FAF5FF' : '#FFFFFF'}; padding: 16px; border-radius: 4px; margin-bottom: 12px; border-left: 3px solid #8B5CF6;">
          <div style="margin-bottom: 8px;">
            <span style="font-weight: 600; color: #1E293B; font-size: 14px;">${comment.author}</span>
            <span style="color: #64748B; font-size: 12px; margin-left: 8px;">(${comment.authorUserCode})</span>
          </div>
          
          <div style="font-size: 14px; color: #1E293B; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; margin-bottom: 8px;">
${comment.text}
          </div>
          
          <div style="font-size: 12px; color: #78716C;">
            ${format(new Date(comment.createdAt), 'd MMMM yyyy · HH:mm น.', { locale: th })}
          </div>
        </div>
      `,
          )
          .join('')}
      </div>
    `
        : '';

    const htmlContent = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>สรุปผลการตรวจสอบ - ${jobNo}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #000000; font-size: 24px; font-weight: 600;">
                สรุปผลการตรวจสอบ ${formTypeLabel}
              </h1>
              <p style="margin: 8px 0 0 0; color: #000000; font-size: 14px;">
                ${formTypeLabel} Summary Report
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              
              <!-- Job Info -->
              <div style="background-color: #F8FAFC; border-left: 4px solid #3B82F6; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <table width="100%" cellpadding="4" cellspacing="0">
                  <tr>
                    <td style="color: #64748B; font-size: 13px; width: 120px;">เลขที่งาน:</td>
                    <td style="color: #1E293B; font-size: 14px; font-weight: 600;">${jobNo}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748B; font-size: 13px;">สาขา:</td>
                    <td style="color: #1E293B; font-size: 14px; font-weight: 600;">${branchName}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748B; font-size: 13px;">หมวดหมู่:</td>
                    <td style="color: #1E293B; font-size: 14px;">${categoryName}</td>
                  </tr>
                </table>
              </div>

              <!-- Status Row -->
              <div style="margin-bottom: 24px;">
                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="text-align: center; background-color: #F8FAFC; border-radius: 6px; padding: 12px;">
                      <div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">สถานะ</div>
                      ${itemStatusBadge}
                    </td>
                    <td width="12"></td>
                    <td style="text-align: center; background-color: #F8FAFC; border-radius: 6px; padding: 12px;">
                      <div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">AM Check</div>
                      ${amChecklistBadge}
                    </td>
                    <td width="12"></td>
                    <td style="text-align: center; background-color: #F8FAFC; border-radius: 6px; padding: 12px;">
                      <div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">Audit</div>
                      ${auditItemStatusBadge}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Audit Comments Section -->
              ${auditCommentsHtml}

              <!-- Other Comments Section -->
              ${otherCommentsHtml}

              <!-- Footer -->
              <div style="text-align: center; padding-top: 24px; border-top: 1px solid #E2E8F0;">
                <p style="margin: 0 0 8px 0; color: #64748B; font-size: 12px;">
                  อีเมลนี้ส่งโดยอัตโนมัติจากระบบ PTEC Audit System
                </p>
                <p style="margin: 0; color: #94A3B8; font-size: 11px;">
                  กรุณาอย่าตอบกลับอีเมลนี้
                </p>
              </div>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const subject = `สรุปผลการตรวจสอบ ${formTypeLabel} - ${jobNo} | ${branchName}`;

    // Send to all recipients
    for (const email of recipientEmails) {
      const message = [
        `From: PTEC Audit System <${from}>`,
        `To: ${email}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
        '',
        htmlContent,
      ].join('\n');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage },
      });

      console.log(`✓ Summary email sent to: ${email}`);
    }

    console.log(
      `Sent combined summary email (${auditComments.length} audit + ${otherComments.length} other comments) to ${recipientEmails.length} recipients`,
    );
  }

  // Helper methods
  private getItemStatusBadge(status: number | null): string {
    const badges: Record<number, { bg: string; color: string; label: string }> =
      {
        1: { bg: '#DCFCE7', color: '#166534', label: 'ปกติ' },
        2: { bg: '#FEF9C3', color: '#854D0E', label: 'อยู่ระหว่างดำเนินการ' },
        3: { bg: '#FEE2E2', color: '#991B1B', label: 'ผิดปกติ' },
        4: { bg: '#E2E8F0', color: '#475569', label: 'ปิดเคส' },
      };
    const s = status !== null && status !== undefined ? badges[status] : null;
    const bg = s?.bg ?? '#F1F5F9';
    const color = s?.color ?? '#64748B';
    const label = s?.label ?? '-';
    return `<span style="display:inline-block; background-color:${bg}; color:${color}; font-size:12px; font-weight:600; padding:4px 10px; border-radius:12px;">${label}</span>`;
  }

  private getAuditItemStatusBadge(status: number | null): string {
    const badges: Record<number, { bg: string; color: string; label: string }> =
      {
        2: { bg: '#FEF9C3', color: '#854D0E', label: '⚠ อยู่ระหว่างดำเนินการ' },
        4: { bg: '#E2E8F0', color: '#475569', label: '● ปิดเคส' },
      };
    const s = status !== null && status !== undefined ? badges[status] : null;
    const bg = s?.bg ?? '#F1F5F9';
    const color = s?.color ?? '#64748B';
    const label = s?.label ?? '○ ยังไม่ตรวจ';
    return `<span style="display:inline-block; background-color:${bg}; color:${color}; font-size:12px; font-weight:600; padding:4px 10px; border-radius:12px;">${label}</span>`;
  }

  private getAMChecklistBadge(status: number | null): string {
    const badges: Record<number, { bg: string; color: string; label: string }> =
      {
        1: { bg: '#FEF9C3', color: '#854D0E', label: 'รอตรวจสอบ' },
        2: { bg: '#DCFCE7', color: '#166534', label: 'ผ่าน' },
        3: { bg: '#FEE2E2', color: '#991B1B', label: 'ไม่ผ่าน' },
        4: { bg: '#FEF3C7', color: '#92400E', label: 'ต้องแก้ไข' },
      };
    const s = status !== null && status !== undefined ? badges[status] : null;
    const bg = s?.bg ?? '#F1F5F9';
    const color = s?.color ?? '#64748B';
    const label = s?.label ?? '○ ยังไม่เช็ค';
    return `<span style="display:inline-block; background-color:${bg}; color:${color}; font-size:12px; font-weight:600; padding:4px 10px; border-radius:12px;">${label}</span>`;
  }
}
