// ป้องกัน HTML ที่ผู้ใช้พิมพ์ (comment/reply text ฯลฯ) หลุดออกจาก tag แล้วทำลาย markup ที่ตามมา
// (เช่น ปุ่ม CTA ที่อยู่ถัดไปในอีเมลกลายเป็นข้อความธรรมดาเพราะ tag ถูกตัดไปกลางคัน)
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
