// ==========================================
// audit-item-am-details.service.ts
// ==========================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditItemAMDetail } from '../domain/model/audit-item-am-detail.entity';
import {
  CreateCommentDto,
  UpdateCommentDto,
  ApproveCommentDto,
} from '../dto/comment.dto';

@Injectable()
export class AuditItemAMDetailsService {
  constructor(
    @InjectRepository(AuditItemAMDetail)
    private readonly amDetailsRepository: Repository<AuditItemAMDetail>,
  ) {}

  // Create new AM comment
  async create(createDto: CreateCommentDto): Promise<AuditItemAMDetail> {
    const amDetail = this.amDetailsRepository.create({
      itemId: createDto.itemId,
      userId: createDto.userId,
      note: createDto.note,
      approverStatus: createDto.approverStatus,
      createdBy: createDto.createdBy,
      active: true,
    });

    return await this.amDetailsRepository.save(amDetail);
  }

  // Get all AM comments for an item
  async findByItemId(itemId: number): Promise<AuditItemAMDetail[]> {
    return await this.amDetailsRepository.find({
      where: { itemId, active: true },
      order: { createdAt: 'ASC' },
    });
  }

  // Get single AM comment
  async findOne(id: number): Promise<AuditItemAMDetail> {
    const amDetail = await this.amDetailsRepository.findOne({
      where: { amDetailId: id, active: true },
    });

    if (!amDetail) {
      throw new NotFoundException(`AM Detail with ID ${id} not found`);
    }

    return amDetail;
  }

  // Update AM comment
  async update(
    id: number,
    updateDto: UpdateCommentDto,
  ): Promise<AuditItemAMDetail> {
    const amDetail = await this.findOne(id);

    if (updateDto.note) amDetail.note = updateDto.note;
    amDetail.updateBy = updateDto.updatedBy;

    return await this.amDetailsRepository.save(amDetail);
  }

  // Approve/Reject AM comment
  async approve(
    id: number,
    approveDto: ApproveCommentDto,
  ): Promise<AuditItemAMDetail> {
    const amDetail = await this.findOne(id);

    amDetail.approverStatus = approveDto.approverStatus;
    amDetail.approverBy = approveDto.approverBy;
    amDetail.approverDate = new Date();
    amDetail.updateBy = approveDto.approverBy;

    return await this.amDetailsRepository.save(amDetail);
  }

  // Soft delete
  async remove(id: number, updatedBy: number): Promise<void> {
    const amDetail = await this.findOne(id);
    amDetail.active = false;
    amDetail.updateBy = updatedBy;
    await this.amDetailsRepository.save(amDetail);
  }

  // Hard delete
  async delete(id: number): Promise<void> {
    const result = await this.amDetailsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`AM Detail with ID ${id} not found`);
    }
  }

  // Get pending approvals
  async findPendingByItemId(itemId: number): Promise<AuditItemAMDetail[]> {
    return await this.amDetailsRepository.find({
      where: { itemId, approverStatus: 0, active: true },
      order: { createdAt: 'ASC' },
    });
  }

  // Get approved comments
  async findApprovedByItemId(itemId: number): Promise<AuditItemAMDetail[]> {
    return await this.amDetailsRepository.find({
      where: { itemId, approverStatus: 1, active: true },
      order: { createdAt: 'ASC' },
    });
  }
}
