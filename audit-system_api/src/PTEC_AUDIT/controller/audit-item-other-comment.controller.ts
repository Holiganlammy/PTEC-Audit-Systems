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
import { AuditItemOtherCommentService } from '../service/audit-item-other-comment.service';
import {
  CreateCommentDto,
  UpdateCommentDto,
  ApproveCommentDto,
} from '../dto/comment.dto';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';
import { AuditJobsService } from '../service/audit-job.service';
import { AuditItemsService } from '../service/audit-item.service';
import { AuditCommentApprovalGmailApiService } from '../../email/audit-comment-approval-gmail-api.service';

@Controller('audit-items')
export class AuditItemOtherCommentController {
  constructor(
    private readonly otherCommentService: AuditItemOtherCommentService,
    private readonly userRightService: UserRightService,
    private readonly auditCommentApprovalGmailService: AuditCommentApprovalGmailApiService,
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

  @Post(':itemId/other-comments')
  async create(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() createDto: CreateCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      createDto.itemId = itemId;
      const otherComment = await this.otherCommentService.create(createDto);
      // ==================== ส่งเมลแจ้งเตือนผู้อนุมัติ ====================
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

              console.log(
                `✓ Other approval email sent to ${approverData.email}`,
              );
            }
          }
        } catch (emailError) {
          console.error('Error sending approval email:', emailError);
        }
      }
      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: otherComment,
        message: 'Other comment created successfully',
      });
    } catch (error) {
      console.error('Error creating Other comment:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error creating Other comment',
      });
    }
  }

  @Get(':itemId/other-comments')
  async findByItemId(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() res: express.Response,
  ) {
    try {
      const otherComments = await this.otherCommentService.findByItemId(itemId);
      const enriched = await Promise.all(
        otherComments.map(async (detail) => {
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
      console.error('Error fetching Other comments:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching Other comments',
      });
    }
  }

  // PUT /audit-items/:itemId/other-comments/:id - Update comment
  @Put(':itemId/other-comments/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      const otherComment = await this.otherCommentService.update(id, updateDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: otherComment,
        message: 'Other comment updated successfully',
      });
    } catch (error) {
      console.error('Error updating Other comment:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error updating Other comment',
      });
    }
  }

  @Patch(':itemId/other-comments/:id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() approveDto: ApproveCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      const otherComment = await this.otherCommentService.approve(
        id,
        approveDto,
      );

      try {
        const requesterData = await this.getUserData(otherComment.userId);
        if (requesterData?.email) {
          const approverData = await this.getUserData(approveDto.approverBy);
          const item = await this.auditItemsService.findOne(
            otherComment.itemId,
          );
          const job = await this.auditJobsService.findOne(item.jobId);

          await this.auditCommentApprovalGmailService.sendCommentApprovalResultEmail(
            {
              requesterEmail: requesterData.email,
              requesterFullname: requesterData.fullname,
              approverFullname: approverData?.fullname || '-',
              approverPosition: approverData?.position,
              resultStatus: approveDto.approverStatus,
              commentText: otherComment.note,
              approverNote: approveDto.approverNote,
              jobNo: job.jobNo,
              categoryName: item.categoryItem?.categoryName || '-',
              itemId: otherComment.itemId,
              formType: 'Other',
            },
          );

          console.log(
            `✓ Other approval result email sent to ${requesterData.email}`,
          );
        }
      } catch (emailError) {
        console.error('Error sending Other approval result email:', emailError);
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        data: otherComment,
        message: 'Other comment approval updated successfully',
      });
    } catch (error) {
      console.error('Error approving Other comment:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error approving Other comment',
      });
    }
  }

  // DELETE /audit-items/:itemId/other-comments/:id - Soft delete comment
  @Delete(':itemId/other-comments/:id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body('updatedBy', ParseIntPipe) updatedBy: number,
    @Body('deletedReason') deletedReason: string,
    @Res() res: express.Response,
  ) {
    try {
      await this.otherCommentService.remove(id, updatedBy, deletedReason);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Other comment deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting Other comment:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error deleting Other comment',
      });
    }
  }
}
