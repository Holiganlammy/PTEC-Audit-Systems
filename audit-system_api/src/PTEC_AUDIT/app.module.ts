import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './controller/menu-audit.controller';
import { AppService } from './service/menu-audit.service';
import { AuthMiddleware } from '../auth/auth.middleware';
import { MenuAudit } from './domain/model/menu-audit.entity';
import { MenuAuditPermission } from './domain/model/menu-audit-permission.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
// Entities
import { AuditJobsHeader } from './domain/model/audit.jobs-header.entity';
import { AuditItem } from './domain/model/audit-item.entity';
import { AuditCategoryItem } from './domain/model/audit-category-item.entity';
import { AuditHeaderStatus } from './domain/model/audit-status.entity';
import { AuditItemAMDetail } from './domain/model/audit-item-am-detail.entity';
import { AuditItemAuditDetail } from './domain/model/audit-item-audit-detail.entity';
import { AuditItemOtherDetails } from './domain/model/audit-item-other-details.entity';
import { AuditItemOtherDetailsUser } from './domain/model/audit-item-other-details-users.entity';
import { DatabaseManagerModule } from '../database/database-manager.module';
import { AuditFile } from './domain/model/audit-file.entity';
import { BranchAuditScores } from './domain/model/branch_audit_scores.entity';

// Services
import { AuditJobsService } from './service/audit-job.service';
import { AuditItemsService } from './service/audit-item.service';
import { CategoryItemsService } from './service/category-items.service';
import { AuditItemAMDetailsService } from './service/audit-item-am-detail.service';
import { AuditItemAuditDetailsService } from './service/audit-item-audit-detail.service';
import { AuditItemOtherDetailsService } from './service/audit-item-other-detail.service';
import { AuditCategoryService } from './service/audit-category.service';
import { AuditItemOtherUserDetailService } from './service/audit-item-other-user-detail.service';
import { AuditFilesService } from './service/audit-files.service';
import { BranchAuditScoreService } from './service/branch-audit-score.service';

// Controllers
import { AuditJobsController } from './controller/audit-job.controller';
import { AuditItemsController } from './controller/audit-item.controller';
import { CategoryItemsController } from './controller/category-items.controller';
import { AuditItemAMDetailsController } from './controller/audit-item-am-detail.controller';
import { AuditItemAuditDetailsController } from './controller/audit-item-audit-detail.controller';
import { AuditItemOtherDetailsController } from './controller/audit-item-other-detail.controller';
import { AuditCategoryController } from './controller/audit-category.controller';
import { PTEC_USERRIGHT_Module } from '../PTEC_USERIGHT/app.module';
import { AuditItemOtherUserDetailController } from './controller/audit-item-audit-user-detail.controller';
import { AuditFilesController } from './controller/audit-files.controller';
import { BranchAuditScoreController } from './controller/branch-audit-score.controller';

@Module({
  controllers: [
    AppController,
    AuditJobsController,
    AuditItemsController,
    CategoryItemsController,
    AuditItemAMDetailsController,
    AuditItemAuditDetailsController,
    AuditItemOtherDetailsController,
    AuditCategoryController,
    AuditItemOtherUserDetailController,
    AuditFilesController,
    BranchAuditScoreController,
  ],
  imports: [
    TypeOrmModule.forFeature([
      MenuAudit,
      MenuAuditPermission,
      AuditJobsHeader,
      AuditItem,
      AuditCategoryItem,
      AuditHeaderStatus,
      AuditItemAMDetail,
      AuditItemAuditDetail,
      AuditItemOtherDetails,
      AuditItemOtherDetailsUser,
      AuditFile,
      BranchAuditScores,
    ]),
    DatabaseManagerModule,
    PTEC_USERRIGHT_Module,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  providers: [
    AuditItemAMDetailsService,
    AuditItemAuditDetailsService,
    AuditItemOtherDetailsService,
    AuditCategoryService,
    AppService,
    AuditJobsService,
    AuditItemsService,
    CategoryItemsService,
    AuditItemOtherUserDetailService,
    AuditFilesService,
    BranchAuditScoreService,
  ],
})
export class PTEC_AUDIT_Module implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
