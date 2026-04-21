import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditItemAuditDetail } from '../domain/model/audit-item-audit-detail.entity';
import {
  CreateCommentDto,
  UpdateCommentDto,
  ApproveCommentDto,
} from '../dto/comment.dto';

@Injectable()
export class AuditItemAuditDetailsService {
  constructor(
    @InjectRepository(AuditItemAuditDetail)
    private readonly auditDetailsRepository: Repository<AuditItemAuditDetail>,
  ) {}

  async create(createDto: CreateCommentDto): Promise<AuditItemAuditDetail> {
    console.log('Creating audit detail with DTO:', createDto);
    const auditDetail = this.auditDetailsRepository.create({
      itemId: createDto.itemId,
      userId: createDto.userId,
      note: createDto.note,
      approverStatus: createDto.approverStatus,
      createdBy: createDto.createdBy,
      active: true,
    });

    return await this.auditDetailsRepository.save(auditDetail);
  }

  async findByItemId(itemId: number): Promise<AuditItemAuditDetail[]> {
    return await this.auditDetailsRepository.find({
      where: { itemId, active: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: number): Promise<AuditItemAuditDetail> {
    const auditDetail = await this.auditDetailsRepository.findOne({
      where: { auditDetailId: id, active: true },
    });

    if (!auditDetail) {
      throw new NotFoundException(`Audit Detail with ID ${id} not found`);
    }

    return auditDetail;
  }

  async update(
    id: number,
    updateDto: UpdateCommentDto,
  ): Promise<AuditItemAuditDetail> {
    const auditDetail = await this.findOne(id);

    if (updateDto.note) auditDetail.note = updateDto.note;
    auditDetail.updateBy = updateDto.updatedBy;

    return await this.auditDetailsRepository.save(auditDetail);
  }

  async approve(
    id: number,
    approveDto: ApproveCommentDto,
  ): Promise<AuditItemAuditDetail> {
    const auditDetail = await this.findOne(id);

    auditDetail.approverStatus = approveDto.approverStatus;
    auditDetail.approverBy = approveDto.approverBy;
    auditDetail.approverDate = new Date();
    auditDetail.updateBy = approveDto.approverBy;

    return await this.auditDetailsRepository.save(auditDetail);
  }

  async remove(
    id: number,
    updatedBy: number,
    deleteReason: string,
  ): Promise<void> {
    const auditDetail = await this.findOne(id);
    auditDetail.active = false;
    auditDetail.updateBy = updatedBy;
    auditDetail.deletedBy = updatedBy;
    auditDetail.deletedAt = new Date();
    auditDetail.deletedReason = deleteReason;
    await this.auditDetailsRepository.save(auditDetail);
  }

  async delete(id: number): Promise<void> {
    const result = await this.auditDetailsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Audit Detail with ID ${id} not found`);
    }
  }

  async findPendingByItemId(itemId: number): Promise<AuditItemAuditDetail[]> {
    return await this.auditDetailsRepository.find({
      where: { itemId, approverStatus: 0, active: true },
      order: { createdAt: 'ASC' },
    });
  }
}
