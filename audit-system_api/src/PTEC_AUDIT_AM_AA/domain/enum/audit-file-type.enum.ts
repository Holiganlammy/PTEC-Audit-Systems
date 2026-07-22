export enum AuditFileType {
  JOB_HEADER = 'job_header',
  // AAJobs_Header มี job_id เป็น auto-increment แยกจาก AMJobs_Header
  // ถ้าใช้ JOB_HEADER ร่วมกัน ไฟล์ของ AM job และ AA job ที่บังเอิญ job_id ตรงกันจะปนกัน
  AA_JOB_HEADER = 'aa_job_header',
  ITEM_ATTACHMENT = 'item_attachment',
  AM_CHECKLIST = 'am_checklist',
  AUDIT_REPORT = 'audit_report',
  SIGNATURE = 'signature',
  OTHER = 'other',
}
