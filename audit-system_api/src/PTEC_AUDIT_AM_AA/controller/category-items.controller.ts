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
} from '@nestjs/common';
import express from 'express';
import { CategoryItemsService } from '../service/category-items.service';
import { CreateCategoryItemDto } from '../dto/create-category-item.dto';
import { UpdateCategoryItemDto } from '../dto/update-category-item.dto';
// import { AuditCategoryItem } from '../domain/audit-category-item.entity';

@Controller('category-items')
export class CategoryItemsController {
  constructor(private readonly categoryItemsService: CategoryItemsService) {}

  // POST /category-items - Create new category
  @Post()
  async create(
    @Body() createCategoryItemDto: CreateCategoryItemDto,
    @Res() res: express.Response,
  ) {
    try {
      const categoryItem = await this.categoryItemsService.create(
        createCategoryItemDto,
      );
      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: categoryItem,
        message: 'Category item created successfully',
      });
    } catch (error) {
      console.error('Error creating category item:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error creating category item',
      });
    }
  }

  // GET /category-items - Get all categories
  @Get()
  async findAll(
    @Query('active') active?: string,
    @Res() res?: express.Response,
  ) {
    try {
      const activeOnly = active === undefined || active === 'true';
      const categoryItems = await this.categoryItemsService.findAll(activeOnly);
      return res?.status(HttpStatus.OK).json({
        success: true,
        data: categoryItems,
      });
    } catch (error) {
      console.error('Error fetching category items:', error);
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching category items',
      });
    }
  }

  // GET /category-items/search - Search categories by name
  @Get('search')
  async search(@Query('q') searchTerm: string, @Res() res: express.Response) {
    try {
      const categoryItems = await this.categoryItemsService.search(searchTerm);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: categoryItems,
      });
    } catch (error) {
      console.error('Error searching category items:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error searching category items',
      });
    }
  }

  // GET /category-items/:id - Get single category with items
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      const categoryItem = await this.categoryItemsService.findOne(id);
      if (!categoryItem) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: `Category item with ID ${id} not found`,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data: categoryItem,
      });
    } catch (error) {
      console.error('Error fetching category item:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching category item',
      });
    }
  }

  // GET /category-items/code/:code - Get category by code
  @Get('code/:code')
  async findByCode(
    @Param('code', ParseIntPipe) code: number,
    @Res() res: express.Response,
  ) {
    try {
      const categoryItem = await this.categoryItemsService.findByCode(code);
      if (!categoryItem) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: `Category item with code ${code} not found`,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data: categoryItem,
      });
    } catch (error) {
      console.error('Error fetching category item by code:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching category item by code',
      });
    }
  }

  // PUT /category-items/:id - Update category
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryItemDto: UpdateCategoryItemDto,
    @Res() res: express.Response,
  ) {
    try {
      const categoryItem = await this.categoryItemsService.update(
        id,
        updateCategoryItemDto,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        data: categoryItem,
        message: 'Category item updated successfully',
      });
    } catch (error) {
      console.error('Error updating category item:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error updating category item',
      });
    }
  }

  // DELETE /category-items/:id - Soft delete
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      await this.categoryItemsService.remove(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Category item ${id} has been deactivated`,
      });
    } catch (error) {
      console.error('Error removing category item:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error removing category item',
      });
    }
  }

  // DELETE /category-items/:id/hard - Hard delete
  @Delete(':id/hard')
  async hardDelete(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      await this.categoryItemsService.delete(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Category item ${id} has been permanently deleted`,
      });
    } catch (error) {
      console.error('Error deleting category item:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error deleting category item',
      });
    }
  }
}
