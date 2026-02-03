// src/redis/redis.provider.ts
import { Provider } from '@nestjs/common';
import { Redis } from 'ioredis';

export const redisProvider: Provider = {
  provide: 'REDIS',
  useFactory: () => {
    return new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      username: 'default',
      password: process.env.REDIS_PASSWORD,
    });
  },
};
