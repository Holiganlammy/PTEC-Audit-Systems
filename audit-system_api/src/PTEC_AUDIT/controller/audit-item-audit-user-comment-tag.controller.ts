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
import { AuditItemOtherUserCommentTagService } from '../service/audit-item-other-user-comment-tag.service';
import { AuditItemsService } from '../service/audit-item.service';
import {
  CreateAuditUserDto,
  AuditUserResponseDto,
} from '../dto/audit-user.dto';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';
import { TagOtherUserGmailApiService } from '../../email/tag-other-user-gmail-api.service';

@Controller('audit-items')
export class AuditItemOtherUserCommentTagController {
  constructor(
    private readonly auditUserCommentTagService: AuditItemOtherUserCommentTagService,
    private readonly auditItemsService: AuditItemsService,
    private readonly userRightService: UserRightService,
    private readonly tagOtherUserGmailApiService: TagOtherUserGmailApiService,
  ) {}

  private async getItemData(itemId: number) {
    try {
      const item = await this.auditItemsService.findOne(itemId);
      return {
        itemName: item.categoryItem?.categoryName ?? undefined,
        jobNo: item.job?.jobNo ?? undefined,
        branchName: item.job?.branchName ?? undefined,
        jobId: item.job?.jobId ?? undefined,
        AM_Name_user:
          `${item.job?.districtManagerFirstName ?? ''} ${item.job?.districtManagerLastName ?? ''}`.trim() ||
          undefined,
        Branch_Name_User:
          `${item.job?.branchManagerFirstName ?? ''} ${item.job?.branchManagerLastName ?? ''}`.trim() ||
          undefined,
      };
    } catch (error) {
      console.error(`Error fetching item data for itemId ${itemId}:`, error);
      return null;
    }
  }

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
      const tags = await this.auditUserCommentTagService.findByAll();
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
      const tags = await this.auditUserCommentTagService.findByItemId(itemId);

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
      const result = await this.auditUserCommentTagService.create(
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

      let emailSent = false;
      if (response.email) {
        try {
          const [itemData, taggedByData] = await Promise.all([
            this.getItemData(itemId),
            this.getUserData(createDto.createdBy ?? null),
          ]);

          await this.tagOtherUserGmailApiService.sendAuditItemTaggedEmail({
            to: response.email,
            taggedUserFullname: response.fullname,
            itemId: response.itemId,
            itemName: itemData?.itemName,
            jobNo: itemData?.jobNo,
            branchName: itemData?.branchName,
            taggedByFullname: taggedByData?.fullname,
            AM_Name_user: itemData?.AM_Name_user,
            Branch_Name_User: itemData?.Branch_Name_User,
          });
          emailSent = true;
        } catch (mailError) {
          console.error(
            `Error sending tagged-user email to ${response.email}:`,
            mailError,
          );
        }
      }

      return {
        success: true,
        data: response,
        message: 'User tagged successfully',
        emailSent,
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
      await this.auditUserCommentTagService.remove(itemId, userId);

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
