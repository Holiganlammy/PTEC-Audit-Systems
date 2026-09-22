// Version: 1.0.0 | ส่งเมลผ่าน Microsoft Graph API (แทน Gmail API เดิมทั้งหมด)
//
// ใช้ app-only (client credentials) auth — ต้องมี Azure AD App Registration ที่ได้รับสิทธิ์
// Microsoft Graph "Mail.Send" (Application permission, ผ่าน admin consent แล้ว) และผูกกับ
// mailbox ที่จะใช้เป็นผู้ส่ง (MS_GRAPH_SENDER_EMAIL)
//
// ตัวแปร env ที่ต้องตั้งค่า:
//   MS_GRAPH_TENANT_ID     - Azure AD Tenant ID
//   MS_GRAPH_CLIENT_ID     - App Registration Client ID
//   MS_GRAPH_CLIENT_SECRET - App Registration Client Secret
//   MS_GRAPH_SENDER_EMAIL  - mailbox ที่จะใช้ส่งเมล (เช่น audit-system@ptec.co.th)
import axios from 'axios';

export interface GraphInlineAttachment {
  /** ใช้ตรงกับ cid: ที่อ้างถึงใน HTML เช่น <img src="cid:header_logo" /> */
  cid: string;
  filename: string;
  contentType: string;
  /** เนื้อไฟล์แบบ base64 (ไม่ใส่ prefix data:...) */
  base64Content: string;
  /** true = แนบแบบ inline (โชว์ในเนื้อเมล เช่นโลโก้), false = แนบไฟล์ปกติ */
  isInline?: boolean;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

let cachedToken: CachedToken | null = null;

async function getGraphAccessToken(): Promise<string> {
  const now = Date.now();
  // เผื่อเวลาหมดอายุไว้ 60 วินาที กัน request หลุดกลางคัน
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.accessToken;
  }

  const tenantId = process.env.MS_GRAPH_TENANT_ID;
  const clientId = process.env.MS_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Missing Microsoft Graph mail env vars: MS_GRAPH_TENANT_ID / MS_GRAPH_CLIENT_ID / MS_GRAPH_CLIENT_SECRET',
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await axios.post<{
    access_token: string;
    expires_in: number;
  }>(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    params,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );

  cachedToken = {
    accessToken: response.data.access_token,
    expiresAt: now + response.data.expires_in * 1000,
  };

  return cachedToken.accessToken;
}

export async function sendMailViaGraph(params: {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: GraphInlineAttachment[];
}): Promise<void> {
  const senderEmail = process.env.MS_GRAPH_SENDER_EMAIL;
  if (!senderEmail) {
    throw new Error(
      'Missing Microsoft Graph mail env var: MS_GRAPH_SENDER_EMAIL',
    );
  }

  const toRecipients = (Array.isArray(params.to) ? params.to : [params.to])
    .filter((addr) => !!addr)
    .map((address) => ({ emailAddress: { address } }));

  if (toRecipients.length === 0) {
    throw new Error('sendMailViaGraph: no valid "to" recipient provided');
  }

  const accessToken = await getGraphAccessToken();

  const message = {
    subject: params.subject,
    body: {
      contentType: 'HTML',
      content: params.html,
    },
    toRecipients,
    attachments: (params.attachments ?? []).map((att) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: att.filename,
      contentType: att.contentType,
      contentBytes: att.base64Content,
      contentId: att.cid,
      isInline: att.isInline ?? true,
    })),
  };

  await axios.post(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
    { message, saveToSentItems: false },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );
}
