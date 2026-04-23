import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditItem } from '../domain/model/audit-item.entity';
import { CreateAuditItemDto } from '../dto/create-audit-item.dto';
import { UpdateAuditItemDto } from '../dto/update-audit-item.dto';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';
import { UserData, UserInfo } from '../domain/type/audit-job.interface';
import { AuditItemOtherDetailsUser } from '../domain/model/audit-item-other-details-users.entity';

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
  async findAll(
    filters?: {
      jobId?: number;
      search?: string;
    },
    user?: UserInfo,
  ): Promise<AuditItem[]> {
    const query = this.auditItemsRepository.createQueryBuilder('item');

    if (filters?.jobId !== undefined) {
      query.andWhere('item.jobId = :jobId', { jobId: filters.jobId });
    }

    // Search (category name, remarks)
    if (filters?.search && filters.search.trim()) {
      query.andWhere(
        `(
        categoryItem.category_name LIKE :search 
        OR item.remarks LIKE :search
      )`,
        { search: `%${filters.search}%` },
      );
    }

    query.leftJoinAndSelect('item.job', 'job');

    // Permission Filter (ถ้ามี user)
    if (user) {
      const roleId = user.role_id;
      const userId = user.user_id;

      if (roleId === 1 || roleId === 2) {
        // Role 1, 2: เห็นทุก item
      } else if (roleId === 3) {
        // Role 3: เห็น item ของ job ที่เป็น district_manager
        query.andWhere('job.districtManagerUserId = :userId', { userId });
      } else if (roleId === 4) {
        // Role 4: เห็นทุก item
      } else if (roleId === 5) {
        // Role 5: เห็นเฉพาะ item ที่ถูก tag
        query.andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('1')
            .from(AuditItem, 'item')
            .innerJoin(
              AuditItemOtherDetailsUser,
              'tag',
              'tag.itemId = item.itemId AND tag.active = :tagActive',
              { tagActive: true },
            )
            .where('item.jobId = job.jobId')
            .andWhere('tag.userId = :userId', { userId })
            .getQuery();
          return `EXISTS ${subQuery}`;
        });
      } else if (roleId === 6) {
        // Role 6: เห็น item ของ job ที่เป็น branch_manager
        query.andWhere('job.branchManagerUserId = :userId', { userId });
      } else {
        // ไม่ใช่ role ที่กำหนด
        query.andWhere('1 = 0');
      }
    }
    query.leftJoinAndSelect('item.categoryItem', 'categoryItem');
    query.orderBy('item.createdAt', 'DESC');

    const items = await query.getMany();

    return items;
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
        'amChecklistStatusRelation',
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
  async findByItemsJobAuditId(
    filters?: {
      jobId?: number;
      search?: string;
    },
    user?: UserInfo,
  ): Promise<any[]> {
    const query = this.auditItemsRepository.createQueryBuilder('item');

    const roleId = user?.role_id;
    const userId = user?.user_id;

    // console.log('🔒 Filtering items:', { roleId, userId, filters });

    if (roleId === 1 || roleId === 2) {
      // เห็นทุก item
      query.where('item.jobId = :jobId', { jobId: filters?.jobId });
    } else if (roleId === 3) {
      // เห็น item ถ้าเป็น district_manager ของ job
      query
        .innerJoin('item.job', 'job')
        .where('item.jobId = :jobId', { jobId: filters?.jobId })
        .andWhere('job.districtManagerUserId = :userId', { userId });
    } else if (roleId === 4) {
      // เห็นทุก item
      query.where('item.jobId = :jobId', { jobId: filters?.jobId });
    } else if (roleId === 5) {
      // เห็นเฉพาะ item ที่ถูก tag
      query
        .where('item.jobId = :jobId', { jobId: filters?.jobId })
        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('1')
            .from(AuditItemOtherDetailsUser, 'tag')
            .where('tag.itemId = item.itemId')
            .andWhere('tag.userId = :userId', { userId })
            .andWhere('tag.active = :tagActive', { tagActive: true })
            .getQuery();
          return `EXISTS ${subQuery}`;
        });
    } else if (roleId === 6) {
      // เห็น item ถ้าเป็น branch_manager ของ job
      query
        .innerJoin('item.job', 'job')
        .where('item.jobId = :jobId', { jobId: filters?.jobId })
        .andWhere('job.branchManagerUserId = :userId', { userId });
    } else {
      query.where('1 = 0'); // ไม่เห็นอะไร
    }
    if (filters?.search && filters.search.trim()) {
      query.andWhere(
        `(
          categoryItem.category_name LIKE :search 
          OR item.remarks LIKE :search
        )`,
        { search: `%${filters.search.trim()}%` },
      );
      // console.log('🔍 Searching for:', filters.search.trim());
    }
    query
      .andWhere('item.active = :active', { active: true })
      .leftJoinAndSelect('item.categoryItem', 'categoryItem')
      .leftJoinAndSelect('item.amDetails', 'amDetails')
      .leftJoinAndSelect('item.auditDetails', 'auditDetails')
      .leftJoinAndSelect('item.otherDetails', 'otherDetails')
      .leftJoinAndSelect('item.itemStatusRelation', 'itemStatusRelation')
      .leftJoinAndSelect(
        'item.amChecklistStatusRelation',
        'amChecklistStatusRelation',
      )
      .leftJoinAndSelect(
        'item.itemStatusEditRelation',
        'itemStatusEditRelation',
      )
      .orderBy('item.inspectionDate', 'ASC');

    const items = await query.getMany();

    return await Promise.all(
      items.map(async (item) => {
        const [amDetailsEnriched, auditDetailsEnriched, otherDetailsEnriched] =
          await Promise.all([
            Promise.all(
              (item.amDetails || [])
                .filter((d) => d.active)
                .map(async (detail) => {
                  const { userId, approverBy, ...rest } = detail;
                  const [OwnerCommentUser, approverByUser] = await Promise.all([
                    this.getUserData(userId),
                    this.getUserData(approverBy),
                  ]);
                  return { ...rest, OwnerCommentUser, approverByUser };
                }),
            ),
            Promise.all(
              (item.auditDetails || [])
                .filter((d) => d.active)
                .map(async (detail) => {
                  const { userId, approverBy, ...rest } = detail;
                  const [OwnerCommentUser, approverByUser] = await Promise.all([
                    this.getUserData(userId),
                    this.getUserData(approverBy),
                  ]);
                  return { ...rest, OwnerCommentUser, approverByUser };
                }),
            ),
            Promise.all(
              (item.otherDetails || [])
                .filter((d) => d.active)
                .map(async (detail) => {
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

  // async updateBranchScore(id: number, score: number): Promise<AuditItem> {
  //   const auditItem = await this.findOne(id);
  //   auditItem.branchAuditScore = score;
  //   return await this.auditItemsRepository.save(auditItem);
  // }

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
  async updateAMChecklist(
    itemId: number,
    data: {
      status: number;
      detail?: string;
      checkedBy: number;
    },
  ): Promise<AuditItem> {
    const auditItem = await this.auditItemsRepository.findOne({
      where: { itemId },
    });

    if (!auditItem) {
      throw new NotFoundException(`Audit Item with ID ${itemId} not found`);
    }

    // Update AM Checklist fields
    auditItem.amChecklistStatus = data.status;
    auditItem.amChecklistDetail = data.detail || null;
    auditItem.amChecklistBy = data.checkedBy;
    auditItem.amChecklistAt = new Date();

    return await this.auditItemsRepository.save(auditItem);
  }

  async getAMChecklist(itemId: number): Promise<{
    status: number | null;
    detail: string | null;
    checkedBy: number | null;
    checkedAt: Date | null;
    checkedByUser?: UserData;
  }> {
    const auditItem = await this.auditItemsRepository.findOne({
      where: { itemId },
      select: [
        'itemId',
        'amChecklistStatus',
        'amChecklistDetail',
        'amChecklistBy',
        'amChecklistAt',
      ],
    });

    if (!auditItem) {
      throw new NotFoundException(`Audit Item with ID ${itemId} not found`);
    }

    // Get user data ถ้ามี checkedBy
    let checkedByUser: UserData | undefined;
    if (auditItem.amChecklistBy) {
      checkedByUser = await this.getUserData(auditItem.amChecklistBy);
    }

    return {
      status: auditItem.amChecklistStatus,
      detail: auditItem.amChecklistDetail,
      checkedBy: auditItem.amChecklistBy,
      checkedAt: auditItem.amChecklistAt,
      checkedByUser,
    };
  }

  async clearAMChecklist(itemId: number): Promise<AuditItem> {
    const auditItem = await this.auditItemsRepository.findOne({
      where: { itemId },
    });

    if (!auditItem) {
      throw new NotFoundException(`Audit Item with ID ${itemId} not found`);
    }

    // Clear all AM Checklist fields
    auditItem.amChecklistStatus = null;
    auditItem.amChecklistDetail = null;
    auditItem.amChecklistBy = null;
    auditItem.amChecklistAt = null;

    return await this.auditItemsRepository.save(auditItem);
  }
}
