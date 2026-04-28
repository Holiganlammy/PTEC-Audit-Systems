import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditItemOtherCommentUserTag } from '../domain/model/audit-item-other-comment-users-tag.entity';
import { CreateAuditUserDto } from '../dto/audit-user.dto';

@Injectable()
export class AuditItemOtherUserCommentTagService {
  constructor(
    @InjectRepository(AuditItemOtherCommentUserTag)
    private readonly otherUserDetailRepository: Repository<AuditItemOtherCommentUserTag>,
  ) {}

  async findByAll(): Promise<AuditItemOtherCommentUserTag[]> {
    return await this.otherUserDetailRepository.find({
      where: { active: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByItemId(itemId: number): Promise<AuditItemOtherCommentUserTag[]> {
    return await this.otherUserDetailRepository.find({
      where: { itemId, active: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findByUserId(userId: number): Promise<AuditItemOtherCommentUserTag[]> {
    return await this.otherUserDetailRepository.find({
      where: { userId, active: true },
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    itemId: number,
    createDto: CreateAuditUserDto,
  ): Promise<AuditItemOtherCommentUserTag> {
    // Check if user already tagged
    const existing = await this.otherUserDetailRepository.findOne({
      where: {
        itemId,
        userId: createDto.userId,
        active: true,
      },
    });

    if (existing) {
      throw new Error('User already tagged to this item');
    }

    const newEntry = this.otherUserDetailRepository.create({
      itemId,
      userId: createDto.userId,
      createdBy: createDto.createdBy || 1, // TODO: Get from auth context
      createdAt: new Date(),
      active: true,
    });

    return await this.otherUserDetailRepository.save(newEntry);
  }

  // Remove tag (soft delete)
  async remove(itemId: number, userId: number): Promise<void> {
    const tag = await this.otherUserDetailRepository.findOne({
      where: { itemId, userId, active: true },
    });

    if (!tag) {
      throw new NotFoundException('Tagged user not found');
    }

    tag.active = false;
    await this.otherUserDetailRepository.save(tag);
  }

  // Hard delete tag
  async delete(taggedUserId: number): Promise<void> {
    const result = await this.otherUserDetailRepository.delete(taggedUserId);
    if (result.affected === 0) {
      throw new NotFoundException('Tagged user not found');
    }
  }
}
