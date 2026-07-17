import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AuthMiddleware } from '../auth/auth.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
// Entities
import { AMJobHeader } from './domain/model/am.jobs-header.entity';
import { AAJobHeader } from './domain/model/aa.jobs-header.entity';
import { AMItem } from './domain/model/am-item.entity';
import { AuditCategoryItem } from './domain/model/audit-category-item.entity';
import { AMHeaderStatus } from './domain/model/am-status.entity';
import { AMItemAMComment } from './domain/model/am-item-am-comment.entity';
import { AMItemAMCheckerComment } from './domain/model/am-item-am-checker-comment.entity';
import { AMItemOtherComment } from './domain/model/am-item-other-comment.entity';
import { AMItemOtherCommentUsersTag } from './domain/model/am-item-other-comment-users-tag.entity';
import { AMItemAAComment } from './domain/model/am-item-aa-comment.entity';
import { DatabaseManagerModule } from '../database/database-manager.module';
import { AMFiles } from './domain/model/am-file.entity';
import { BranchAmScores } from './domain/model/branch_am_scores.entity';

// Services
import { AAJobsService } from './service/aa-job.service';
import { AMJobsService } from './service/audit-job.service';
import { AMItemsService } from './service/am-item.service';
import { CategoryItemsService } from './service/category-items.service';
import { AMItemAMCommentsService } from './service/am-item-am-comment.service';
import { AMItemAMCheckerCommentService } from './service/am-item-am-checker-comment.service';
import { AMItemAACommentService } from './service/am-item-aa-comment.service';
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
import { CommentReplyGmailApiService } from '../email/comment-reply-gmail-api.service';
import { FileAccessService } from './service/file-access.service';

// Controllers
import { AAJobsController } from './controller/aa-job.controller';
import { AuditJobsController } from './controller/audit-job.controller';
import { AMItemsController } from './controller/am-item.controller';
import { CategoryItemsController } from './controller/category-items.controller';
import { AMItemAMCommentsController } from './controller/am-item-am-comment.controller';
import { AMItemAMCheckerCommentController } from './controller/am-item-am-checker-comment.controller';
import { AMItemOtherCommentController } from './controller/am-item-other-comment.controller';
import { AMItemAACommentController } from './controller/am-item-aa-comment.controller';
import { AuditCategoryController } from './controller/audit-category.controller';
import { PTEC_USERRIGHT_Module } from '../PTEC_USERIGHT/app.module';
import { AuditItemOtherUserCommentTagController } from './controller/audit-item-audit-user-comment-tag.controller';
import { AMFilesController } from './controller/am-files.controller';
import { BranchAmScoresController } from './controller/branch-am-score.controller';
import { AuditEmailController } from './controller/audit-email.controller';
import { FileAccessController } from './controller/file-access.controller';

@Module({
  controllers: [
    AAJobsController,
    AuditJobsController,
    AMItemsController,
    CategoryItemsController,
    AMItemAMCommentsController,
    AMItemAMCheckerCommentController,
    AMItemAACommentController,
    AMItemOtherCommentController,
    AuditCategoryController,
    AuditItemOtherUserCommentTagController,
    AMFilesController,
    BranchAmScoresController,
    AuditEmailController,
    FileAccessController,
  ],
  imports: [
    TypeOrmModule.forFeature([
      AAJobHeader,
      AMJobHeader,
      AMItem,
      AuditCategoryItem,
      AMHeaderStatus,
      AMItemAMComment,
      AMItemAMCheckerComment,
      AMItemOtherComment,
      AMItemOtherCommentUsersTag,
      AMItemAAComment,
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
    AAJobsService,
    AMItemAMCommentsService,
    AMItemAMCheckerCommentService,
    AMItemAACommentService,
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
    CommentReplyGmailApiService,
    FileAccessService,
  ],
})
export class PTEC_AUDIT_AM_AA_Module implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
