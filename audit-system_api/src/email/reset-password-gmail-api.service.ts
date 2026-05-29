// Version: 1.1.0 | Date: 2025-05-19 | Updated: Fixed layout to match Audit Comment Email style
import * as fs from 'fs';
import * as path from 'path';
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

export async function sendResetPasswordWithGmailAPI(
  to: string,
  fullname: string,
  resetLink: string,
) {
  const credentialsPath =
    process.env.GOOGLE_GMAIL_CREDENTIALS_PATH ||
    path.resolve(process.cwd(), 'credentials.json');
  const tokenPath =
    process.env.GOOGLE_GMAIL_TOKEN_PATH ||
    path.resolve(process.cwd(), 'token.json');

  const credentials: GoogleCredentials = JSON.parse(
    fs.readFileSync(credentialsPath, 'utf8'),
  ) as GoogleCredentials;
  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8')) as GoogleToken;

  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris?.[0],
  );

  oAuth2Client.setCredentials(token);
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

  const logoPath = path.resolve(process.cwd(), 'src/images/Header_Mail.png');
  const userName = fullname?.trim() || 'ผู้ใช้งาน';

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
          
          <!-- Header with Logo (Full Width - เหมือน Audit Comment) -->
          <tr>
            <td style="padding: 0; text-align: center; border-radius: 8px 8px 0 0; overflow: hidden;">
              <img src="cid:header_logo" alt="PTEC Audit System" style="width: 100%; max-width: 600px; height: auto; display: block; border: none;" />
            </td>
          </tr>

          <!-- Title Bar (สีน้ำเงิน) -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 24px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: bold;">คำขอรีเซ็ตรหัสผ่าน</h1>
              <p style="margin: 6px 0 0; color: rgba(255,255,255,0.8); font-size: 13px;">Password Reset Request</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 24px; font-size: 16px; color: #1F2937;">
                เรียน <strong>${userName}</strong>
              </p>

              <!-- Message -->
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #374151;">
                ระบบได้รับคำขอให้รีเซ็ตรหัสผ่านสำหรับบัญชีของท่าน<br/>
                หากท่านไม่ได้เป็นผู้ร้องขอ กรุณาเพิกเฉยต่ออีเมลฉบับนี้
              </p>

              <!-- Details Card (เหมือน Audit Comment) -->
              <table role="presentation" style="width: 100%; border: 1px solid #E5E7EB; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px; background-color: #F9FAFB;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280; width: 140px;">อีเมล:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937; font-weight: 600;">${to}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">หมดอายุใน:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #DC2626; font-weight: 600;">30 นาที</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">ใช้งานได้:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1F2937;">1 ครั้งเท่านั้น</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" 
                       style="display: inline-block; padding: 12px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                      รีเซ็ตรหัสผ่าน
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Warning Box (เหมือน Audit Comment - border-left) -->
              <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin-bottom: 24px; border-radius: 0 4px 4px 0;">
                <p style="margin: 0; font-size: 13px; color: #92400E; font-weight: 600;">⚠️ สำคัญ</p>
                <p style="margin: 6px 0 0; font-size: 12px; color: #92400E; line-height: 1.6;">
                  หากท่านไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้ รหัสผ่านของท่านจะไม่มีการเปลี่ยนแปลง
                </p>
              </div>

              <!-- Fallback Link -->
              <p style="margin: 0 0 6px; font-size: 12px; color: #9CA3AF;">
                หากปุ่มไม่สามารถใช้งานได้ ให้คัดลอกลิงก์ด้านล่างไปวางในเบราว์เซอร์:
              </p>
              <p style="font-size: 11px; color: #64748b; word-break: break-all; background-color: #f1f5f9; padding: 10px 14px; border-radius: 6px; margin: 0; font-family: 'Courier New', monospace;">
                ${resetLink}
              </p>

            </td>
          </tr>

          <!-- Footer (เหมือน Audit Comment) -->
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
</html>`;

  const subject = Buffer.from(
    'คำขอรีเซ็ตรหัสผ่าน - Audit Management System',
  ).toString('base64');

  // MIME multipart (เหมือน Audit Comment Email ทุกอย่าง)
  const boundary = '----=_Part_' + Date.now();

  let rawMessage = [
    `From: "PTEC Audit System" <${process.env.Email}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${subject}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/related; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    html,
  ].join('\n');

  // Attach Header Logo (เหมือน Audit Comment)
  try {
    if (fs.existsSync(logoPath)) {
      const fileContent = fs.readFileSync(logoPath);
      const base64Content = fileContent.toString('base64');

      rawMessage += `\n--${boundary}\n`;
      rawMessage += `Content-Type: image/png; name="Header_Mail.png"\n`;
      rawMessage += `Content-Transfer-Encoding: base64\n`;
      rawMessage += `Content-ID: <header_logo>\n`;
      rawMessage += `Content-Disposition: inline; filename="Header_Mail.png"\n`;
      rawMessage += '\n';
      rawMessage += base64Content;
    } else {
      console.warn(`Logo not found at: ${logoPath}`);
    }
  } catch (error) {
    console.error('Error reading logo file:', error);
  }

  rawMessage += `\n--${boundary}--`;

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage },
  });

  console.log(`ส่ง Reset Password ไปยัง ${to} สำเร็จ`);
}
