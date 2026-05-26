interface PdfFontDoc {
  addFileToVFS(filename: string, filedata: string): void;
  addFont(postScriptName: string, id: string, fontStyle: string): void;
  setFont(fontName: string): void;
}

export async function loadSarabunFont(doc: PdfFontDoc): Promise<boolean> {
  try {
    console.log('🔄 Loading Sarabun font...');
    
    // โหลดฟอนต์ Regular (Normal)
    const regularResponse = await fetch('/fonts/Sarabun-Regular.ttf');
    if (!regularResponse.ok) {
      throw new Error('Font file not found: /fonts/Sarabun-Regular.ttf');
    }
    
    const regularArrayBuffer = await regularResponse.arrayBuffer();
    const regularBase64 = arrayBufferToBase64(regularArrayBuffer);
    
    // เพิ่มฟอนต์ใน jsPDF
    doc.addFileToVFS('Sarabun-Regular.ttf', regularBase64);
    doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
    
    
    // พยายามโหลดฟอนต์ Bold (ถ้ามี)
    try {
      const boldResponse = await fetch('/fonts/Sarabun-Bold.ttf');
      if (boldResponse.ok) {
        const boldArrayBuffer = await boldResponse.arrayBuffer();
        const boldBase64 = arrayBufferToBase64(boldArrayBuffer);
        doc.addFileToVFS('Sarabun-Bold.ttf', boldBase64);
        doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold');
      }
    } catch (boldError) {
      console.warn('⚠️ Bold font not found, using regular font for bold text');
      // ใช้ regular font สำหรับ bold ถ้าไม่มีไฟล์ Bold
      doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'bold');
    }
    
    // ตั้งค่าให้ใช้ฟอนต์นี้เป็น default
    doc.setFont('Sarabun');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error loading Sarabun font:', error);
    console.warn('⚠️ Using fallback font (helvetica)');
    doc.setFont('helvetica');
    return false;
  }
}
 
/**
 * แปลง ArrayBuffer เป็น Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}