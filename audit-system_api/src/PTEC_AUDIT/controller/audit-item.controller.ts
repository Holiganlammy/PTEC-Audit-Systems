import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Patch,
  HttpStatus,
  Res,
} from '@nestjs/common';
import express from 'express';
import { AuditItemsService } from '../service/audit-item.service';
import { CreateAuditItemDto } from '../dto/create-audit-item.dto';
import { UpdateAuditItemDto } from '../dto/update-audit-item.dto';
import { AuditItem } from '../domain/audit-item.entity';

@Controller('audit-items')
export class AuditItemsController {
  constructor(private readonly auditItemsService: AuditItemsService) {}

  // POST /audit-items - Create single audit item
  @Post()
  async create(
    @Body() createAuditItemDto: CreateAuditItemDto,
    @Res() res: express.Response,
  ) {
    try {
      const auditItem = await this.auditItemsService.create(createAuditItemDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: auditItem,
        message: 'Audit item created successfully',
      });
    } catch (error) {
      console.error('Error creating audit item:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error creating audit item',
      });
    }
  }

  // POST /audit-items/bulk - Create multiple audit items
  @Post('bulk')
  async createMany(
    @Body() createAuditItemDtos: CreateAuditItemDto[],
    @Res() res: express.Response,
  ) {
    try {
      const auditItems =
        await this.auditItemsService.createMany(createAuditItemDtos);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: auditItems,
        message: `${auditItems.length} audit items created successfully`,
      });
    } catch (error) {
      console.error('Error creating audit items:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error creating audit items',
      });
    }
  }

  // GET /audit-items - Get all audit items with filters
  @Get()
  async findAll(
    @Query('jobId') jobId?: string,
    @Query('categoryItemId') categoryItemId?: string,
    @Query('itemStatus') itemStatus?: string,
    @Query('active') active?: string,
    @Res() res?: express.Response,
  ) {
    try {
      const filters: Partial<AuditItem> = {};

      if (jobId !== undefined) filters.jobId = Number(jobId);
      if (categoryItemId !== undefined)
        filters.categoryItemId = Number(categoryItemId);
      if (itemStatus !== undefined) filters.itemStatus = Number(itemStatus);
      if (active !== undefined) filters.active = active === 'true';

      const auditItems = await this.auditItemsService.findAll(filters);
      return res?.status(HttpStatus.OK).json({
        success: true,
        data: auditItems,
      });
    } catch (error) {
      console.error('Error fetching audit items:', error);
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching audit items',
      });
    }
  }

  // GET /audit-items/:id - Get single audit item with all relations
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      const auditItem = await this.auditItemsService.findOne(id);
      if (!auditItem) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: `Audit item with ID ${id} not found`,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data: auditItem,
      });
    } catch (error) {
      console.error('Error fetching audit item:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching audit item',
      });
    }
  }

  // GET /audit-items/job/:jobId - Get all items for a job
  @Get('job/:jobId')
  async findByJobId(
    @Param('jobId', ParseIntPipe) jobId: number,
    @Res() res: express.Response,
  ) {
    try {
      const auditItems = await this.auditItemsService.findByJobId(jobId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: auditItems,
      });
    } catch (error) {
      console.error('Error fetching audit items by job ID:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching audit items by job ID',
      });
    }
  }

  // GET /audit-items/category/:categoryId - Get items by category
  @Get('category/:categoryId')
  async findByCategoryId(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Res() res: express.Response,
  ) {
    try {
      const auditItems =
        await this.auditItemsService.findByCategoryId(categoryId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: auditItems,
      });
    } catch (error) {
      console.error('Error fetching audit items by category ID:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching audit items by category ID',
      });
    }
  }

  // PUT /audit-items/:id - Update audit item
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAuditItemDto: UpdateAuditItemDto,
    @Res() res: express.Response,
  ) {
    try {
      const auditItem = await this.auditItemsService.update(
        id,
        updateAuditItemDto,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        data: auditItem,
        message: 'Audit item updated successfully',
      });
    } catch (error) {
      console.error('Error updating audit item:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error updating audit item',
      });
    }
  }

  // PATCH /audit-items/:id/status - Update item status only
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status', ParseIntPipe) status: number,
    @Res() res: express.Response,
  ) {
    try {
      const auditItem = await this.auditItemsService.updateStatus(id, status);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: auditItem,
        message: 'Audit item status updated successfully',
      });
    } catch (error) {
      console.error('Error updating audit item status:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error updating audit item status',
      });
    }
  }

  // DELETE /audit-items/:id - Soft delete
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      await this.auditItemsService.remove(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Audit item ${id} has been deactivated`,
      });
    } catch (error) {
      console.error('Error removing audit item:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error removing audit item',
      });
    }
  }

  // DELETE /audit-items/:id/hard - Hard delete
  @Delete(':id/hard')
  async hardDelete(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      await this.auditItemsService.delete(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Audit item ${id} has been permanently deleted`,
      });
    } catch (error) {
      console.error('Error deleting audit item:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error deleting audit item',
      });
    }
  }
}
