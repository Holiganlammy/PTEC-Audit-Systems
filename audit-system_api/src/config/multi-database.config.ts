import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export const defaultServerConfig = {
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME_OF_OPS || '',
  // mssql package default คือ 15000ms ("Timeout: Request failed to complete in 15000ms")
  // ปรับเป็น 60 วินาที กัน query/stored procedure ที่ใช้เวลานาน (เช่น getUsersFromProcedure
  // ที่ดึง user ทั้งหมด) timeout ก่อนจะทำเสร็จ
  requestTimeout: 60000,
  connectionTimeout: 60000,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};
