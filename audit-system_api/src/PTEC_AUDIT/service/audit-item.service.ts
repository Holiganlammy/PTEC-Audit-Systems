import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditItem } from '../domain/audit-item.entity';
import { CreateAuditItemDto } from '../dto/create-audit-item.dto';
import { UpdateAuditItemDto } from '../dto/update-audit-item.dto';

@Injectable()
export class AuditItemsService {
  constructor(
    @InjectRepository(AuditItem)
    private readonly auditItemsRepository: Repository<AuditItem>,
  ) {}

  // Create new audit item
  async create(createAuditItemDto: CreateAuditItemDto): Promise<AuditItem> {
    const auditItem = this.auditItemsRepository.create(createAuditItemDto);
    return await this.auditItemsRepository.save(auditItem);
  }

  // Create multiple audit items at once
  async createMany(
    createAuditItemDtos: CreateAuditItemDto[],
  ): Promise<AuditItem[]> {
    const auditItems = this.auditItemsRepository.create(createAuditItemDtos);
    return await this.auditItemsRepository.save(auditItems);
  }

  // Get all audit items with filters
  async findAll(filters?: {
    jobId?: number;
    categoryItemId?: number;
    itemStatus?: number;
    active?: boolean;
  }): Promise<AuditItem[]> {
    const query = this.auditItemsRepository.createQueryBuilder('item');

    if (filters?.jobId !== undefined) {
      query.andWhere('item.jobId = :jobId', { jobId: filters.jobId });
    }

    if (filters?.categoryItemId !== undefined) {
      query.andWhere('item.categoryItemId = :categoryItemId', {
        categoryItemId: filters.categoryItemId,
      });
    }

    if (filters?.itemStatus !== undefined) {
      query.andWhere('item.itemStatus = :itemStatus', {
        itemStatus: filters.itemStatus,
      });
    }

    if (filters?.active !== undefined) {
      query.andWhere('item.active = :active', { active: filters.active });
    }

    query.leftJoinAndSelect('item.categoryItem', 'categoryItem');
    query.leftJoinAndSelect('item.job', 'job');

    return await query.getMany();
  }

  // Get audit item by ID with all relations
  async findOne(id: number): Promise<AuditItem> {
    const auditItem = await this.auditItemsRepository.findOne({
      where: { itemId: id },
      relations: [
        'job',
        'categoryItem',
        'amDetail',
        'auditDetail',
        'relatedAgencies',
        'taggedUsers',
      ],
    });

    if (!auditItem) {
      throw new NotFoundException(`Audit Item with ID ${id} not found`);
    }

    return auditItem;
  }

  // Get all items for a specific job
  async findByJobId(jobId: number): Promise<AuditItem[]> {
    return await this.auditItemsRepository.find({
      where: { jobId, active: true },
      relations: ['categoryItem', 'amDetail', 'auditDetail'],
    });
  }

  // Get items by category
  async findByCategoryId(categoryItemId: number): Promise<AuditItem[]> {
    return await this.auditItemsRepository.find({
      where: { categoryItemId, active: true },
      relations: ['job', 'categoryItem'],
    });
  }

  // Update audit item
  async update(
    id: number,
    updateAuditItemDto: UpdateAuditItemDto,
  ): Promise<AuditItem> {
    const auditItem = await this.findOne(id);

    Object.assign(auditItem, updateAuditItemDto);

    return await this.auditItemsRepository.save(auditItem);
  }

  // Soft delete
  async remove(id: number): Promise<void> {
    const auditItem = await this.findOne(id);
    auditItem.active = false;
    await this.auditItemsRepository.save(auditItem);
  }

  // Hard delete
  async delete(id: number): Promise<void> {
    const result = await this.auditItemsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Audit Item with ID ${id} not found`);
    }
  }

  // Update item status
  async updateStatus(id: number, status: number): Promise<AuditItem> {
    const auditItem = await this.findOne(id);
    auditItem.itemStatus = status;
    return await this.auditItemsRepository.save(auditItem);
  }
}
