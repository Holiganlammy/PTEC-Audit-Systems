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
  HttpStatus,
  Res,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import express from 'express';
import { AuditCategoryService } from '../service/audit-category.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../service/audit-category.service';

@Controller('audit-categories')
export class AuditCategoryController {
  constructor(private readonly categoryService: AuditCategoryService) {}

  // GET /audit-categories - Get all categories with pagination
  @Get()
  async findAll(
    @Res() res: express.Response,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('positionType') positionType?: string,
  ) {
    try {
      const result = await this.categoryService.findAll({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        search: search || undefined,
        positionType: positionType || undefined,
      });
      return res.status(HttpStatus.OK).json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching categories',
      });
    }
  }

  // GET /audit-categories/:id - Get single category
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      const category = await this.categoryService.findOne(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: category,
      });
    } catch (error) {
      console.error('Error fetching category:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching category',
      });
    }
  }

  // POST /audit-categories - Create new category
  @Post()
  async create(
    @Body() createDto: CreateCategoryDto,
    @Res() res: express.Response,
  ) {
    try {
      const category = await this.categoryService.create(createDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: category,
        message: 'Category created successfully',
      });
    } catch (error) {
      console.error('Error creating category:', error);
      if (error instanceof ConflictException) {
        return res.status(HttpStatus.CONFLICT).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error creating category',
      });
    }
  }

  // PUT /audit-categories/:id - Update category
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCategoryDto,
    @Res() res: express.Response,
  ) {
    try {
      const category = await this.categoryService.update(id, updateDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: category,
        message: 'Category updated successfully',
      });
    } catch (error) {
      console.error('Error updating category:', error);
      if (error instanceof ConflictException) {
        return res.status(HttpStatus.CONFLICT).json({
          success: false,
          message: error.message,
        });
      }
      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error updating category',
      });
    }
  }

  // DELETE /audit-categories/:id - Soft delete
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Body('updatedBy', ParseIntPipe) updatedBy: number,
    @Res() res: express.Response,
  ) {
    try {
      await this.categoryService.remove(id, updatedBy);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error deleting category',
      });
    }
  }

  // DELETE /audit-categories/:id/hard - Hard delete
  @Delete(':id/hard')
  async hardDelete(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      await this.categoryService.delete(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Category permanently deleted',
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error deleting category',
      });
    }
  }
}
