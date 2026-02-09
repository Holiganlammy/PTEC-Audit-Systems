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
import { AuditJobsService } from '../service/audit-job.service';
import { CreateAuditJobDto } from '../dto/create-audit-job.dto';
import { UpdateAuditJobDto } from '../dto/update-audit-job.dto';
import { AuditJobsHeader } from '../domain/audit.jobs-header.entity';

@Controller('audit-jobs')
// @UseGuards(JwtAuthGuard) // Uncomment when auth is ready
export class AuditJobsController {
  constructor(private readonly auditJobsService: AuditJobsService) {}

  // POST /audit-jobs - Create new audit job
  @Post()
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
  @Get()
  async findAll(
    @Query('job_id') jobId?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('auditorUserId') auditorUserId?: string,
    @Query('active') active?: string,
    @Res() res?: express.Response,
  ) {
    try {
      // If job_id is provided, get single job
      if (jobId !== undefined) {
        const id = Number(jobId);
        const auditJob = await this.auditJobsService.findOne(id);
        if (!auditJob) {
          return res?.status(HttpStatus.NOT_FOUND).json({
            success: false,
            message: `Audit job with ID ${id} not found`,
          });
        }
        return res?.status(HttpStatus.OK).json({
          success: true,
          data: auditJob,
        });
      }

      // Otherwise, get all jobs with filters
      const filters: Partial<AuditJobsHeader> = {};

      if (status !== undefined) filters.status = Number(status);
      if (branchId !== undefined) filters.branchId = Number(branchId);
      if (auditorUserId !== undefined)
        filters.auditorUserId = Number(auditorUserId);
      if (active !== undefined) filters.active = active === 'true';

      const auditJobs = await this.auditJobsService.findAll(filters);
      return res?.status(HttpStatus.OK).json({
        success: true,
        data: auditJobs,
      });
    } catch (error) {
      console.error('Error fetching audit jobs:', error);
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching audit jobs',
      });
    }
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
