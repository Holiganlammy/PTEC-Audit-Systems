// branch-audit-score.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { BranchAuditScoreService } from '../service/branch-audit-score.service';
import {
  CreateBranchAuditScoreDto,
  UpdateBranchAuditScoreDto,
  CreateScoreBatchDto,
} from '../dto/branch-audit-score.dto';
import * as express from 'express';

@Controller('branch-audit-scores')
export class BranchAuditScoreController {
  constructor(private readonly scoreService: BranchAuditScoreService) {}

  // POST /branch-audit-scores/create (create a new score)
  @Post('/create')
  async create(
    @Body() createDto: CreateBranchAuditScoreDto,
    @Res() res: express.Response,
  ) {
    try {
      const score = await this.scoreService.create(createDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Score created successfully',
        data: score,
      });
    } catch (error) {
      console.error('Error creating score:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message:
          error instanceof Error ? error.message : 'Error creating score',
      });
    }
  }

  // POST /branch-audit-scores/batch (batch create scores)
  @Post('/batch')
  async batchCreate(
    @Body() batchDto: CreateScoreBatchDto,
    @Res() res: express.Response,
  ) {
    try {
      const scores = await this.scoreService.batchCreate(batchDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: `Created ${scores.length} scores successfully`,
        data: scores,
      });
    } catch (error) {
      console.error('Error batch creating scores:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Error batch creating scores',
      });
    }
  }

  // GET /branch-audit-scores/list (get all scores)
  @Get('/list')
  async findAll(@Res() res: express.Response) {
    try {
      const scores = await this.scoreService.findAll();
      return res.status(HttpStatus.OK).json({
        success: true,
        data: scores,
        total: scores.length,
      });
    } catch (error) {
      console.error('Error fetching scores:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching scores',
      });
    }
  }

  // GET /branch-audit-scores/job/:jobId (get scores by job ID)
  @Get('job/:jobId')
  async findByJob(
    @Param('jobId', ParseIntPipe) jobId: number,
    @Res() res: express.Response,
  ) {
    try {
      const scores = await this.scoreService.findByJob(jobId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: scores,
        total: scores.length,
      });
    } catch (error) {
      console.error('Error fetching scores by job:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching scores by job',
      });
    }
  }

  // GET /branch-audit-scores/branch/:branchId (get scores by branch ID)
  @Get('branch/:branchId')
  async findByBranch(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Res() res: express.Response,
  ) {
    try {
      const scores = await this.scoreService.findByBranch(branchId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: scores,
        total: scores.length,
      });
    } catch (error) {
      console.error('Error fetching scores by branch:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching scores by branch',
      });
    }
  }

  // GET /branch-audit-scores/item/:itemId (get score by item ID)
  @Get('item/:itemId')
  async findByItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() res: express.Response,
  ) {
    try {
      const score = await this.scoreService.findByItem(itemId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: score,
      });
    } catch (error) {
      console.error('Error fetching score by item:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching score by item',
      });
    }
  }

  // GET /branch-audit-scores/:id (get score by ID)
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      const score = await this.scoreService.findOne(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: score,
      });
    } catch (error) {
      console.error('Error fetching score:', error);
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: error instanceof Error ? error.message : 'Score not found',
      });
    }
  }

  // PUT /branch-audit-scores/:id (update score and remarks)
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBranchAuditScoreDto,
    @Res() res: express.Response,
  ) {
    try {
      const score = await this.scoreService.update(id, updateDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Score updated successfully',
        data: score,
      });
    } catch (error) {
      console.error('Error updating score:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message:
          error instanceof Error ? error.message : 'Error updating score',
      });
    }
  }

  // Delete /branch-audit-scores/:id (soft delete by setting active to false)
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: express.Response,
  ) {
    try {
      await this.scoreService.remove(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Score deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting score:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error deleting score',
      });
    }
  }

  // ==================== GET SUMMARY BY JOB ====================
  @Get('summary/job/:jobId')
  async getSummaryByJob(
    @Param('jobId', ParseIntPipe) jobId: number,
    @Res() res: express.Response,
  ) {
    try {
      const summary = await this.scoreService.getSummaryByJob(jobId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Error fetching summary by job:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message:
          error instanceof Error ? error.message : 'Error fetching summary',
      });
    }
  }

  // ==================== GET SUMMARY BY BRANCH ====================
  @Get('summary/branch/:branchId')
  async getSummaryByBranch(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Res() res: express.Response,
  ) {
    try {
      const summary = await this.scoreService.getSummaryByBranch(branchId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Error fetching summary by branch:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message:
          error instanceof Error ? error.message : 'Error fetching summary',
      });
    }
  }
}
