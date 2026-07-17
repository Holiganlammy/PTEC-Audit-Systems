// ==========================================
// audit-item-am-comment.service.ts
// ==========================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AMItemAMComment } from '../domain/model/am-item-am-comment.entity';
import {
  CreateCommentDto,
  UpdateCommentDto,
  ApproveCommentDto,
} from '../dto/comment.dto';

@Injectable()
export class AMItemAMCommentsService {
  constructor(
    @InjectRepository(AMItemAMComment)
    private readonly amCommentsRepository: Repository<AMItemAMComment>,
  ) {}

  // Create new AM comment
  async create(createDto: CreateCommentDto): Promise<AMItemAMComment> {
    const amComment = this.amCommentsRepository.create({
      itemId: createDto.itemId,
      userId: createDto.userId,
      note: createDto.note,
      approverStatus: createDto.approverStatus,
      createdBy: createDto.createdBy,
      replyToId: createDto.replyToId ?? null,
      active: true,
    });

    return await this.amCommentsRepository.save(amComment);
  }

  // Get all AM comments for an item
  async findByItemId(itemId: number): Promise<AMItemAMComment[]> {
    return await this.amCommentsRepository.find({
      where: { itemId, active: true },
      order: { createdAt: 'ASC' },
    });
  }

  // Get single AM comment
  async findOne(id: number): Promise<AMItemAMComment> {
    const amComment = await this.amCommentsRepository.findOne({
      where: { amDetailId: id, active: true },
    });

    if (!amComment) {
      throw new NotFoundException(`AM Comment with ID ${id} not found`);
    }

    return amComment;
  }

  // Update AM comment
  async update(
    id: number,
    updateDto: UpdateCommentDto,
  ): Promise<AMItemAMComment> {
    const amComment = await this.findOne(id);

    if (updateDto.note) amComment.note = updateDto.note;
    amComment.updateBy = updateDto.updatedBy;

    return await this.amCommentsRepository.save(amComment);
  }

  // Approve/Reject AM comment
  async approve(
    id: number,
    approveDto: ApproveCommentDto,
  ): Promise<AMItemAMComment> {
    const amComment = await this.findOne(id);

    amComment.approverStatus = approveDto.approverStatus;
    amComment.approverBy = approveDto.approverBy;
    amComment.approverDate = new Date();
    amComment.updateBy = approveDto.approverBy;

    return await this.amCommentsRepository.save(amComment);
  }

  // Soft delete
  async remove(
    id: number,
    updatedBy: number,
    deletedReason: string,
  ): Promise<void> {
    const amComment = await this.findOne(id);
    amComment.active = false;
    amComment.updateBy = updatedBy;
    amComment.deletedBy = updatedBy;
    amComment.deletedAt = new Date();
    amComment.deletedReason = deletedReason;
    await this.amCommentsRepository.save(amComment);
  }

  // Hard delete
  async delete(id: number): Promise<void> {
    const result = await this.amCommentsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`AM Comment with ID ${id} not found`);
    }
  }

  // Get pending approvals
  async findPendingByItemId(itemId: number): Promise<AMItemAMComment[]> {
    return await this.amCommentsRepository.find({
      where: { itemId, approverStatus: 0, active: true },
      order: { createdAt: 'ASC' },
    });
  }

  // Get approved comments
  async findApprovedByItemId(itemId: number): Promise<AMItemAMComment[]> {
    return await this.amCommentsRepository.find({
      where: { itemId, approverStatus: 1, active: true },
      order: { createdAt: 'ASC' },
    });
  }
}
