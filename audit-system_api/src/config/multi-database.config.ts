import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export const defaultServerConfig = {
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME_OF_OPS || '',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};
