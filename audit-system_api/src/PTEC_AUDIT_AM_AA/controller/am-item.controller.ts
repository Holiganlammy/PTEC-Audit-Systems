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
import { AMItemsService } from '../service/am-item.service';
import { CreateAuditItemDto } from '../dto/create-audit-item.dto';
import { UpdateAuditItemDto } from '../dto/update-audit-item.dto';
import { AuditUserRolesService } from '../../PTEC_USERIGHT/service/audit-user-roles.service';
import { JwtService } from '@nestjs/jwt';
import { UserInfo } from '../domain/type/audit-job.interface';
import { NotFoundException } from '@nestjs/common';

@Controller('am-items')
export class AMItemsController {
  constructor(
    private readonly amItemsService: AMItemsService,
    private readonly jwtService: JwtService,
    private readonly auditUserRolesService: AuditUserRolesService,
  ) {}

  // POST /am-items - Create single audit item
  @Post()
  async create(
    @Body() createAuditItemDto: CreateAuditItemDto,
    @Res() res: express.Response,
  ) {
    try {
      const auditItem = await this.amItemsService.create(createAuditItemDto);
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

  // POST /am-items/bulk - Create multiple audit items
  @Post('bulk')
  async createMany(
    @Body() createAuditItemDtos: CreateAuditItemDto[],
    @Res() res: express.Response,
  ) {
    try {
      const auditItems =
        await this.amItemsService.createMany(createAuditItemDtos);
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

  // GET /am-items - Get all audit items with filters
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

      const auditItems = await this.amItemsService.findAll(filters, user);
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

  // GET /am-items/:id - Get single audit item with all relations
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      const auditItem = await this.amItemsService.findOne(id);
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

  // GET /am-items/job/:jobId - Get all items for a job
  @Get('job/:jobId')
  async findByItemsJobAuditId(
    @Param('jobId', ParseIntPipe) jobId: number,
    @Query('search') search?: string,
    @Query('jobSource') jobSource?: string,
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
        jobSource?: string;
      } = {
        jobId: jobId,
      };

      // Add search if exists
      if (search !== undefined && search.trim()) {
        filters.search = search.trim();
      }

      if (jobSource?.trim()) {
        filters.jobSource = jobSource.trim();
      }

      const auditItems = await this.amItemsService.findByItemsJobAuditId(
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

  // GET /am-items/category/:categoryId - Get items by category
  @Get('category/:categoryId')
  async findByCategoryId(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Res() res: express.Response,
  ) {
    try {
      const auditItems = await this.amItemsService.findByCategoryId(categoryId);
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

  // PUT /am-items/:id - Update audit item
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAuditItemDto: UpdateAuditItemDto,
    @Res() res: express.Response,
  ) {
    try {
      const auditItem = await this.amItemsService.update(
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

  // PATCH /am-items/:id/status - Update item status only
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status', ParseIntPipe) status: number,
    @Res() res: express.Response,
  ) {
    try {
      const auditItem = await this.amItemsService.updateStatus(id, status);
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

  // DELETE /am-items/:id - Soft delete
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      await this.amItemsService.remove(id);
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

  // DELETE /am-items/:id/hard - Hard delete
  @Delete(':id/hard')
  async hardDelete(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      await this.amItemsService.delete(id);
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

    // req.user is set by AuthMiddleware for both local login and Microsoft SSO
    const userCode = req.user;
    if (!userCode) {
      throw new HttpException(
        {
          success: false,
          message: 'No user in request context',
          unauthorized: true,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Decode (no verify) to extract userId — works for local login JWT,
    // silently ignored for Microsoft SSO tokens
    let userId: number | undefined;
    const token = authHeader.substring(7);
    try {
      const decoded = this.jwtService.decode<{ userId?: string }>(token);
      if (decoded?.userId) {
        userId = parseInt(decoded.userId, 10);
      }
    } catch {
      // userId is optional — ignore decode errors
    }
    if (req.userId !== undefined && req.userId !== null) {
      userId = req.userId;
    }

    const auditRole =
      await this.auditUserRolesService.getRoleByUserCode(userCode);

    if (!auditRole) {
      throw new HttpException(
        {
          success: false,
          message: `User ${userCode} is not registered in Audit System`,
          unauthorized: true,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return {
      user_id: userId ?? auditRole.userId,
      role_id: auditRole.roleId,
      username: userCode,
      is_admin: auditRole.roleId === 1,
    };
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

      const auditItem = await this.amItemsService.updateAMChecklist(id, {
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
      const checklist = await this.amItemsService.getAMChecklist(id);
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

      const auditItem = await this.amItemsService.clearAMChecklist(id);

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
