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
import { AuditItemOtherDetailsService } from '../service/audit-item-other-detail.service';
import {
  CreateCommentDto,
  UpdateCommentDto,
  ApproveCommentDto,
} from '../dto/comment.dto';

@Controller('audit-items')
export class AuditItemOtherDetailsController {
  constructor(
    private readonly otherDetailsService: AuditItemOtherDetailsService,
  ) {}

  @Post(':itemId/other-details')
  async create(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() createDto: CreateCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      createDto.itemId = itemId;
      const otherDetail = await this.otherDetailsService.create(createDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: otherDetail,
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

  @Get(':itemId/other-details')
  async findByItemId(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() res: express.Response,
  ) {
    try {
      const otherDetails = await this.otherDetailsService.findByItemId(itemId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: otherDetails,
      });
    } catch (error) {
      console.error('Error fetching Other comments:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching Other comments',
      });
    }
  }

  @Put(':itemId/other-details/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      const otherDetail = await this.otherDetailsService.update(id, updateDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: otherDetail,
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

  @Patch(':itemId/other-details/:id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() approveDto: ApproveCommentDto,
    @Res() res: express.Response,
  ) {
    try {
      const otherDetail = await this.otherDetailsService.approve(
        id,
        approveDto,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        data: otherDetail,
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

  @Delete(':itemId/other-details/:id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body('updatedBy', ParseIntPipe) updatedBy: number,
    @Res() res: express.Response,
  ) {
    try {
      await this.otherDetailsService.remove(id, updatedBy);
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
