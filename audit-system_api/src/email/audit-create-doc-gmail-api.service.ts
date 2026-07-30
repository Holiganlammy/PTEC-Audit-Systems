// audit-create-doc-gmail-api.service.ts
// Service สำหรับส่งเมลแจ้งเตือนเมื่อสร้าง Audit Document ใหม่

import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';

interface GoogleCredentials {
  installed: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

interface GoogleToken {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

@Injectable()
export class AuditCreateDocGmailApiService {
  private buildBasePaths() {
    const credentialsPath =
      process.env.GOOGLE_GMAIL_CREDENTIALS_PATH ||
      path.resolve(process.cwd(), 'credentials.json');
    const tokenPath =
      process.env.GOOGLE_GMAIL_TOKEN_PATH ||
      path.resolve(process.cwd(), 'token.json');

    return { credentialsPath, tokenPath };
  }

  private getGmailClient() {
    const { credentialsPath, tokenPath } = this.buildBasePaths();

    const credentials: GoogleCredentials = JSON.parse(
      fs.readFileSync(credentialsPath, 'utf8'),
    ) as GoogleCredentials;
    const token: GoogleToken = JSON.parse(
      fs.readFileSync(tokenPath, 'utf8'),
    ) as GoogleToken;

    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris?.[0],
    );

    oAuth2Client.setCredentials(token);

    return google.gmail({ version: 'v1', auth: oAuth2Client });
  }

  private encodeSubjectUtf8Base64(subject: string) {
    return `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
  }

  private toBase64Url(rawMessage: string) {
    return Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async sendHtmlMail(params: {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
      filename: string;
      path: string;
      cid?: string;
      contentType?: string;
      disposition?: 'inline' | 'attachment';
    }>;
  }) {
    const gmail = this.getGmailClient();

    const fromEmail =
      process.env.Email || process.env.EMAIL_FROM || 'no-reply@example.com';

    const boundary = '----=_Part_' + Date.now();

    let rawMessage = [
      `From:PTEC Audit System <${fromEmail}>`,
      `To: ${params.to}`,
      `Subject: ${this.encodeSubjectUtf8Base64(params.subject)}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/related; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      params.html,
    ].join('\n');

    // Add attachments (inline images by default, or real attachments like PDFs)
    if (params.attachments && params.attachments.length > 0) {
      for (const attachment of params.attachments) {
        try {
          const fileContent = fs.readFileSync(attachment.path);
          const base64Content = fileContent.toString('base64');
          const contentType = attachment.contentType || 'image/png';
          const disposition = attachment.disposition || 'inline';

          rawMessage += `\n--${boundary}\n`;
          rawMessage += `Content-Type: ${contentType}; name="${attachment.filename}"\n`;
          rawMessage += `Content-Transfer-Encoding: base64\n`;
          if (attachment.cid) {
            rawMessage += `Content-ID: <${attachment.cid}>\n`;
          }
          rawMessage += `Content-Disposition: ${disposition}; filename="${attachment.filename}"\n`;
          rawMessage += '\n';
          rawMessage += base64Content;
        } catch (error) {
          console.error(`Error reading attachment ${attachment.path}:`, error);
        }
      }
    }

    rawMessage += `\n--${boundary}--`;

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: this.toBase64Url(rawMessage) },
    });
  }

  /**
   * ส่งเมลแจ้งเตือนเมื่อสร้าง Audit Document ใหม่
   * @param params - ข้อมูลสำหรับส่งเมล
   */
  async sendAuditJobCreatedEmail(params: {
    groupEmails: string[]; // ['ptaudit@rpcthai.com', 'groupssd@rpcthai.com']
    additionalRecipients: string[]; // ['swp@rpcthai.com']
    jobNo: string;
    branchName: string;
    auditDate: string;
    createdByFullname?: string;
    auditorFullname?: string;
    districtManagerFullname?: string;
    branchManagerFullname?: string;
    jobUrl?: string;
    additionalNotes?: string;
    branchAssignment?: string;
    formType?: string; // 'AM' | 'AA' | 'Audit'
  }) {
    const jobNo = params.jobNo?.trim() || '-';
    const branchName = params.branchName?.trim() || '-';
    const auditDate = params.auditDate?.trim() || '-';
    const createdBy = params.createdByFullname?.trim() || 'ผู้ใช้งานในระบบ';
    const auditorFullname = params.auditorFullname?.trim() || '-';
    const districtManagerFullname =
      params.districtManagerFullname?.trim() || '-';
    const branchManagerFullname = params.branchManagerFullname?.trim() || '-';
    const additionalNotes = params.additionalNotes?.trim() || '';
    const branchAssignment = params.branchAssignment?.trim() || '';
    const formType = params.formType?.toUpperCase() || 'Audit';

    const formTypeLabel =
      formType === 'AM'
        ? 'Area Manager (AM)'
        : formType === 'AA'
          ? 'Area Assistant (AA)'
          : 'Audit';

    // Labels สำหรับ personnel rows ในตาราง — เปลี่ยนตาม formType
    const auditorLabel =
      formType === 'AM'
        ? 'Area Manager (AM):'
        : formType === 'AA'
          ? 'Area Assistant (AA):'
          : 'ผู้ตรวจสอบ (Auditor):';

    const districtManagerLabel =
      formType === 'AM'
        ? 'Regional Manager (RM):'
        : formType === 'AA'
          ? 'Area Manager (AM):'
          : 'ผู้จัดการเขต (AM):';

    // Build job URL
    const baseUrl = process.env.FRONTEND_URL || 'https://audit.purethai.co.th';
    const defaultJobUrl =
      formType === 'AM' || formType === 'AA'
        ? `${baseUrl}/areamanage/edit_document?jobNo=${jobNo}&formType=${formType}`
        : `${baseUrl}/audit/edit_document?jobNo=${jobNo}`;
    const jobUrl = params.jobUrl || defaultJobUrl;

    // Logo path
    const logoPath = path.resolve(process.cwd(), 'src/images/Header_Mail.png');

    const subject = `เอกสาร ${formTypeLabel} ถูกสร้างใหม่: ${jobNo}`;

    // รวม recipients ทั้งหมด
    const allRecipients = [
      ...params.groupEmails,
      ...params.additionalRecipients,
    ];

    // ส่งเมลไปทีละคน
    for (const recipientEmail of allRecipients) {
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
              <h1 style="margin: 0; color: #000000; font-size: 22px; font-weight: bold;">แจ้งเตือนสร้างเอกสาร ${formTypeLabel}</h1>
              <p style="margin: 6px 0 0; color: #000000; font-size: 13px;">PTEC Audit System</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">

              <!-- Greeting -->
              <p style="margin: 0 0 24px; font-size: 16px; color: #1F2937;">
                เรียน <strong>ผู้รับผิดชอบที่เกี่ยวข้อง</strong>
              </p>

              <!-- Message -->
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
                มีเอกสาร ${formTypeLabel} ที่ต้องการความร่วมมือจากท่าน<br/>
                เอกสารนี้สร้างโดย <strong>${createdBy}</strong> กรุณาตรวจสอบและดำเนินการตามที่ได้รับมอบหมาย
              </p>

              <!-- Details Card -->
              <table role="presentation" style="width: 100%; border: 1px solid #E5E7EB; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px; background-color: #F9FAFB;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280; width: 140px;">เลขที่เอกสาร:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937; font-weight: 600;">${jobNo}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">สาขา:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${branchName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">วันที่ตรวจสอบ:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${auditDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">${auditorLabel}</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${auditorFullname}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">${districtManagerLabel}</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${districtManagerFullname}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">ผู้จัดการสาขา:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${branchManagerFullname}</td>
                      </tr>
                      ${
                        additionalNotes
                          ? `<tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">รายละเอียดเพิ่มเติม:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${additionalNotes}</td>
                      </tr>`
                          : ''
                      }
                      ${
                        branchAssignment
                          ? `<tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">มอบหมายงานให้สาขา:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${branchAssignment}</td>
                      </tr>`
                          : ''
                      }
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${jobUrl}"
                       style="display: inline-block; padding: 12px 32px; background-color: #1E40AF; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                      เปิดดูเอกสาร
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Additional Info -->
              <p style="margin: 0; font-size: 14px; color: #6B7280; line-height: 1.5;">
                กรุณาเข้าสู่ระบบและดำเนินการตามหน้าที่ที่ได้รับมอบหมาย หากมีข้อสงสัยกรุณาติดต่อผู้สร้างเอกสารโดยตรง
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

      // Check if logo exists
      const attachments: Array<{
        filename: string;
        path: string;
        cid: string;
      }> = [];
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

      try {
        await this.sendHtmlMail({
          to: recipientEmail,
          subject,
          html,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        console.log(`✓ Email sent to ${recipientEmail}`);
      } catch (error) {
        console.error(`✗ Failed to send email to ${recipientEmail}:`, error);
      }
    }
  }

  /**
   * ส่งเมลสรุปผลการตรวจไปยังสาขา พร้อมแนบไฟล์ PDF สรุปรายการ
   * (ส่งเพิ่มเติมจาก sendAuditJobCreatedEmail — ใช้เมื่อรายการตรวจทุกรายการปิดเคสแล้วเท่านั้น)
   */
  async sendBranchSummaryEmail(params: {
    to: string[];
    jobNo: string;
    branchName: string;
    auditDate: string;
    createdByFullname?: string;
    auditorFullname?: string;
    districtManagerFullname?: string;
    branchManagerFullname?: string;
    additionalNotes?: string;
    branchAssignment?: string;
    formType?: string; // 'AM' | 'AA' | 'Audit'
    pdfPath: string;
    pdfFilename: string;
  }) {
    const jobNo = params.jobNo?.trim() || '-';
    const branchName = params.branchName?.trim() || '-';
    const auditDate = params.auditDate?.trim() || '-';
    const createdBy = params.createdByFullname?.trim() || 'ผู้ใช้งานในระบบ';
    const auditorFullname = params.auditorFullname?.trim() || '-';
    const districtManagerFullname =
      params.districtManagerFullname?.trim() || '-';
    const branchManagerFullname = params.branchManagerFullname?.trim() || '-';
    const additionalNotes = params.additionalNotes?.trim() || '';
    const branchAssignment = params.branchAssignment?.trim() || '';
    const formType = params.formType?.toUpperCase() || 'Audit';

    const formTypeLabel =
      formType === 'AM'
        ? 'Area Manager (AM)'
        : formType === 'AA'
          ? 'Area Assistant (AA)'
          : 'Audit';

    const auditorLabel =
      formType === 'AM'
        ? 'Area Manager (AM):'
        : formType === 'AA'
          ? 'Area Assistant (AA):'
          : 'ผู้ตรวจสอบ (Auditor):';

    const districtManagerLabel =
      formType === 'AM'
        ? 'Regional Manager (RM):'
        : formType === 'AA'
          ? 'Area Manager (AM):'
          : 'ผู้จัดการเขต (AM):';

    const logoPath = path.resolve(process.cwd(), 'src/images/Header_Mail.png');

    const subject = `สรุปผลการตรวจ ${formTypeLabel} สาขา ${branchName}: ${jobNo}`;

    for (const recipientEmail of params.to) {
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
              <h1 style="margin: 0; color: #000000; font-size: 22px; font-weight: bold;">สรุปผลการตรวจ ${formTypeLabel}</h1>
              <p style="margin: 6px 0 0; color: #000000; font-size: 13px;">PTEC Audit System</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">

              <!-- Greeting -->
              <p style="margin: 0 0 24px; font-size: 16px; color: #1F2937;">
                เรียน <strong>สาขา ${branchName}</strong>
              </p>

              <!-- Message -->
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
                การตรวจสอบ ${formTypeLabel} ของสาขาท่านดำเนินการเสร็จสิ้นแล้ว<br/>
                กรุณาตรวจสอบรายละเอียดสรุปผลการตรวจตามไฟล์ PDF ที่แนบมาพร้อมนี้
              </p>

              <!-- Details Card -->
              <table role="presentation" style="width: 100%; border: 1px solid #E5E7EB; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px; background-color: #F9FAFB;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280; width: 140px;">เลขที่เอกสาร:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937; font-weight: 600;">${jobNo}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">สาขา:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${branchName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">วันที่ตรวจสอบ:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${auditDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">${auditorLabel}</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${auditorFullname}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">${districtManagerLabel}</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${districtManagerFullname}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">ผู้จัดการสาขา:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${branchManagerFullname}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">ผู้สร้างเอกสาร:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${createdBy}</td>
                      </tr>
                      ${
                        additionalNotes
                          ? `<tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">รายละเอียดเพิ่มเติม:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${additionalNotes}</td>
                      </tr>`
                          : ''
                      }
                      ${
                        branchAssignment
                          ? `<tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">มอบหมายงานให้สาขา:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${branchAssignment}</td>
                      </tr>`
                          : ''
                      }
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Additional Info -->
              <p style="margin: 0; font-size: 14px; color: #6B7280; line-height: 1.5;">
                กรุณาตรวจสอบไฟล์ PDF ที่แนบมาพร้อมเมลนี้เพื่อดูรายละเอียดสรุปผลการตรวจแบบเต็ม หากมีข้อสงสัยกรุณาติดต่อผู้ตรวจสอบโดยตรง
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

      const attachments: Array<{
        filename: string;
        path: string;
        cid?: string;
        contentType?: string;
        disposition?: 'inline' | 'attachment';
      }> = [];
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

      attachments.push({
        filename: params.pdfFilename,
        path: params.pdfPath,
        contentType: 'application/pdf',
        disposition: 'attachment',
      });

      try {
        await this.sendHtmlMail({
          to: recipientEmail,
          subject,
          html,
          attachments,
        });
        console.log(`✓ Branch summary email sent to ${recipientEmail}`);
      } catch (error) {
        console.error(
          `✗ Failed to send branch summary email to ${recipientEmail}:`,
          error,
        );
        throw error;
      }
    }
  }
}
