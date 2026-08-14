import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  HttpStatus,
  Res,
} from '@nestjs/common';
import express from 'express';
import { AuditItemAMCommentsService } from '../service/audit-item-am-comment.service';
import {
  CreateCommentDto,
  UpdateCommentDto,
  ApproveCommentDto,
} from '../dto/comment.dto';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';
import { AuditCommentApprovalGmailApiService } from '../../email/audit-comment-approval-gmail-api.service';
import { CommentReplyGmailApiService } from '../../email/comment-reply-gmail-api.service';
import { isSelfReplyTestUser } from '../../email/self-reply-test-users';
import { AuditItemsService } from '../service/audit-item.service';
import { AuditJobsService } from '../service/audit-job.service';

@Controller('audit-items')
export class AuditItemAMCommentsController {
  constructor(
    private readonly amCommentsService: AuditItemAMCommentsService,
    private readonly userRightService: UserRightService,
    private readonly auditCommentApprovalGmailService: AuditCommentApprovalGmailApiService,
    private readonly commentReplyGmailService: CommentReplyGmailApiService,
    private readonly auditItemsService: AuditItemsService,
    private readonly auditJobsService: AuditJobsService,
  ) {}

  private async getUserData(userId: number | null) {
    if (!userId) return null;
    try {
      const users = await this.userRightService.getUsersFromProcedure(
        null,
        userId,
      );
      if (users && users.length > 0) {
        const user = users[0];
        return {
          userCode: user.UserCode,
          fullname: user.fristName ? user.fristName + ' ' + user.lastName : '',
          email: user.Email,
          position: user.Position,
          branchId: user.BranchID,
          empUpperId: user.EmpUpperID ? Number(user.EmpUpperID) : null,
        };
      }
    } catch (error) {
      console.error(`Error fetching user data for userId ${userId}:`, error);
      return null;
    }
  }
  // POST /audit-items/:itemId/am-comments - Create AM comment
  @Post(':itemId/am-comments')
  async create(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() createDto: CreateCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      createDto.itemId = itemId;
      const amComment = await this.amCommentsService.create(createDto);
      if (createDto.approverStatus === 0) {
        try {
          const commenterData = await this.getUserData(createDto.userId);

          if (commenterData && commenterData.empUpperId) {
            const approverData = await this.getUserData(
              commenterData.empUpperId,
            );

            if (approverData && approverData.email) {
              const item = await this.auditItemsService.findOne(itemId);
              const job = await this.auditJobsService.findOne(item.jobId);

              await this.auditCommentApprovalGmailService.sendCommentApprovalEmail(
                {
                  approverEmail: approverData.email,
                  approverFullname: approverData.fullname,
                  commenterFullname: commenterData.fullname,
                  commenterPosition: commenterData.position,
                  commentText: createDto.note,
                  jobNo: job.jobNo,
                  categoryName: item.categoryItem?.categoryName || '-',
                  itemId: itemId,
                },
              );

              console.log(`✓ AM approval email sent to ${approverData.email}`);
            }
          }
        } catch (emailError) {
          console.error('Error sending approval email:', emailError);
        }
      }

      // ==================== ส่งเมลแจ้งเจ้าของ comment เมื่อมีการ reply ====================
      if (createDto.replyToId) {
        try {
          const parentComment = await this.amCommentsService.findOne(
            createDto.replyToId,
          );

          if (parentComment) {
            const replierData = await this.getUserData(createDto.userId);
            const isSelfReply = parentComment.userId === createDto.userId;

            if (!isSelfReply || isSelfReplyTestUser(replierData?.userCode)) {
              const repliedToData = isSelfReply
                ? replierData
                : await this.getUserData(parentComment.userId);

              if (repliedToData?.email) {
                const item = await this.auditItemsService.findOne(itemId);
                const job = await this.auditJobsService.findOne(item.jobId);

                await this.commentReplyGmailService.sendCommentReplyEmail({
                  to: repliedToData.email,
                  repliedToFullname: repliedToData.fullname,
                  replierFullname: replierData?.fullname,
                  originalCommentText: parentComment.note,
                  replyText: createDto.note,
                  itemId,
                  itemName: item.categoryItem?.categoryName,
                  jobNo: job.jobNo,
                  branchName: item.job?.branchName,
                  formType: 'Audit',
                });

                console.log(
                  `✓ Comment reply email sent to ${repliedToData.email}`,
                );
              }
            }
          }
        } catch (replyEmailError) {
          console.error('Error sending comment reply email:', replyEmailError);
        }
      }

      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: amComment,
        message: 'AM comment created successfully',
      });
    } catch (error) {
      console.error('Error creating AM comment:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error creating AM comment',
      });
    }
  }

  // GET /audit-items/:itemId/am-comments - Get all AM comments
  @Get(':itemId/am-comments')
  async findByItemId(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() res: express.Response,
  ) {
    try {
      const amComments = await this.amCommentsService.findByItemId(itemId);
      const enriched = await Promise.all(
        amComments.map(async (comment) => {
          const { userId, approverBy, ...rest } = comment;
          const [OwnerCommentUser, approverByUserData] = await Promise.all([
            this.getUserData(userId),
            this.getUserData(approverBy),
          ]);

          // approverStatus: null = comment ธรรมดา, 0 = รออนุมัติ, อื่นๆ = อนุมัติแล้ว
          const isApprovalComment = comment.approverStatus !== null;
          const isPendingApproval = comment.approverStatus === 0;

          const requireApprovalFrom =
            isApprovalComment && OwnerCommentUser?.empUpperId
              ? await this.getUserData(OwnerCommentUser.empUpperId)
              : null;

          const result: Record<string, unknown> = {
            ...rest,
            isApprovalComment,
            isPendingApproval,
            OwnerCommentUser,
            approverByUser: approverByUserData,
          };

          if (isApprovalComment) {
            result.requireApprovalFrom = requireApprovalFrom;
          }

          return result;
        }),
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        data: enriched,
      });
    } catch (error) {
      console.error('Error fetching AM comments:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching AM comments',
      });
    }
  }

  // GET /audit-items/:itemId/am-comments/pending - Get pending approvals
  @Get(':itemId/am-comments/pending')
  async findPending(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() res: express.Response,
  ) {
    try {
      const amComments =
        await this.amCommentsService.findPendingByItemId(itemId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: amComments,
      });
    } catch (error) {
      console.error('Error fetching pending AM comments:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching pending AM comments',
      });
    }
  }

  // PUT /audit-items/:itemId/am-comments/:id - Update AM comment
  @Put(':itemId/am-comments/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      const amComment = await this.amCommentsService.update(id, updateDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: amComment,
        message: 'AM comment updated successfully',
      });
    } catch (error) {
      console.error('Error updating AM comment:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error updating AM comment',
      });
    }
  }

  // PATCH /audit-items/:itemId/am-comments/:id/approve - Approve/Reject
  @Patch(':itemId/am-comments/:id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() approveDto: ApproveCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      const amComment = await this.amCommentsService.approve(id, approveDto);

      try {
        const requesterData = await this.getUserData(amComment.userId);
        if (requesterData?.email) {
          const approverData = await this.getUserData(approveDto.approverBy);
          const item = await this.auditItemsService.findOne(amComment.itemId);
          const job = await this.auditJobsService.findOne(item.jobId);

          await this.auditCommentApprovalGmailService.sendCommentApprovalResultEmail(
            {
              requesterEmail: requesterData.email,
              requesterFullname: requesterData.fullname,
              approverFullname: approverData?.fullname || '-',
              approverPosition: approverData?.position,
              resultStatus: approveDto.approverStatus,
              commentText: amComment.note,
              approverNote: approveDto.approverNote,
              jobNo: job.jobNo,
              categoryName: item.categoryItem?.categoryName || '-',
              itemId: amComment.itemId,
              formType: 'AM',
            },
          );

          console.log(
            `✓ AM approval result email sent to ${requesterData.email}`,
          );
        }
      } catch (emailError) {
        console.error('Error sending AM approval result email:', emailError);
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        data: amComment,
        message: 'AM comment approval updated successfully',
      });
    } catch (error) {
      console.error('Error approving AM comment:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error approving AM comment',
      });
    }
  }

  // DELETE /audit-items/:itemId/am-comments/:id - Soft delete
  @Delete(':itemId/am-comments/:id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body('updatedBy', ParseIntPipe) updatedBy: number,
    @Body('deletedReason') deletedReason: string,
    @Res() res: express.Response,
  ) {
    try {
      await this.amCommentsService.remove(id, updatedBy, deletedReason);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'AM comment deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting AM comment:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error deleting AM comment',
      });
    }
  }
}
