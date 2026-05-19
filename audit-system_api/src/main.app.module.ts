import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PTEC_USERRIGHT_Module } from './PTEC_USERIGHT/app.module';
import { PTEC_AUDIT_Module } from './PTEC_AUDIT/app.module';
// import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 60000, limit: 100 },
      { name: 'long', ttl: 3600000, limit: 1000 },
    ]),
    PTEC_AUDIT_Module,
    TypeOrmModule.forRoot({
      type: 'mssql',
      host: process.env.DB_SERVER,
      port: Number(process.env.DB_PORT) || 1433,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME_OF_AUDIT, // ใช้ database ของ audit
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // ห้าม true ใน production
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
      // logging: true,
    }),
    PTEC_USERRIGHT_Module,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class MainAppModule {}
