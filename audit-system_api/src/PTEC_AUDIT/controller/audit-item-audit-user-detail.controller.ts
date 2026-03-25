import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpStatus,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { AuditItemOtherUserDetailService } from '../service/audit-item-other-user-detail.service';
import {
  CreateAuditUserDto,
  AuditUserResponseDto,
} from '../dto/audit-user.dto';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';

@Controller('audit-items')
export class AuditItemOtherUserDetailController {
  constructor(
    private readonly auditUserDetailService: AuditItemOtherUserDetailService,
    private readonly userRightService: UserRightService,
  ) {}

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
          userCode: user.UserCode,
          fullname: user.fristName ? `${user.fristName} ${user.lastName}` : '',
          email: user.Email,
          position: user.Position,
          branchId: user.BranchID,
          userId: user.UserID,
        };
      }
    } catch (error) {
      console.error(`Error fetching user data for userId ${userId}:`, error);
    }

    return null;
  }

  @Get('/all/tagged-users')
  async findAll() {
    try {
      const tags = await this.auditUserDetailService.findByAll();
      const enrichedTags: AuditUserResponseDto[] = await Promise.all(
        tags.map(async (tag) => {
          const userData = await this.getUserData(tag.userId);
          return {
            taggedUserId: tag.taggedUserId,
            itemId: tag.itemId,
            userId: tag.userId,
            userCode: userData?.userCode,
            fullname: userData?.fullname,
            email: userData?.email,
            position: userData?.position,
            branchId: userData?.branchId,
            createdBy: tag.createdBy,
            createdAt: tag.createdAt,
            active: tag.active,
          };
        }),
      );
      return {
        success: true,
        data: enrichedTags,
      };
    } catch (error) {
      console.error('Error fetching tagged users:', error);
      throw new HttpException(
        'Error fetching tagged users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':itemId/tagged-user')
  async findByItemId(@Param('itemId', ParseIntPipe) itemId: number) {
    try {
      const tags = await this.auditUserDetailService.findByItemId(itemId);

      const enrichedTags: AuditUserResponseDto[] = await Promise.all(
        tags.map(async (tag) => {
          const userData = await this.getUserData(tag.userId);
          return {
            taggedUserId: tag.taggedUserId,
            itemId: tag.itemId,
            userId: tag.userId,
            userCode: userData?.userCode,
            fullname: userData?.fullname,
            email: userData?.email,
            position: userData?.position,
            branchId: userData?.branchId,
            createdBy: tag.createdBy,
            createdAt: tag.createdAt,
            active: tag.active,
          };
        }),
      );

      return {
        success: true,
        data: enrichedTags,
      };
    } catch (error) {
      console.error('Error fetching tagged users:', error);
      throw new HttpException(
        'Error fetching tagged users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // /audit-items/:itemId/tagged-users - Tag a user to an item
  @Post(':itemId/tagged-user')
  async create(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() createDto: CreateAuditUserDto,
  ) {
    try {
      const result = await this.auditUserDetailService.create(
        itemId,
        createDto,
      );

      // Enrich with user data
      const userData = await this.getUserData(result.userId);

      const response: AuditUserResponseDto = {
        taggedUserId: result.taggedUserId,
        itemId: result.itemId,
        userId: result.userId,
        userCode: userData?.userCode,
        fullname: userData?.fullname,
        email: userData?.email,
        position: userData?.position,
        branchId: userData?.branchId,
        createdBy: result.createdBy,
        createdAt: result.createdAt,
        active: result.active,
      };

      return {
        success: true,
        data: response,
        message: 'User tagged successfully',
      };
    } catch (error) {
      console.error('Error tagging user:', error);

      if (
        error instanceof Error &&
        error.message === 'User already tagged to this item'
      ) {
        throw new HttpException(
          'User already tagged to this item',
          HttpStatus.CONFLICT,
        );
      }

      throw new HttpException(
        'Error tagging user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // DELETE /audit-items/:itemId/tagged-users/:userId - Remove tag (soft delete)
  @Delete(':itemId/tagged-users/:userId')
  async remove(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    try {
      await this.auditUserDetailService.remove(itemId, userId);

      return {
        success: true,
        message: 'User tag removed successfully',
      };
    } catch (error) {
      console.error('Error removing user tag:', error);

      if (error instanceof NotFoundException) {
        throw new HttpException('Tagged user not found', HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        'Error removing user tag',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
