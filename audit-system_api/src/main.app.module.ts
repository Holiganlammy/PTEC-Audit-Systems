import { Module } from '@nestjs/common';
import { PTEC_USERRIGHT_Module } from './PTEC_USERIGHT/app.module';
// import { PTEC_AUDIT_Module } from './PTEC_AUDIT/app.module';
// import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // PTEC_AUDIT_Module,
    PTEC_USERRIGHT_Module,
  ],
})
export class MainAppModule {}
