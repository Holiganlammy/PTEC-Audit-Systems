// รายชื่อ usercode ที่อนุญาตให้ตอบกลับ (reply) comment ของตัวเองแล้วยังได้รับอีเมลแจ้งเตือน
// ปกติระบบจะไม่ส่งอีเมลถ้า reply เป็นของเจ้าของ comment เดิม (กันสแปมตัวเอง)
// ใส่ usercode ตรงนี้เพื่อยกเว้นไว้ใช้เทสเท่านั้น เช่น ['NPC001']
export const SELF_REPLY_TEST_USERCODES: string[] = [];

export function isSelfReplyTestUser(userCode?: string | null): boolean {
  if (!userCode) return false;
  return SELF_REPLY_TEST_USERCODES.includes(userCode);
}
