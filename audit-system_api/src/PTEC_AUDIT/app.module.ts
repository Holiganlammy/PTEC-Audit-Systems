import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './controller/menu-audit.controller';
import { AppService } from './service/menu-audit.service';
import { AuthMiddleware } from '../auth/auth.middleware';
import { MenuAudit } from './domain/model/menu-audit.entity';
import { MenuAuditPermission } from './domain/model/menu-audit-permission.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
// Entities
import { AuditJobsHeader } from './domain/model/audit.jobs-header.entity';
import { AuditItem } from './domain/model/audit-item.entity';
import { AuditCategoryItem } from './domain/model/audit-category-item.entity';
import { AuditStatus } from './domain/model/audit-status.entity';
import { AuditItemAMDetail } from './domain/model/audit-item-am-detail.entity';
import { AuditItemAuditDetail } from './domain/model/audit-item-audit-detail.entity';
import { AuditItemRelatedAgency } from './domain/model/audit-related-agency.entity';
import { AuditItemRelatedAgencyUser } from './domain/model/audit-related-agency-user.entity';
import { DatabaseManagerModule } from 'src/database/database-manager.module';
// Services
import { AuditJobsService } from './service/audit-job.service';
import { AuditItemsService } from './service/audit-item.service';
import { CategoryItemsService } from './service/category-items.service';

// Controllers
import { AuditJobsController } from './controller/audit-job.controller';
import { AuditItemsController } from './controller/audit-item.controller';
import { CategoryItemsController } from './controller/category-items.controller';
import { PTEC_USERRIGHT_Module } from '../PTEC_USERIGHT/app.module';

@Module({
  controllers: [
    AppController,
    AuditJobsController,
    AuditItemsController,
    CategoryItemsController,
  ],
  imports: [
    TypeOrmModule.forFeature([
      MenuAudit,
      MenuAuditPermission,
      AuditJobsHeader,
      AuditItem,
      AuditCategoryItem,
      AuditStatus,
      AuditItemAMDetail,
      AuditItemAuditDetail,
      AuditItemRelatedAgency,
      AuditItemRelatedAgencyUser,
    ]),
    DatabaseManagerModule,
    PTEC_USERRIGHT_Module,
  ],
  providers: [
    AppService,
    AuditJobsService,
    AuditItemsService,
    CategoryItemsService,
  ],
})
export class PTEC_AUDIT_Module implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
