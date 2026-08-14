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
import { AMItemAMCheckerCommentService } from '../service/am-item-am-checker-comment.service';
import {
  CreateCommentDto,
  UpdateCommentDto,
  ApproveCommentDto,
} from '../dto/comment.dto';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';
import { AMItemsService } from '../service/am-item.service';
import { AuditCommentApprovalGmailApiService } from '../../email/audit-comment-approval-gmail-api.service';
import { CommentReplyGmailApiService } from '../../email/comment-reply-gmail-api.service';
import { isSelfReplyTestUser } from '../../email/self-reply-test-users';
import { AMJobsService } from '../service/audit-job.service';
import { AuditJobWithUsers } from '../domain/type/audit-job.interface';

@Controller('am-items')
export class AMItemAMCheckerCommentController {
  constructor(
    private readonly auditCommentService: AMItemAMCheckerCommentService,
    private readonly auditCommentApprovalGmailService: AuditCommentApprovalGmailApiService,
    private readonly commentReplyGmailService: CommentReplyGmailApiService,
    private readonly auditItemsService: AMItemsService,
    private readonly auditJobsService: AMJobsService,
    private readonly userRightService: UserRightService,
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

  @Post(':itemId/audit-comments')
  async create(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() createDto: CreateCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      createDto.itemId = itemId;
      const auditDetail = await this.auditCommentService.create(createDto);
      if (createDto.approverStatus === 0) {
        try {
          const commenterData = await this.getUserData(createDto.userId);
          if (commenterData && commenterData.empUpperId) {
            const approverData = await this.getUserData(
              commenterData.empUpperId,
            );

            if (approverData && approverData.email) {
              const item = await this.auditItemsService.findOne(itemId);
              const job: AuditJobWithUsers =
                await this.auditJobsService.findOne(item.jobId);
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
                  AuditCommentMail: true,
                  formType: 'AM',
                },
              );

              console.log(
                `✓ Audit approval email sent to ${approverData.email}`,
              );
            }
          }
        } catch (emailError) {
          console.error('Error sending approval email:', emailError);
        }
      }

      // ==================== ส่งเมลแจ้งเจ้าของ comment เมื่อมีการ reply ====================
      if (createDto.replyToId) {
        try {
          const parentComment = await this.auditCommentService.findOne(
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
                  formType: 'AM',
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
        data: auditDetail,
        message: 'Audit comment created successfully',
      });
    } catch (error) {
      console.error('Error creating Audit comment:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error creating Audit comment',
      });
    }
  }

  @Get(':itemId/audit-comments')
  async findByItemId(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() res: express.Response,
  ) {
    try {
      const auditDetails = await this.auditCommentService.findByItemId(itemId);
      const enriched = await Promise.all(
        auditDetails.map(async (detail) => {
          const { userId, approverBy, ...rest } = detail;
          const [OwnerCommentUser, approverByUserData] = await Promise.all([
            this.getUserData(userId),
            this.getUserData(approverBy),
          ]);

          // approverStatus: null = comment ธรรมดา, 0 = รออนุมัติ, อื่นๆ = อนุมัติแล้ว
          const isApprovalComment = detail.approverStatus !== null;
          const isPendingApproval = detail.approverStatus === 0;

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
      console.error('Error fetching Audit comments:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching Audit comments',
      });
    }
  }

  // PUT /audit-items/:itemId/audit-comments/:id - Update comment
  @Put(':itemId/audit-comments/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      const auditDetail = await this.auditCommentService.update(id, updateDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: auditDetail,
        message: 'Audit comment updated successfully',
      });
    } catch (error) {
      console.error('Error updating Audit comment:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error updating Audit comment',
      });
    }
  }

  @Patch(':itemId/audit-comments/:id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() approveDto: ApproveCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      const auditDetail = await this.auditCommentService.approve(
        id,
        approveDto,
      );

      try {
        const requesterData = await this.getUserData(auditDetail.userId);
        if (requesterData?.email) {
          const approverData = await this.getUserData(approveDto.approverBy);
          const item = await this.auditItemsService.findOne(auditDetail.itemId);
          const job = await this.auditJobsService.findOne(item.jobId);

          await this.auditCommentApprovalGmailService.sendCommentApprovalResultEmail(
            {
              requesterEmail: requesterData.email,
              requesterFullname: requesterData.fullname,
              approverFullname: approverData?.fullname || '-',
              approverPosition: approverData?.position,
              resultStatus: approveDto.approverStatus,
              commentText: auditDetail.note,
              approverNote: approveDto.approverNote,
              jobNo: job.jobNo,
              categoryName: item.categoryItem?.categoryName || '-',
              itemId: auditDetail.itemId,
              formType: 'Audit',
            },
          );

          console.log(
            `✓ Audit approval result email sent to ${requesterData.email}`,
          );
        }
      } catch (emailError) {
        console.error('Error sending Audit approval result email:', emailError);
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        data: auditDetail,
        message: 'Audit comment approval updated successfully',
      });
    } catch (error) {
      console.error('Error approving Audit comment:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error approving Audit comment',
      });
    }
  }

  // DELETE /audit-items/:itemId/audit-comments/:id - Soft delete comment
  @Delete(':itemId/audit-comments/:id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body('updatedBy', ParseIntPipe) updatedBy: number,
    @Body('deletedReason') deletedReason: string,
    @Res() res: express.Response,
  ) {
    try {
      await this.auditCommentService.remove(id, updatedBy, deletedReason);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Audit comment deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting Audit comment:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error deleting Audit comment',
      });
    }
  }
}
