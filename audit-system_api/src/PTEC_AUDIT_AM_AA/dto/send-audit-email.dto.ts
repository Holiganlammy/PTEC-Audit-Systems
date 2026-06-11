import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsObject,
} from 'class-validator';
export class SendAuditJobEmailDto {
  @IsNumber()
  jobId!: number;

  @IsOptional()
  @IsString({ each: true })
  groupEmails!: string[]; // ['ptaudit@rpcthai.com', 'groupssd@rpcthai.com']

  @IsOptional()
  @IsString({ each: true })
  additionalRecipients!: string[]; // ['swp@rpcthai.com']

  @IsString()
  jobNo!: string;

  @IsString()
  branchName!: string;

  @IsString()
  auditDate!: string;

  @IsOptional()
  @IsString()
  createdByFullname?: string;

  @IsOptional()
  @IsString()
  auditorFullname?: string;

  @IsOptional()
  @IsString()
  districtManagerFullname?: string;

  @IsOptional()
  @IsString()
  branchManagerFullname?: string;

  @IsOptional()
  @IsString()
  jobUrl?: string;

  @IsNumber()
  @IsOptional()
  userby!: number;

  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @IsOptional()
  @IsString()
  formType?: string; // 'AM' | 'AA' | 'Audit'
}

export class MentionedUserDto {
  @IsString()
  userId!: string;

  @IsString()
  userCode!: string;

  @IsString()
  fullname!: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export class SendMentionEmailDto {
  @IsArray()
  mentionedUsers!: MentionedUserDto[];

  @IsString()
  commentText!: string;

  @IsString()
  senderName!: string;

  @IsNumber()
  itemId!: number;

  @IsNumber()
  threadType!: number; // 1=Audit/AM-Checker/AA, 2=AM&RM/AM, 3=Other

  @IsOptional()
  @IsString()
  jobNo?: string;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsString()
  branchName?: string;

  @IsOptional()
  @IsNumber()
  itemStatus?: number; // 1=ปกติ, 2=อยู่ระหว่างดำเนินการ, 3=ผิดปกติ, 4=ปิดเคส

  @IsOptional()
  @IsNumber()
  amChecklistStatus?: number | null; // null=ยังไม่เช็ค, 1=รอตรวจสอบ, 2=ผ่าน, 3=ไม่ผ่าน, 4=ต้องแก้ไข

  @IsOptional()
  auditItemStatus?: boolean; // Audit ตรวจแล้วหรือยัง

  @IsOptional()
  @IsString()
  auditDate?: string;

  @IsOptional()
  @IsString()
  formType?: string; // 'AM' | 'AA' | 'Audit'
}
export class SendAuditSummaryEmailDto {
  @IsNumber()
  itemId!: number;

  @IsString()
  jobNo!: string;

  @IsString()
  branchName!: string;

  @IsArray()
  @IsString({ each: true })
  branchEmails!: string[];

  @IsOptional()
  @IsString()
  formType?: string; // 'AM' | 'AA' | 'Audit'

  @IsString()
  categoryName!: string;

  @IsOptional()
  @IsNumber()
  itemStatus!: number | null;

  @IsOptional()
  @IsNumber()
  amChecklistStatus!: number | null;

  @IsNumber()
  auditItemStatus!: number;

  @IsString()
  auditDate!: string;

  // Audit thread (ข้อความล่าสุด)
  @IsOptional()
  @IsObject()
  latestAuditComment?: {
    author: string;
    authorUserCode: string;
    text: string;
    createdAt: string;
  };

  // Other thread (ทุกข้อความ)
  @IsOptional()
  @IsArray()
  otherComments?: Array<{
    author: string;
    authorUserCode: string;
    text: string;
    createdAt: string;
  }>;
  auditComments: any;
}
