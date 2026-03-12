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
import { AuditItemAMDetailsService } from '../service/audit-item-am-detail.service';
import {
  CreateCommentDto,
  UpdateCommentDto,
  ApproveCommentDto,
} from '../dto/comment.dto';

@Controller('audit-items')
export class AuditItemAMDetailsController {
  constructor(private readonly amDetailsService: AuditItemAMDetailsService) {}

  // POST /audit-items/:itemId/am-details - Create AM comment
  @Post(':itemId/am-details')
  async create(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() createDto: CreateCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      createDto.itemId = itemId;
      const amDetail = await this.amDetailsService.create(createDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: amDetail,
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

  // GET /audit-items/:itemId/am-details - Get all AM comments
  @Get(':itemId/am-details')
  async findByItemId(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() res: express.Response,
  ) {
    try {
      const amDetails = await this.amDetailsService.findByItemId(itemId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: amDetails,
      });
    } catch (error) {
      console.error('Error fetching AM comments:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching AM comments',
      });
    }
  }

  // GET /audit-items/:itemId/am-details/pending - Get pending approvals
  @Get(':itemId/am-details/pending')
  async findPending(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() res: express.Response,
  ) {
    try {
      const amDetails = await this.amDetailsService.findPendingByItemId(itemId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: amDetails,
      });
    } catch (error) {
      console.error('Error fetching pending AM comments:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching pending AM comments',
      });
    }
  }

  // PUT /audit-items/:itemId/am-details/:id - Update AM comment
  @Put(':itemId/am-details/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      const amDetail = await this.amDetailsService.update(id, updateDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: amDetail,
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

  // PATCH /audit-items/:itemId/am-details/:id/approve - Approve/Reject
  @Patch(':itemId/am-details/:id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() approveDto: ApproveCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      const amDetail = await this.amDetailsService.approve(id, approveDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: amDetail,
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

  // DELETE /audit-items/:itemId/am-details/:id - Soft delete
  @Delete(':itemId/am-details/:id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body('updatedBy', ParseIntPipe) updatedBy: number,
    @Res() res: express.Response,
  ) {
    try {
      await this.amDetailsService.remove(id, updatedBy);
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
