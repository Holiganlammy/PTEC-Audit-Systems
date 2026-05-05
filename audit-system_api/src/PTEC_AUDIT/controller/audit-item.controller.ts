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
  HttpException,
  Res,
  Req,
} from '@nestjs/common';
import express from 'express';
import { AuditItemsService } from '../service/audit-item.service';
import { CreateAuditItemDto } from '../dto/create-audit-item.dto';
import { UpdateAuditItemDto } from '../dto/update-audit-item.dto';
import { AuditUserRolesService } from '../../PTEC_USERIGHT/service/audit-user-roles.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { UserInfo } from '../domain/type/audit-job.interface';
import { NotFoundException } from '@nestjs/common';

@Controller('audit-items')
export class AuditItemsController {
  constructor(
    private readonly auditItemsService: AuditItemsService,
    private readonly jwtService: JwtService,
    private readonly auditUserRolesService: AuditUserRolesService,
  ) {}

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
    @Query('search') search?: string,
    @Req() req?: express.Request,
    @Res() res?: express.Response,
  ) {
    try {
      const filters: {
        jobId?: number;
        search?: string;
      } = {};

      if (jobId !== undefined) filters.jobId = Number(jobId);
      if (search !== undefined) filters.search = search;
      const user = await this.getUserFromJWT(req);

      const auditItems = await this.auditItemsService.findAll(filters, user);
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
  async findByItemsJobAuditId(
    @Param('jobId', ParseIntPipe) jobId: number,
    @Query('search') search?: string,
    @Req() req?: express.Request,
    @Res() res?: express.Response,
  ) {
    try {
      // Get user from JWT
      const user = req ? await this.getUserFromJWT(req) : undefined;

      if (!user) {
        return res?.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          unauthorized: true,
          message: 'User authentication required',
        });
      }

      const filters: {
        jobId?: number;
        search?: string;
      } = {
        jobId: jobId,
      };

      // Add search if exists
      if (search !== undefined && search.trim()) {
        filters.search = search.trim();
      }

      const auditItems = await this.auditItemsService.findByItemsJobAuditId(
        filters,
        user,
      );

      return res?.status(HttpStatus.OK).json({
        success: true,
        code: HttpStatus.OK,
        data: auditItems,
        total: auditItems.length,
        message: `Audit items for job ID ${jobId} fetched successfully`,
      });
    } catch (error) {
      console.error('Error fetching audit items by job ID:', error);

      if (error instanceof HttpException && error.getStatus() === 401) {
        const errBody = error.getResponse() as Record<string, unknown>;
        return res?.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          unauthorized: true,
          message:
            typeof errBody.message === 'string'
              ? errBody.message
              : error.message,
        });
      }

      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
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
  private async getUserFromJWT(
    req: express.Request | undefined,
  ): Promise<UserInfo | undefined> {
    if (!req) {
      return undefined;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new HttpException(
        { success: false, message: 'No token provided', unauthorized: true },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const token = authHeader.substring(7);

    try {
      // 1. Decode JWT
      const decoded = this.jwtService.verify<{
        userId: string;
        username: string;
        role: string;
      }>(token, {
        secret: process.env.NEXTAUTH_SECRET,
      });
      // console.log(' Verifying user role for:', decoded);

      if (!decoded.username) {
        throw new Error('Username is missing from JWT');
      }

      // 2. Get Audit role
      // console.log('Fetching Audit role for:', decoded.username);

      const auditRole = await this.auditUserRolesService.getRoleByUserCode(
        decoded.username,
      );

      if (!auditRole) {
        throw new HttpException(
          {
            success: false,
            message: `User ${decoded.username} is not registered in Audit System`,
            unauthorized: true,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      // console.log('User authorized:', {
      //   username: decoded.username,
      //   Audit_role: auditRole.roleId,
      //   role_name: auditRole.roleName,
      // });
      return {
        user_id: parseInt(decoded.userId, 10),
        role_id: auditRole.roleId,
        username: decoded.username,
        is_admin: auditRole.roleId === 1,
      };
    } catch (error) {
      console.error('❌ Authorization failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw new UnauthorizedException(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
  @Patch(':id/am-checklist')
  async updateAMChecklist(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      status: number;
      detail?: string;
      checkedBy: number;
    },
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    try {
      // Verify user is AM (optional - depends on requirements)
      const user = await this.getUserFromJWT(req);

      if (!user) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          unauthorized: true,
          message: 'User authentication required',
        });
      }

      // Optional: Check if user is AM
      // const isAM = user.position?.includes('AM') || user.role_id === X;
      // if (!isAM) {
      //   return res.status(HttpStatus.FORBIDDEN).json({
      //     success: false,
      //     message: 'Only AM can update checklist',
      //   });
      // }

      const auditItem = await this.auditItemsService.updateAMChecklist(id, {
        status: body.status,
        detail: body.detail,
        checkedBy: body.checkedBy,
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        data: auditItem,
        message: 'AM Checklist updated successfully',
      });
    } catch (error) {
      console.error('Error updating AM checklist:', error);

      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error updating AM checklist',
      });
    }
  }

  @Get(':id/am-checklist')
  async getAMChecklist(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      const checklist = await this.auditItemsService.getAMChecklist(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: checklist,
      });
    } catch (error) {
      console.error('Error fetching AM checklist:', error);

      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching AM checklist',
      });
    }
  }
  @Delete(':id/am-checklist')
  async clearAMChecklist(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    try {
      // Verify user
      const user = await this.getUserFromJWT(req);

      if (!user) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          unauthorized: true,
          message: 'User authentication required',
        });
      }

      const auditItem = await this.auditItemsService.clearAMChecklist(id);

      return res.status(HttpStatus.OK).json({
        success: true,
        data: auditItem,
        message: 'AM Checklist cleared successfully',
      });
    } catch (error) {
      console.error('Error clearing AM checklist:', error);

      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error clearing AM checklist',
      });
    }
  }

  // PUT /audit-items/:id/branch-score - Update branch audit score
  // @Put(':id/branch-score')
  // async updateBranchScore(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body('score', ParseIntPipe) score: number,
  //   @Res() res: express.Response,
  // ) {
  //   try {
  //     const auditItem = await this.auditItemsService.updateBranchScore(
  //       id,
  //       score,
  //     );
  //     return res.status(HttpStatus.OK).json({
  //       success: true,
  //       data: auditItem,
  //       message: 'Branch audit score updated successfully',
  //     });
  //   } catch (error) {
  //     console.error('Error updating branch audit score:', error);
  //     return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
  //       success: false,
  //       message: 'Error updating branch audit score',
  //     });
  //   }
  // }
}
