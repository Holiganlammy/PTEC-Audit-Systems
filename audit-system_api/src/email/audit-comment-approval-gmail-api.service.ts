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
export class AuditCommentApprovalGmailApiService {
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
      cid: string;
    }>;
  }) {
    const gmail = this.getGmailClient();

    const fromEmail =
      process.env.Email || process.env.EMAIL_FROM || 'no-reply@example.com';

    const boundary = '----=_Part_' + Date.now();

    let rawMessage = [
      `From: PTEC Audit System <${fromEmail}>`,
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

    // Add inline attachments
    if (params.attachments && params.attachments.length > 0) {
      for (const attachment of params.attachments) {
        try {
          const fileContent = fs.readFileSync(attachment.path);
          const base64Content = fileContent.toString('base64');

          rawMessage += `\n--${boundary}\n`;
          rawMessage += `Content-Type: image/png; name="${attachment.filename}"\n`;
          rawMessage += `Content-Transfer-Encoding: base64\n`;
          rawMessage += `Content-ID: <${attachment.cid}>\n`;
          rawMessage += `Content-Disposition: inline; filename="${attachment.filename}"\n`;
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
   * ส่งเมลแจ้งเตือนผู้อนุมัติเมื่อมี Comment ที่ต้องอนุมัติ
   * @param params - ข้อมูลสำหรับส่งเมล
   */
  async sendCommentApprovalEmail(params: {
    approverEmail: string;
    approverFullname: string;
    commenterFullname: string;
    commenterPosition?: string;
    commentText: string;
    jobNo: string;
    categoryName: string;
    itemId: number;
    commentUrl?: string;
  }) {
    const approverName = params.approverFullname?.trim() || 'ผู้อนุมัติ';
    const commenterName = params.commenterFullname?.trim() || 'ผู้ใช้งาน';
    const commenterPosition = params.commenterPosition?.trim() || '';
    const commentText = params.commentText?.trim() || '-';
    const jobNo = params.jobNo?.trim() || '-';
    const categoryName = params.categoryName?.trim() || '-';
    const itemId = params.itemId || 0;

    // Build comment URL
    const baseUrl = process.env.FRONTEND_URL || 'https://audit.purethai.co.th';
    const commentUrl =
      params.commentUrl ||
      `${baseUrl}/audit/edit_document?jobNo=${jobNo}#item-${itemId}`;

    // Logo path
    const logoPath = path.resolve(process.cwd(), 'src/images/Header_Mail.png');

    const subject = `[PTEC Audit] รออนุมัติ Comment: ${jobNo}`;

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
            <td style="background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); padding: 24px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: bold;">🔔 รออนุมัติ Comment</h1>
              <p style="margin: 6px 0 0; color: #FEE2E2; font-size: 13px;">PTEC Audit System</p>
            </td>
          </tr>
 
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 24px; font-size: 16px; color: #1F2937;">
                เรียน <strong>${approverName}</strong>
              </p>
 
              <!-- Message -->
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
                มี Comment ที่ต้องการการอนุมัติจากท่าน<br/>
                <strong>${commenterName}</strong>${commenterPosition ? ` (${commenterPosition})` : ''} ได้ Comment ในรายการตรวจสอบ
              </p>
 
              <!-- Comment Box -->
              <div style="background-color: #F9FAFB; border-left: 4px solid #DC2626; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #6B7280; font-weight: 600; margin-bottom: 8px;">Comment:</p>
                <p style="margin: 0; font-size: 14px; color: #1F2937; line-height: 1.5;">"${commentText}"</p>
              </div>
 
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
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">รายการ:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${categoryName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Comment โดย:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">${commenterName}${commenterPosition ? ` (${commenterPosition})` : ''}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
 
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${commentUrl}" 
                       style="display: inline-block; padding: 12px 32px; background-color: #DC2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                      ตรวจสอบและอนุมัติ
                    </a>
                  </td>
                </tr>
              </table>
 
              <!-- Additional Info -->
              <p style="margin: 0; font-size: 14px; color: #6B7280; line-height: 1.5;">
                กรุณาเข้าสู่ระบบและพิจารณาอนุมัติ Comment นี้ในโอกาสแรก
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
        to: params.approverEmail,
        subject,
        html,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      console.log(`✓ Approval email sent to ${params.approverEmail}`);
    } catch (error) {
      console.error(
        `✗ Failed to send approval email to ${params.approverEmail}:`,
        error,
      );
      throw error;
    }
  }
}
