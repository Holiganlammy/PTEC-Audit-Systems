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
import { AMItemAACommentService } from '../service/am-item-aa-comment.service';
import {
  CreateCommentDto,
  UpdateCommentDto,
  ApproveCommentDto,
} from '../dto/comment.dto';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';
import { AMItemsService } from '../service/am-item.service';
import { AAJobsService } from '../service/aa-job.service';
import { AuditCommentApprovalGmailApiService } from '../../email/audit-comment-approval-gmail-api.service';

@Controller('am-items')
export class AMItemAACommentController {
  constructor(
    private readonly aaCommentService: AMItemAACommentService,
    private readonly userRightService: UserRightService,
    private readonly auditItemsService: AMItemsService,
    private readonly aaJobsService: AAJobsService,
    private readonly auditCommentApprovalGmailService: AuditCommentApprovalGmailApiService,
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

  @Post(':itemId/aa-comments')
  async create(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() createDto: CreateCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      createDto.itemId = itemId;
      const comment = await this.aaCommentService.create(createDto);

      if (createDto.approverStatus === 0) {
        try {
          const commenterData = await this.getUserData(createDto.userId);
          if (commenterData && commenterData.empUpperId) {
            const approverData = await this.getUserData(
              commenterData.empUpperId,
            );
            if (approverData && approverData.email) {
              const item = await this.auditItemsService.findOne(itemId);
              const job = await this.aaJobsService.findOne(item.jobId);
              await this.auditCommentApprovalGmailService.sendCommentApprovalEmail(
                {
                  approverEmail: approverData.email,
                  approverFullname: approverData.fullname,
                  commenterFullname: commenterData.fullname,
                  commenterPosition: commenterData.position,
                  commentText: createDto.note,
                  jobNo: job.jobNo,
                  categoryName: item.categoryItem?.categoryName || '-',
                  itemId,
                  formType: 'AA',
                },
              );
              console.log(`✓ AA approval email sent to ${approverData.email}`);
            }
          }
        } catch (emailError) {
          console.error('Error sending AA approval email:', emailError);
        }
      }

      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: comment,
        message: 'AA comment created successfully',
      });
    } catch (error) {
      console.error('Error creating AA comment:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error creating AA comment',
      });
    }
  }

  @Get(':itemId/aa-comments')
  async findByItemId(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() res: express.Response,
  ) {
    try {
      const comments = await this.aaCommentService.findByItemId(itemId);
      const enriched = await Promise.all(
        comments.map(async (detail) => {
          const { aaDetailId, userId, approverBy, ...rest } = detail;
          const [OwnerCommentUser, approverByUserData] = await Promise.all([
            this.getUserData(userId),
            this.getUserData(approverBy),
          ]);

          const isApprovalComment = detail.approverStatus !== null;
          const requireApprovalFrom =
            isApprovalComment && OwnerCommentUser?.empUpperId
              ? await this.getUserData(OwnerCommentUser.empUpperId)
              : null;

          const result: Record<string, unknown> = {
            ...rest,
            aaDetailId,
            isApprovalComment,
            isPendingApproval: detail.approverStatus === 0,
            OwnerCommentUser,
            approverByUser: approverByUserData,
          };

          if (isApprovalComment) {
            result.requireApprovalFrom = requireApprovalFrom;
          }

          return result;
        }),
      );
      return res.status(HttpStatus.OK).json({ success: true, data: enriched });
    } catch (error) {
      console.error('Error fetching AA comments:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching AA comments',
      });
    }
  }

  @Put(':itemId/aa-comments/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      const comment = await this.aaCommentService.update(id, updateDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: comment,
        message: 'AA comment updated successfully',
      });
    } catch (error) {
      console.error('Error updating AA comment:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error updating AA comment',
      });
    }
  }

  @Patch(':itemId/aa-comments/:id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() approveDto: ApproveCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      const comment = await this.aaCommentService.approve(id, approveDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: comment,
        message: 'AA comment approval updated successfully',
      });
    } catch (error) {
      console.error('Error approving AA comment:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error approving AA comment',
      });
    }
  }

  @Delete(':itemId/aa-comments/:id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body('updatedBy', ParseIntPipe) updatedBy: number,
    @Body('deletedReason') deletedReason: string,
    @Res() res: express.Response,
  ) {
    try {
      await this.aaCommentService.remove(id, updatedBy, deletedReason);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'AA comment deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting AA comment:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error deleting AA comment',
      });
    }
  }
}
