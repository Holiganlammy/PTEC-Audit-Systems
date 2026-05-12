// dashboard/controller/dashboard.controller.ts

import { Controller, Get, Query, Req, HttpStatus, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DashboardService } from '../service/dashboard.service';

interface DashboardData {
  stats: Record<string, unknown>;
  actionItems: unknown[];
  recentActivities: unknown[];
  branchRankings?: unknown[];
}

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard/am
   * AM Dashboard data (role_id = 3)
   */
  @Get('am')
  async getAMDashboard(
    @Query('dateRange') dateRange = '30',
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const userId = req.user;
      if (!userId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const data = await this.dashboardService.getAMDashboardData(
        userId,
        parseInt(dateRange, 10),
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        data,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('❌ Error fetching AM dashboard:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch AM dashboard',
        error: error.message,
      });
    }
  }

  /**
   * GET /dashboard/audit
   * Audit Dashboard data (role_id = 2)
   */
  @Get('audit')
  async getAuditDashboard(
    @Query('dateRange') dateRange = '30',
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const userId = req.user;

      if (!userId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const data: DashboardData =
        await this.dashboardService.getAuditDashboardData(
          userId,
          parseInt(dateRange, 10),
        );

      return res.status(HttpStatus.OK).json({
        success: true,
        data,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('❌ Error fetching Audit dashboard:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch Audit dashboard',
        error: error.message,
      });
    }
  }

  /**
   * GET /dashboard/user
   * User Dashboard data (default role)
   */
  @Get('user')
  async getUserDashboard(
    @Query('dateRange') dateRange = '30',
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const userId = req.user;

      if (!userId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const data: DashboardData =
        await this.dashboardService.getUserDashboardData(
          userId,
          parseInt(dateRange, 10),
        );

      return res.status(HttpStatus.OK).json({
        success: true,
        data,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('❌ Error fetching User dashboard:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch User dashboard',
        error: error.message,
      });
    }
  }

  /**
   * GET /dashboard/manager
   * Manager Dashboard data (role_id = 4)
   */
  @Get('manager')
  async getManagerDashboard(
    @Query('dateRange') dateRange = '30',
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const userId = req.user;
      if (!userId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const data: DashboardData =
        await this.dashboardService.getManagerDashboardData(
          userId,
          parseInt(dateRange, 10),
        );

      return res.status(HttpStatus.OK).json({
        success: true,
        data,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('❌ Error fetching Manager dashboard:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch Manager dashboard',
        error: error.message,
      });
    }
  }
}
