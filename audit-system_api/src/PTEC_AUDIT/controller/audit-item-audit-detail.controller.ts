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
import { AuditItemAuditDetailsService } from '../service/audit-item-audit-detail.service';
import {
  CreateCommentDto,
  UpdateCommentDto,
  ApproveCommentDto,
} from '../dto/comment.dto';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';

@Controller('audit-items')
export class AuditItemAuditDetailsController {
  constructor(
    private readonly auditDetailsService: AuditItemAuditDetailsService,
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
        };
      }
    } catch (error) {
      console.error(`Error fetching user data for userId ${userId}:`, error);
      return null;
    }
  }

  @Post(':itemId/audit-details')
  async create(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() createDto: CreateCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      createDto.itemId = itemId;
      const auditDetail = await this.auditDetailsService.create(createDto);
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

  @Get(':itemId/audit-details')
  async findByItemId(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() res: express.Response,
  ) {
    try {
      const auditDetails = await this.auditDetailsService.findByItemId(itemId);
      const enriched = await Promise.all(
        auditDetails.map(async (detail) => {
          const { userId, approverBy, ...rest } = detail;
          const [OwnerCommentUser, approverByUser] = await Promise.all([
            this.getUserData(userId),
            this.getUserData(approverBy),
          ]);
          return { ...rest, OwnerCommentUser, approverByUser };
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

  @Put(':itemId/audit-details/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      const auditDetail = await this.auditDetailsService.update(id, updateDto);
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

  @Patch(':itemId/audit-details/:id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() approveDto: ApproveCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      const auditDetail = await this.auditDetailsService.approve(
        id,
        approveDto,
      );
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

  @Delete(':itemId/audit-details/:id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body('updatedBy', ParseIntPipe) updatedBy: number,
    @Res() res: express.Response,
  ) {
    try {
      await this.auditDetailsService.remove(id, updatedBy);
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
