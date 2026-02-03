import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export const databaseConfig = {
  database: process.env.DB_NAME_OF_USERS || '',
};
