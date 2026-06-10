// send-mention-email.dto.ts

export interface MentionedUser {
  userId: string;
  userCode: string;
  fullname: string;
  email?: string;
}

export interface SendMentionEmailDto {
  mentionedUsers: MentionedUser[];
  commentText: string;
  senderName: string;
  itemId: number;
  threadType: number; // 1=Audit, 2=AM, 3=Other
  jobNo?: string;
  categoryName?: string;
  branchName?: string;
  itemStatus?: number; // 1=ปกติ, 2=อยู่ระหว่างดำเนินการ, 3=ผิดปกติ, 4=ปิดเคส
  amChecklistStatus?: number | null; // null=ยังไม่เช็ค, 1=รอตรวจสอบ, 2=ผ่าน, 3=ไม่ผ่าน, 4=ต้องแก้ไข
  auditChecked?: boolean; // Audit ตรวจแล้วหรือยัง
  auditDate?: string;
}
