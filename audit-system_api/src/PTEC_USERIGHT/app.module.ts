import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './controller/ptec_useright.controller';
import { AppService } from './service/ptec_useright.service';
import { AuditUserRolesService } from './service/audit-user-roles.service';
// import { jwtConstants } from './config/jwt.config';
// import { JwtModule } from '@nestjs/jwt';
// import { ConfigModule } from '@nestjs/config';
// import { PassportModule } from '@nestjs/passport';
// import { JwtStrategy } from '../auth/jwt.strategy';
// import { APP_GUARD } from '@nestjs/core';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { redisProvider } from '../redis/redis.provider';
import { AuthMiddleware } from '../auth/auth.middleware';
import { DatabaseManagerModule } from '../database/database-manager.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditUserRoles } from '../PTEC_USERIGHT/domain/model/audit-user-roles.entity';
import { RoleSystemAudit } from '../PTEC_USERIGHT/domain/model/role-system-audit.entity';
import { AuditUserRolesController } from './controller/audit-user-roles.controller';

@Module({
  imports: [
    DatabaseManagerModule,
    TypeOrmModule.forFeature([AuditUserRoles, RoleSystemAudit]),
  ],
  controllers: [AppController, AuditUserRolesController],
  providers: [AppService, AuditUserRolesService, redisProvider],
  exports: [AppService, AuditUserRolesService],
})
export class PTEC_USERRIGHT_Module implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
