import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditItemOtherComment } from '../domain/model/audit-item-other-comment.entity';
import {
  CreateCommentDto,
  UpdateCommentDto,
  ApproveCommentDto,
} from '../dto/comment.dto';

@Injectable()
export class AuditItemOtherCommentService {
  constructor(
    @InjectRepository(AuditItemOtherComment)
    private readonly otherCommentRepository: Repository<AuditItemOtherComment>,
  ) {}

  async create(createDto: CreateCommentDto): Promise<AuditItemOtherComment> {
    const otherComment = this.otherCommentRepository.create({
      itemId: createDto.itemId,
      userId: createDto.userId,
      note: createDto.note,
      approverStatus: createDto.approverStatus,
      createdBy: createDto.createdBy,
      createdAt: new Date(),
      replyToId: createDto.replyToId ?? null,
      active: true,
    });

    return await this.otherCommentRepository.save(otherComment);
  }

  async findByItemId(itemId: number): Promise<AuditItemOtherComment[]> {
    return await this.otherCommentRepository.find({
      where: { itemId, active: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: number): Promise<AuditItemOtherComment> {
    const otherComment = await this.otherCommentRepository.findOne({
      where: { otherDetailId: id, active: true },
    });

    if (!otherComment) {
      throw new NotFoundException(`Other Comment with ID ${id} not found`);
    }

    return otherComment;
  }

  async update(
    id: number,
    updateDto: UpdateCommentDto,
  ): Promise<AuditItemOtherComment> {
    const otherComment = await this.findOne(id);

    if (updateDto.note) otherComment.note = updateDto.note;
    otherComment.updatedBy = updateDto.updatedBy;

    return await this.otherCommentRepository.save(otherComment);
  }

  async approve(
    id: number,
    approveDto: ApproveCommentDto,
  ): Promise<AuditItemOtherComment> {
    const otherComment = await this.findOne(id);

    otherComment.approverStatus = approveDto.approverStatus;
    otherComment.approverBy = approveDto.approverBy;
    otherComment.approverDate = new Date();
    otherComment.updatedBy = approveDto.approverBy;

    return await this.otherCommentRepository.save(otherComment);
  }

  async remove(
    id: number,
    updatedBy: number,
    deletedReason: string,
  ): Promise<void> {
    const otherComment = await this.findOne(id);
    otherComment.active = false;
    otherComment.updatedBy = updatedBy;
    otherComment.deletedBy = updatedBy;
    otherComment.deletedAt = new Date();
    otherComment.deletedReason = deletedReason;
    await this.otherCommentRepository.save(otherComment);
  }

  async delete(id: number): Promise<void> {
    const result = await this.otherCommentRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Other Comment with ID ${id} not found`);
    }
  }

  async findPendingByItemId(itemId: number): Promise<AuditItemOtherComment[]> {
    return await this.otherCommentRepository.find({
      where: { itemId, approverStatus: 0, active: true },
      order: { createdAt: 'ASC' },
    });
  }
}
