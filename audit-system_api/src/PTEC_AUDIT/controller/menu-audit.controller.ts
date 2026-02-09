import { AppService } from '../service/menu-audit.service';
import { Controller, Get, HttpStatus, Query, Req, Res } from '@nestjs/common';
import express from 'express';
@Controller('')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/menu_audit')
  async getAuditMenu() {
    try {
      const menus = await this.appService.getAllMenus();

      return {
        success: true,
        data: menus,
      };
    } catch (error) {
      console.error('Error fetching audit menus:', error);
      return {
        success: false,
        message: 'Error fetching audit menus',
      };
    }
  }

  @Get('/menu_audit/by-role')
  async getMenuByRole(
    @Query('roleId') roleId: string,
    @Res() res: express.Response,
  ) {
    try {
      if (!roleId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'roleId is required',
        });
      }

      const menus = await this.appService.getMenusByRole(Number(roleId));

      return res.status(HttpStatus.OK).json({
        success: true,
        data: menus,
      });
    } catch (error) {
      console.error('Error fetching menus by role:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching menus by role',
      });
    }
  }

  @Get('/menu_audit/tree')
  async getMenuTree(
    @Req() req: express.Request,
    @Query('roleId') roleId: string,
    @Res() res: express.Response,
  ) {
    try {
      if (!roleId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'roleId is required',
        });
      }

      const menuTree = await this.appService.getMenuTreeByRole(Number(roleId));

      return res.status(HttpStatus.OK).json({
        success: true,
        data: menuTree,
      });
    } catch (error) {
      console.error('Error fetching menu tree:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching menu tree',
      });
    }
  }

  @Get('/menu_audit/check-permission')
  async checkPermission(
    @Req() req: express.Request,
    @Query('roleId') roleId: string,
    @Query('menuId') menuId: string,
    @Res() res: express.Response,
  ) {
    try {
      if (!roleId || !menuId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'roleId and menuId are required',
        });
      }

      const hasPermission = await this.appService.checkMenuPermission(
        Number(roleId),
        Number(menuId),
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        hasPermission,
      });
    } catch (error) {
      console.error('Error checking permission:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error checking permission',
      });
    }
  }

  @Get('/menu_audit/my-menus')
  async getMyMenus(
    @Query('roleId') roleId: string,
    @Res() res: express.Response,
  ) {
    try {
      const menuTree = await this.appService.getMenuTreeByRole(Number(roleId));

      return res.status(HttpStatus.OK).json({
        success: true,
        data: menuTree,
      });
    } catch (error) {
      console.error('Error fetching my menus:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching my menus',
      });
    }
  }
}
