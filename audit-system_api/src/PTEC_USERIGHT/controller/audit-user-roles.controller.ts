import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuditUserRolesService } from '../service/audit-user-roles.service';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';
import { JwtService } from '@nestjs/jwt';
import {
  CreateUserRoleDto,
  UpdateUserRoleDto,
  UserRoleResponseDto,
} from '../dto/User_Role.dto';
import express from 'express';
import { UserInfo } from '../../PTEC_AUDIT/domain/type/audit-job.interface';

@Controller('audit-user-roles')
export class AuditUserRolesController {
  constructor(
    private readonly auditUserRolesService: AuditUserRolesService,
    private readonly userRightService: UserRightService,
    private readonly jwtService: JwtService,
  ) {}

  // Helper: Get user data
  private async getUserData(userId: number | null) {
    if (!userId) return null;

    try {
      const users = await this.userRightService.getUsersFromProcedure(
        null,
        userId,
      );
      if (users && users.length > 0) {
        const user = users[0];
        return {
          fullname: user.fristName ? `${user.fristName} ${user.lastName}` : '',
          email: user.Email,
          position: user.Position,
          BranchID: user.BranchID,
          BranchName: user.BranchName,
        };
      }
    } catch (error) {
      console.error(`Error fetching user data for userId ${userId}:`, error);
    }

    return null;
  }

  // GET /audit-user-roles - Get all user roles with pagination
  @Get()
  async findAll(
    @Req() req: express.Request,
    @Query('roleId') roleId?: string,
    @Query('active') active?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    await this.getUserFromJWT(req);
    try {
      const filters = {
        roleId: roleId ? parseInt(roleId) : undefined,
        active: active ? parseInt(active) : 1, // Default: active only
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
      };

      const { data, total } = await this.auditUserRolesService.findAll(filters);

      // Enrich with user data
      const enrichedData: UserRoleResponseDto[] = await Promise.all(
        data.map(async (userRole) => {
          const userData = await this.getUserData(userRole.userId);
          return {
            userRoleId: userRole.userRoleId,
            userId: userRole.userId,
            userCode: userRole.userCode,
            roleId: userRole.roleId,
            roleName: userRole.role?.roleName || '',
            fullname: userData?.fullname,
            email: userData?.email,
            position: userData?.position,
            BranchID: userData?.BranchID,
            BranchName: userData?.BranchName,
            createdBy: userRole.createdBy,
            createdAt: userRole.createdAt,
            updatedBy: userRole.updatedBy,
            updatedAt: userRole.updatedAt,
            active: userRole.active,
          };
        }),
      );

      return {
        success: true,
        data: enrichedData,
        total,
        page: filters.page,
        limit: filters.limit,
      };
    } catch (error) {
      console.error('Error fetching user roles:', error);
      throw new HttpException(
        'Error fetching user roles',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // GET /audit-user-roles/check-role/:userId - Get role by user ID
  @Get('check-role/:userId')
  async checkRoleByUserId(@Param('userId', ParseIntPipe) userId: number) {
    try {
      const role = await this.auditUserRolesService.getRoleByUserId(userId);

      if (!role) {
        throw new HttpException(
          `User ID ${userId} is not registered in Audit System`,
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: {
          userId,
          roleId: role.roleId,
          roleName: role.roleName,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error checking role by userId:', error);
      throw new HttpException(
        'Error checking role by userId',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // GET /audit-user-roles/roles - Get all available roles (filtered by caller's role)
  @Get('roles')
  async getAllRoles(@Req() req: express.Request) {
    try {
      const currentUser = await this.getUserFromJWT(req);
      const roles = await this.auditUserRolesService.getAllRoles(
        currentUser?.role_id,
      );
      return {
        success: true,
        data: roles,
      };
    } catch (error) {
      console.error('Error fetching roles:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error fetching roles',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // GET /audit-user-roles/:id - Get user role by ID
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const userRole = await this.auditUserRolesService.findOne(id);
      const userData = await this.getUserData(userRole.userId);

      const response: UserRoleResponseDto = {
        userRoleId: userRole.userRoleId,
        userId: userRole.userId,
        userCode: userRole.userCode,
        roleId: userRole.roleId,
        roleName: userRole.role?.roleName || '',
        fullname: userData?.fullname,
        email: userData?.email,
        position: userData?.position,
        BranchID: userData?.BranchID,
        BranchName: userData?.BranchName,
        createdBy: userRole.createdBy,
        createdAt: userRole.createdAt,
        updatedBy: userRole.updatedBy,
        updatedAt: userRole.updatedAt,
        active: userRole.active,
      };

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching user role:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error fetching user role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // POST /audit-user-roles - Create user role
  @Post()
  async create(@Body() createDto: CreateUserRoleDto) {
    try {
      const userRole = await this.auditUserRolesService.create(createDto);
      const userData = await this.getUserData(userRole.userId);

      const response: UserRoleResponseDto = {
        userRoleId: userRole.userRoleId,
        userId: userRole.userId,
        userCode: userRole.userCode,
        roleId: userRole.roleId,
        roleName: '', // Will be enriched on refetch
        fullname: userData?.fullname,
        email: userData?.email,
        position: userData?.position,
        BranchID: userData?.BranchID,
        BranchName: userData?.BranchName,
        createdBy: userRole.createdBy,
        createdAt: userRole.createdAt,
        updatedBy: userRole.updatedBy,
        updatedAt: userRole.updatedAt,
        active: userRole.active,
      };

      return {
        success: true,
        data: response,
        message: 'User role created successfully',
      };
    } catch (error) {
      console.error('Error creating user role:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        'message' in error
      ) {
        const err = error as { status: HttpStatus; message: string };
        if (err.status === HttpStatus.CONFLICT) {
          throw new HttpException(err.message, HttpStatus.CONFLICT);
        }
        if (err.status === HttpStatus.NOT_FOUND) {
          throw new HttpException(err.message, HttpStatus.NOT_FOUND);
        }
      }

      throw new HttpException(
        'Error creating user role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // PUT /audit-user-roles/:id - Update user role
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUserRoleDto,
  ) {
    try {
      const userRole = await this.auditUserRolesService.update(id, updateDto);

      return {
        success: true,
        data: userRole,
        message: 'User role updated successfully',
      };
    } catch (error) {
      console.error('Error updating user role:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error updating user role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // DELETE /audit-user-roles/:id - Soft delete (deactivate)
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('updatedBy') updatedBy?: string,
  ) {
    try {
      await this.auditUserRolesService.remove(
        id,
        updatedBy ? parseInt(updatedBy) : undefined,
      );

      return {
        success: true,
        message: 'User role deactivated successfully',
      };
    } catch (error) {
      console.error('Error removing user role:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error removing user role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // POST /audit-user-roles/:id/reactivate - Reactivate user role
  @Post(':id/reactivate')
  async reactivate(
    @Param('id', ParseIntPipe) id: number,
    @Body('updatedBy') updatedBy?: number,
  ) {
    try {
      const userRole = await this.auditUserRolesService.reactivate(
        id,
        updatedBy,
      );

      return {
        success: true,
        data: userRole,
        message: 'User role reactivated successfully',
      };
    } catch (error) {
      console.error('Error reactivating user role:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        'message' in error
      ) {
        const err = error as { status: HttpStatus; message: string };
        if (err.status === HttpStatus.CONFLICT) {
          throw new HttpException(err.message, HttpStatus.CONFLICT);
        }
      }

      throw new HttpException(
        'Error reactivating user role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // DELETE /audit-user-roles/:id/hard - Hard delete
  @Delete(':id/hard')
  async hardDelete(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.auditUserRolesService.delete(id);

      return {
        success: true,
        message: 'User role permanently deleted',
      };
    } catch (error) {
      console.error('Error deleting user role:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error deleting user role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      user_id: userId,
      role_id: auditRole.roleId,
      username: userCode,
      is_admin: auditRole.roleId === 1,
    };
  }
}
