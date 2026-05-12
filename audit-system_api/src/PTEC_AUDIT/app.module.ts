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
import { AuditItemAMComment } from './domain/model/audit-item-am-comment.entity';
import { AuditItemAuditComment } from './domain/model/audit-item-audit-comment.entity';
import { AuditItemOtherComment } from './domain/model/audit-item-other-comment.entity';
import { AuditItemOtherCommentUserTag } from './domain/model/audit-item-other-comment-users-tag.entity';
import { DatabaseManagerModule } from '../database/database-manager.module';
import { AuditFiles } from './domain/model/audit-file.entity';
import { BranchAuditScores } from './domain/model/branch_audit_scores.entity';

// Services
import { AuditJobsService } from './service/audit-job.service';
import { AuditItemsService } from './service/audit-item.service';
import { CategoryItemsService } from './service/category-items.service';
import { AuditItemAMCommentsService } from './service/audit-item-am-comment.service';
import { AuditItemAuditCommentService } from './service/audit-item-audit-comment.service';
import { AuditItemOtherCommentService } from './service/audit-item-other-comment.service';
import { AuditCategoryService } from './service/audit-category.service';
import { AuditItemOtherUserCommentTagService } from './service/audit-item-other-user-comment-tag.service';
import { AuditFilesService } from './service/audit-files.service';
import { BranchAuditScoreService } from './service/branch-audit-score.service';
import { TagOtherUserGmailApiService } from '../email/tag-other-user-gmail-api.service';
import { AuditCreateDocGmailApiService } from '../email/audit-create-doc-gmail-api.service';
import { AuditCommentApprovalGmailApiService } from '../email/audit-comment-approval-gmail-api.service';
import { MentionEmailService } from '../email/mention-comment-gmail.api.service';
import { AuditSummaryEmailService } from '../email/audit-sumary-comment-send-items.api.service';

// Controllers
import { AuditJobsController } from './controller/audit-job.controller';
import { AuditItemsController } from './controller/audit-item.controller';
import { CategoryItemsController } from './controller/category-items.controller';
import { AuditItemAMCommentsController } from './controller/audit-item-am-comment.controller';
import { AuditItemAuditCommentController } from './controller/audit-item-audit-comment.controller';
import { AuditItemOtherCommentController } from './controller/audit-item-other-comment.controller';
import { AuditCategoryController } from './controller/audit-category.controller';
import { PTEC_USERRIGHT_Module } from '../PTEC_USERIGHT/app.module';
import { AuditItemOtherUserCommentTagController } from './controller/audit-item-audit-user-comment-tag.controller';
import { AuditFilesController } from './controller/audit-files.controller';
import { BranchAuditScoreController } from './controller/branch-audit-score.controller';
import { AuditEmailController } from './controller/audit-email.controller';

@Module({
  controllers: [
    AppController,
    AuditJobsController,
    AuditItemsController,
    CategoryItemsController,
    AuditItemAMCommentsController,
    AuditItemAuditCommentController,
    AuditItemOtherCommentController,
    AuditCategoryController,
    AuditItemOtherUserCommentTagController,
    AuditFilesController,
    BranchAuditScoreController,
    AuditEmailController,
  ],
  imports: [
    TypeOrmModule.forFeature([
      MenuAudit,
      MenuAuditPermission,
      AuditJobsHeader,
      AuditItem,
      AuditCategoryItem,
      AuditHeaderStatus,
      AuditItemAMComment,
      AuditItemAuditComment,
      AuditItemOtherComment,
      AuditItemOtherCommentUserTag,
      AuditFiles,
      BranchAuditScores,
    ]),
    DatabaseManagerModule,
    PTEC_USERRIGHT_Module,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  providers: [
    AuditItemAMCommentsService,
    AuditItemAuditCommentService,
    AuditItemOtherCommentService,
    AuditCategoryService,
    AppService,
    AuditJobsService,
    AuditItemsService,
    CategoryItemsService,
    AuditItemOtherUserCommentTagService,
    AuditFilesService,
    BranchAuditScoreService,
    TagOtherUserGmailApiService,
    AuditCreateDocGmailApiService,
    AuditCommentApprovalGmailApiService,
    MentionEmailService,
    AuditSummaryEmailService,
  ],
})
export class PTEC_AUDIT_Module implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
