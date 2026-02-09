import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './controller/menu-audit.controller';
import { AppService } from './service/menu-audit.service';
import { AuthMiddleware } from '../auth/auth.middleware';
import { MenuAudit } from './domain/menu-audit.entity';
import { MenuAuditPermission } from './domain/menu-audit-permission.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
// Entities
import { AuditJobsHeader } from './domain/audit.jobs-header.entity';
import { AuditItem } from './domain/audit-item.entity';
import { AuditCategoryItem } from './domain/audit-category-item.entity';
import { AuditStatus } from './domain/audit-status.entity';
import { AuditItemAMDetail } from './domain/audit-item-am-detail.entity';
import { AuditItemAuditDetail } from './domain/audit-item-audit-detail.entity';
import { AuditItemRelatedAgency } from './domain/audit-related-agency.entity';
import { AuditItemRelatedAgencyUser } from './domain/audit-related-agency-user.entity';
import { DatabaseManagerModule } from 'src/database/database-manager.module';
// Services
import { AuditJobsService } from './service/audit-job.service';
import { AuditItemsService } from './service/audit-item.service';
import { CategoryItemsService } from './service/category-items.service';

// Controllers
import { AuditJobsController } from './controller/audit-job.controller';
import { AuditItemsController } from './controller/audit-item.controller';
import { CategoryItemsController } from './controller/category-items.controller';

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
