import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './controller/ptec_useright.controller';
import { AppService } from './service/ptec_useright.service';
// import { jwtConstants } from './config/jwt.config';
// import { JwtModule } from '@nestjs/jwt';
// import { ConfigModule } from '@nestjs/config';
// import { PassportModule } from '@nestjs/passport';
// import { JwtStrategy } from '../auth/jwt.strategy';
// import { APP_GUARD } from '@nestjs/core';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { redisProvider } from '../redis/redis.provider';
import { AuthMiddleware } from '../auth/auth.middleware';
import { DatabaseManagerModule } from 'src/database/database-manager.module';

@Module({
  imports: [DatabaseManagerModule],
  controllers: [AppController],
  providers: [AppService, redisProvider],
})
export class PTEC_USERRIGHT_Module implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
