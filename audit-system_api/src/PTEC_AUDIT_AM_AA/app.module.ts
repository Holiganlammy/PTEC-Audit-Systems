import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AuthMiddleware } from '../auth/auth.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
// Entities
import { AMJobHeader } from './domain/model/am.jobs-header.entity';
import { AMItem } from './domain/model/am-item.entity';
import { AuditCategoryItem } from './domain/model/audit-category-item.entity';
import { AMHeaderStatus } from './domain/model/am-status.entity';
import { AMItemAMComment } from './domain/model/am-item-am-comment.entity';
import { AMItemAMCheckerComment } from './domain/model/am-item-am-checker-comment.entity';
import { AMItemOtherComment } from './domain/model/am-item-other-comment.entity';
import { AMItemOtherCommentUsersTag } from './domain/model/am-item-other-comment-users-tag.entity';
import { DatabaseManagerModule } from '../database/database-manager.module';
import { AMFiles } from './domain/model/am-file.entity';
import { BranchAmScores } from './domain/model/branch_am_scores.entity';

// Services
import { AMJobsService } from './service/audit-job.service';
import { AMItemsService } from './service/am-item.service';
import { CategoryItemsService } from './service/category-items.service';
import { AMItemAMCommentsService } from './service/am-item-am-comment.service';
import { AMItemAMCheckerCommentService } from './service/am-item-am-checker-comment.service';
import { AMItemOtherCommentService } from './service/am-item-other-comment.service';
import { AuditCategoryService } from './service/audit-category.service';
import { AMItemOtherUserCommentTagService } from './service/am-item-other-user-comment-tag.service';
import { AMFilesService } from './service/am-files.service';
import { BranchAmScoresService } from './service/branch-am-score.service';
import { TagOtherUserGmailApiService } from '../email/tag-other-user-gmail-api.service';
import { AuditCreateDocGmailApiService } from '../email/audit-create-doc-gmail-api.service';
import { AuditCommentApprovalGmailApiService } from '../email/audit-comment-approval-gmail-api.service';
import { MentionEmailService } from '../email/mention-comment-gmail.api.service';
import { AuditSummaryEmailService } from '../email/audit-sumary-comment-send-items.api.service';
import { DashboardService } from './service/dashboard.service';
import { FileAccessService } from './service/file-access.service';

// Controllers
import { AuditJobsController } from './controller/audit-job.controller';
import { AMItemsController } from './controller/am-item.controller';
import { CategoryItemsController } from './controller/category-items.controller';
import { AMItemAMCommentsController } from './controller/am-item-am-comment.controller';
import { AMItemAMCheckerCommentController } from './controller/am-item-am-checker-comment.controller';
import { AMItemOtherCommentController } from './controller/am-item-other-comment.controller';
import { AuditCategoryController } from './controller/audit-category.controller';
import { PTEC_USERRIGHT_Module } from '../PTEC_USERIGHT/app.module';
import { AuditItemOtherUserCommentTagController } from './controller/audit-item-audit-user-comment-tag.controller';
import { AMFilesController } from './controller/am-files.controller';
import { BranchAmScoresController } from './controller/branch-am-score.controller';
import { AuditEmailController } from './controller/audit-email.controller';
import { DashboardController } from './controller/dashboard.controller';
import { FileAccessController } from './controller/file-access.controller';

@Module({
  controllers: [
    AuditJobsController,
    AMItemsController,
    CategoryItemsController,
    AMItemAMCommentsController,
    AMItemAMCheckerCommentController,
    AMItemOtherCommentController,
    AuditCategoryController,
    AuditItemOtherUserCommentTagController,
    AMFilesController,
    BranchAmScoresController,
    AuditEmailController,
    FileAccessController,
    DashboardController,
  ],
  imports: [
    TypeOrmModule.forFeature([
      AMJobHeader,
      AMItem,
      AuditCategoryItem,
      AMHeaderStatus,
      AMItemAMComment,
      AMItemAMCheckerComment,
      AMItemOtherComment,
      AMItemOtherCommentUsersTag,
      AMFiles,
      BranchAmScores,
    ]),
    DatabaseManagerModule,
    PTEC_USERRIGHT_Module,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  providers: [
    AMItemAMCommentsService,
    AMItemAMCheckerCommentService,
    AMItemOtherCommentService,
    AuditCategoryService,
    AMJobsService,
    AMItemsService,
    CategoryItemsService,
    AMItemOtherUserCommentTagService,
    AMFilesService,
    BranchAmScoresService,
    TagOtherUserGmailApiService,
    AuditCreateDocGmailApiService,
    AuditCommentApprovalGmailApiService,
    MentionEmailService,
    AuditSummaryEmailService,
    DashboardService,
    FileAccessService,
  ],
  exports: [DashboardService],
})
export class PTEC_AUDIT_AM_AA_Module implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
