import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditItem } from '../domain/model/audit-item.entity';
import { CreateAuditItemDto } from '../dto/create-audit-item.dto';
import { UpdateAuditItemDto } from '../dto/update-audit-item.dto';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';
import { UserData } from '../domain/type/audit-job.interface';

@Injectable()
export class AuditItemsService {
  constructor(
    @InjectRepository(AuditItem)
    private readonly auditItemsRepository: Repository<AuditItem>,
    private readonly userRightService: UserRightService,
  ) {}

  private async getUserData(
    userId: number | null,
  ): Promise<UserData | undefined> {
    if (!userId) return undefined;
    try {
      const users = await this.userRightService.getUsersFromProcedure(
        null,
        userId,
      );
      if (users && users.length > 0) {
        const user = users[0];
        return {
          userCode: user.UserCode,
          fullname: user.fristName ? user.fristName + ' ' + user.lastName : '',
          firstName: user.fristName || '',
          lastName: user.lastName || '',
          email: user.Email,
          position: user.Position,
          branchId: user.BranchID,
          userId: user.UserID,
        };
      }
    } catch (error) {
      console.error(`Error fetching user data for userId ${userId}:`, error);
    }
    return undefined;
  }

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
        'itemStatusRelation',
        'itemStatusEditRelation',
        'amDetails',
        'auditDetails',
        'otherDetails',
        'taggedUsers',
      ],
    });

    if (!auditItem) {
      throw new NotFoundException(`Audit Item with ID ${id} not found`);
    }

    return auditItem;
  }

  // Get all items for a specific job with comments
  async findByItemsJobAuditId(jobId: number): Promise<any[]> {
    const items = await this.auditItemsRepository.find({
      where: { jobId, active: true },
      relations: [
        'categoryItem',
        'amDetails',
        'auditDetails',
        'otherDetails',
        'itemStatusRelation',
        'itemStatusEditRelation',
      ],
      order: { inspectionDate: 'ASC' },
    });

    return await Promise.all(
      items.map(async (item) => {
        const [amDetailsEnriched, auditDetailsEnriched, otherDetailsEnriched] =
          await Promise.all([
            Promise.all(
              (item.amDetails || []).map(async (detail) => {
                const { userId, approverBy, ...rest } = detail;
                const [OwnerCommentUser, approverByUser] = await Promise.all([
                  this.getUserData(userId),
                  this.getUserData(approverBy),
                ]);
                return { ...rest, OwnerCommentUser, approverByUser };
              }),
            ),
            Promise.all(
              (item.auditDetails || []).map(async (detail) => {
                const { userId, approverBy, ...rest } = detail;
                const [OwnerCommentUser, approverByUser] = await Promise.all([
                  this.getUserData(userId),
                  this.getUserData(approverBy),
                ]);
                return { ...rest, OwnerCommentUser, approverByUser };
              }),
            ),
            Promise.all(
              (item.otherDetails || []).map(async (detail) => {
                const { userId, approverBy, ...rest } = detail;
                const [OwnerCommentUser, approverByUser] = await Promise.all([
                  this.getUserData(userId),
                  this.getUserData(approverBy),
                ]);
                return { ...rest, OwnerCommentUser, approverByUser };
              }),
            ),
          ]);

        return {
          ...item,
          amDetails: amDetailsEnriched,
          auditDetails: auditDetailsEnriched,
          otherDetails: otherDetailsEnriched,
        };
      }),
    );
  }

  // Get items by category
  async findByCategoryId(categoryItemId: number): Promise<AuditItem[]> {
    return await this.auditItemsRepository.find({
      where: { categoryItemId, active: true },
      relations: [
        'job',
        'categoryItem',
        'itemStatusRelation',
        'itemStatusEditRelation',
      ],
    });
  }

  // Update audit item
  async update(
    id: number,
    updateAuditItemDto: UpdateAuditItemDto,
  ): Promise<AuditItem> {
    const auditItem = await this.auditItemsRepository.findOne({
      where: { itemId: id },
    });
    if (!auditItem) {
      throw new NotFoundException(`Audit Item with ID ${id} not found`);
    }

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

  //Get items with comment counts
  async findByJobIdWithCounts(jobId: number): Promise<any[]> {
    const items = await this.auditItemsRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.categoryItem', 'category')
      .leftJoin('item.amDetails', 'am')
      .leftJoin('item.auditDetails', 'audit')
      .leftJoin('item.otherDetails', 'other')
      .where('item.jobId = :jobId', { jobId })
      .andWhere('item.active = :active', { active: true })
      .select(['item', 'category'])
      .addSelect('COUNT(DISTINCT am.amDetailId)', 'amCommentCount')
      .addSelect('COUNT(DISTINCT audit.auditDetailId)', 'auditCommentCount')
      .addSelect('COUNT(DISTINCT other.otherDetailId)', 'otherCommentCount')
      .groupBy('item.itemId')
      .addGroupBy('category.categoryItemId')
      .getRawAndEntities();

    return items.entities.map((item, index) => {
      const rawData = items.raw[index] as Record<string, string>;
      return {
        ...item,
        commentCounts: {
          am: parseInt(rawData.amCommentCount) || 0,
          audit: parseInt(rawData.auditCommentCount) || 0,
          other: parseInt(rawData.otherCommentCount) || 0,
        },
      };
    });
  }

  // Get pending approval count for a job
  async getPendingApprovalCount(jobId: number): Promise<number> {
    const result = await this.auditItemsRepository
      .createQueryBuilder('item')
      .leftJoin('item.amDetails', 'am')
      .leftJoin('item.auditDetails', 'audit')
      .leftJoin('item.otherDetails', 'other')
      .where('item.jobId = :jobId', { jobId })
      .andWhere('item.active = :active', { active: true })
      .andWhere(
        '(am.approverStatus = 0 OR audit.approverStatus = 0 OR other.approverStatus = 0)',
      )
      .getCount();
    return result;
  }
}
