// src/PTEC_AUDIT/controller/menu-audit.controller.ts
import { AppService } from '../service/menu-audit.service';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import express from 'express';
import { MenuAuditDto } from '../dto/menu.dto';

@Controller('')
export class AppController {
  constructor(private readonly appService: AppService) {}

  private getUserCodeFromRequest(req: express.Request): string {
    const extendedReq = req as express.Request & {
      user?: string;
    };

    const userCode = extendedReq.user;
    if (!userCode) {
      throw new UnauthorizedException('No user in request');
    }

    return String(userCode);
  }

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

  // @Get('/menu_audit/by-role')
  // async getMenuByRole(
  //   @Body() body: MenuAuditDto,
  //   @Res() res: express.Response,
  // ) {
  //   try {
  //     const userId = Number(body.UserID);
  //     const menuId = Number(body.menuId);

  //     if (!Number.isFinite(userId) || userId <= 0) {
  //       return res.status(HttpStatus.BAD_REQUEST).json({
  //         success: false,
  //         message: 'UserID is required',
  //       });
  //     }

  //     if (!Number.isFinite(menuId) || menuId <= 0) {
  //       return res.status(HttpStatus.BAD_REQUEST).json({
  //         success: false,
  //         message: 'menuId is required',
  //       });
  //     }

  //     const hasPermission = await this.appService.checkMenuPermission(
  //       userId,
  //       menuId,
  //     );

  //     return res.status(HttpStatus.OK).json({
  //       success: true,
  //       hasPermission,
  //     });
  //   } catch (error) {
  //     if (error instanceof UnauthorizedException) {
  //       return res.status(HttpStatus.UNAUTHORIZED).json({
  //         success: false,
  //         message: error.message,
  //       });
  //     }
  //     console.error('Error checking permission:', error);
  //     return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
  //       success: false,
  //       message: 'Error checking permission',
  //     });
  //   }
  // }

  // my-menus = tree โดยใช้ role จาก token
  @Get('/menu_audit/my-menus')
  async getMyMenus(@Req() req: express.Request, @Res() res: express.Response) {
    try {
      const userCode = this.getUserCodeFromRequest(req);
      const menuTree = await this.appService.getMenuTreeByUserCode(userCode);

      return res.status(HttpStatus.OK).json({
        success: true,
        userCode,
        data: menuTree,
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: error.message,
        });
      }
      console.error('Error fetching my menus:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching my menus',
      });
    }
  }

  @Post('/menu_audit/check-permission')
  async checkPermission(
    @Body() body: MenuAuditDto | undefined,
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    try {
      const requestBody = ((body as unknown) ??
        (req as unknown as { body?: unknown }).body ??
        {}) as Record<string, unknown>;
      const userId = Number(requestBody.UserID);
      const menuIdRaw = requestBody.menuId;

      if (!Number.isFinite(userId) || userId <= 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message:
            'UserID is required. Send JSON body เช่น {"UserID":410,"menuId":123} พร้อม header Content-Type: application/json',
        });
      }

      // ถ้าส่ง menuId มาด้วย = เช็คสิทธิ์เมนูนั้น
      if (menuIdRaw !== undefined && menuIdRaw !== null && menuIdRaw !== '') {
        const menuId = Number(menuIdRaw);
        if (!Number.isFinite(menuId) || menuId <= 0) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: 'menuId ต้องเป็นตัวเลขมากกว่า 0',
          });
        }

        const hasPermission = await this.appService.checkMenuPermission(
          userId,
          menuId,
        );

        return res.status(HttpStatus.OK).json({
          success: true,
          hasPermission,
        });
      }

      // ถ้าไม่ส่ง menuId = ขอรายการเมนูที่ user เข้าได้ (ตาม fields ที่ต้องการ)
      const menus = await this.appService.getPermittedMenusByUserId(userId);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: menus,
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: error.message,
        });
      }
      console.error('Error checking permission:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error checking permission',
      });
    }
  }
}
