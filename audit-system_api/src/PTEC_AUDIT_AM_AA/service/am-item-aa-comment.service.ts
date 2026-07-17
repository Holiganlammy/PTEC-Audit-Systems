import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AMItemAAComment } from '../domain/model/am-item-aa-comment.entity';
import {
  CreateCommentDto,
  UpdateCommentDto,
  ApproveCommentDto,
} from '../dto/comment.dto';

@Injectable()
export class AMItemAACommentService {
  constructor(
    @InjectRepository(AMItemAAComment)
    private readonly aaCommentRepository: Repository<AMItemAAComment>,
  ) {}

  async create(createDto: CreateCommentDto): Promise<AMItemAAComment> {
    const comment = this.aaCommentRepository.create({
      itemId: createDto.itemId,
      userId: createDto.userId,
      note: createDto.note,
      approverStatus: createDto.approverStatus,
      createdBy: createDto.createdBy,
      replyToId: createDto.replyToId ?? null,
      active: true,
    });
    return await this.aaCommentRepository.save(comment);
  }

  async findByItemId(itemId: number): Promise<AMItemAAComment[]> {
    return await this.aaCommentRepository.find({
      where: { itemId, active: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: number): Promise<AMItemAAComment> {
    const comment = await this.aaCommentRepository.findOne({
      where: { aaDetailId: id, active: true },
    });
    if (!comment) {
      throw new NotFoundException(`AA Comment with ID ${id} not found`);
    }
    return comment;
  }

  async update(id: number, updateDto: UpdateCommentDto): Promise<AMItemAAComment> {
    const comment = await this.findOne(id);
    if (updateDto.note) comment.note = updateDto.note;
    comment.updateBy = updateDto.updatedBy;
    return await this.aaCommentRepository.save(comment);
  }

  async approve(id: number, approveDto: ApproveCommentDto): Promise<AMItemAAComment> {
    const comment = await this.findOne(id);
    comment.approverStatus = approveDto.approverStatus;
    comment.approverBy = approveDto.approverBy;
    comment.approverDate = new Date();
    comment.updateBy = approveDto.approverBy;
    return await this.aaCommentRepository.save(comment);
  }

  async remove(id: number, updatedBy: number, deleteReason: string): Promise<void> {
    const comment = await this.findOne(id);
    comment.active = false;
    comment.updateBy = updatedBy;
    comment.deletedBy = updatedBy;
    comment.deletedAt = new Date();
    comment.deletedReason = deleteReason;
    await this.aaCommentRepository.save(comment);
  }
}
