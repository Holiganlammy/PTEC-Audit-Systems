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
  Req,
} from '@nestjs/common';
import express from 'express';
import { AuditJobsService } from '../service/audit-job.service';
import { PaginatedResponse } from '../domain/type/audit-job.interface';
import { CreateAuditJobDto } from '../dto/create-audit-job.dto';
import { UpdateAuditJobDto } from '../dto/update-audit-job.dto';
// import { AuditJobsHeader } from '../domain/audit.jobs-header.entity';

@Controller('audit-jobs')
// @UseGuards(JwtAuthGuard) // Uncomment when auth is ready
export class AuditJobsController {
  constructor(private readonly auditJobsService: AuditJobsService) {}

  // POST /audit-jobs/create - Create new audit job
  @Post('/create')
  async create(
    @Body() createAuditJobDto: CreateAuditJobDto,
    @Res() res: express.Response,
  ) {
    try {
      const auditJob = await this.auditJobsService.create(createAuditJobDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: auditJob,
        message: 'Audit job created successfully',
      });
    } catch (error) {
      console.error('Error creating audit job:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error creating audit job',
      });
    }
  }

  // GET /audit-jobs - Get all audit jobs with optional filters or single job by job_id
  @Get('/list')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('auditorUserId') auditorUserId?: string,
    @Query('active') active?: string,
    @Req() req?: express.Request,
  ): Promise<PaginatedResponse> {
    // Parse query params
    const params = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status: status ? parseInt(status, 10) : undefined,
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      auditorUserId: auditorUserId ? parseInt(auditorUserId, 10) : undefined,
      active: active ? active === 'true' : undefined,
    };

    const user = (typeof req?.user === 'object' ? req.user : null) || {
      role_id: 1,
      is_admin: true,
      user_id: 0,
      username: 'system',
    };

    return await this.auditJobsService.findAll(params, user);
  }

  // GET /audit-jobs/status/:status - Get jobs by status
  @Get('status/:status')
  async findByStatus(
    @Param('status', ParseIntPipe) status: number,
    @Res() res: express.Response,
  ) {
    try {
      const auditJobs = await this.auditJobsService.findByStatus(status);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: auditJobs,
      });
    } catch (error) {
      console.error('Error fetching audit jobs by status:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching audit jobs by status',
      });
    }
  }

  // GET /audit-jobs/auditor/:auditorId - Get jobs by auditor
  @Get('auditor/:auditorId')
  async findByAuditor(
    @Param('auditorId', ParseIntPipe) auditorId: number,
    @Res() res: express.Response,
  ) {
    try {
      const auditJobs = await this.auditJobsService.findByAuditor(auditorId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: auditJobs,
      });
    } catch (error) {
      console.error('Error fetching audit jobs by auditor:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching audit jobs by auditor',
      });
    }
  }

  // PUT /audit-jobs/:id - Update audit job
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAuditJobDto: UpdateAuditJobDto,
    @Res() res: express.Response,
  ) {
    try {
      const auditJob = await this.auditJobsService.update(
        id,
        updateAuditJobDto,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        data: auditJob,
        message: 'Audit job updated successfully',
      });
    } catch (error) {
      console.error('Error updating audit job:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error updating audit job',
      });
    }
  }

  // DELETE /audit-jobs/:id - Soft delete (set active = false)
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      await this.auditJobsService.remove(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Audit job ${id} has been deactivated`,
      });
    } catch (error) {
      console.error('Error removing audit job:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error removing audit job',
      });
    }
  }

  // DELETE /audit-jobs/:id/hard - Hard delete
  @Delete(':id/hard')
  async hardDelete(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      await this.auditJobsService.delete(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Audit job ${id} has been permanently deleted`,
      });
    } catch (error) {
      console.error('Error deleting audit job:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error deleting audit job',
      });
    }
  }
}
