import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { MainAppModule } from './main.app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(MainAppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: [
      'http://localhost:3000',
      // 'https://localhost:3000',
      // 'https://203.150.63.138:33002',
      // 'http://10.81.234.6:3000',
      // 'http://192.168.247.71:33002',
    ],
    credentials: true,
  });
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
void bootstrap();
