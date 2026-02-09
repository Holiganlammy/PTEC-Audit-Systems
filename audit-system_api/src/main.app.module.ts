import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PTEC_USERRIGHT_Module } from './PTEC_USERIGHT/app.module';
import { PTEC_AUDIT_Module } from './PTEC_AUDIT/app.module';
// import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
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
    }),
    PTEC_USERRIGHT_Module,
  ],
})
export class MainAppModule {}
