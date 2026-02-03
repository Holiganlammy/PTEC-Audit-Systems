import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export const jwtConstants = {
  secret: process.env.JWT_SECRET || '',
  expiresIn: '4h',
};
