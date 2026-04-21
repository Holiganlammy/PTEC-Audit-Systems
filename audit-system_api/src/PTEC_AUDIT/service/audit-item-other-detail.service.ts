import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditItemOtherDetails } from '../domain/model/audit-item-other-details.entity';
import {
  CreateCommentDto,
  UpdateCommentDto,
  ApproveCommentDto,
} from '../dto/comment.dto';

@Injectable()
export class AuditItemOtherDetailsService {
  constructor(
    @InjectRepository(AuditItemOtherDetails)
    private readonly otherDetailsRepository: Repository<AuditItemOtherDetails>,
  ) {}

  async create(createDto: CreateCommentDto): Promise<AuditItemOtherDetails> {
    const otherDetail = this.otherDetailsRepository.create({
      itemId: createDto.itemId,
      userId: createDto.userId,
      note: createDto.note,
      approverStatus: createDto.approverStatus,
      createdBy: createDto.createdBy,
      createdAt: new Date(),
      active: true,
    });

    return await this.otherDetailsRepository.save(otherDetail);
  }

  async findByItemId(itemId: number): Promise<AuditItemOtherDetails[]> {
    return await this.otherDetailsRepository.find({
      where: { itemId, active: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: number): Promise<AuditItemOtherDetails> {
    const otherDetail = await this.otherDetailsRepository.findOne({
      where: { otherDetailId: id, active: true },
    });

    if (!otherDetail) {
      throw new NotFoundException(`Other Detail with ID ${id} not found`);
    }

    return otherDetail;
  }

  async update(
    id: number,
    updateDto: UpdateCommentDto,
  ): Promise<AuditItemOtherDetails> {
    const otherDetail = await this.findOne(id);

    if (updateDto.note) otherDetail.note = updateDto.note;
    otherDetail.updatedBy = updateDto.updatedBy;

    return await this.otherDetailsRepository.save(otherDetail);
  }

  async approve(
    id: number,
    approveDto: ApproveCommentDto,
  ): Promise<AuditItemOtherDetails> {
    const otherDetail = await this.findOne(id);

    otherDetail.approverStatus = approveDto.approverStatus;
    otherDetail.approverBy = approveDto.approverBy;
    otherDetail.approverDate = new Date();
    otherDetail.updatedBy = approveDto.approverBy;

    return await this.otherDetailsRepository.save(otherDetail);
  }

  async remove(
    id: number,
    updatedBy: number,
    deletedReason: string,
  ): Promise<void> {
    const otherDetail = await this.findOne(id);
    otherDetail.active = false;
    otherDetail.updatedBy = updatedBy;
    otherDetail.deletedBy = updatedBy;
    otherDetail.deletedAt = new Date();
    otherDetail.deletedReason = deletedReason;
    await this.otherDetailsRepository.save(otherDetail);
  }

  async delete(id: number): Promise<void> {
    const result = await this.otherDetailsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Other Detail with ID ${id} not found`);
    }
  }

  async findPendingByItemId(itemId: number): Promise<AuditItemOtherDetails[]> {
    return await this.otherDetailsRepository.find({
      where: { itemId, approverStatus: 0, active: true },
      order: { createdAt: 'ASC' },
    });
  }
}
