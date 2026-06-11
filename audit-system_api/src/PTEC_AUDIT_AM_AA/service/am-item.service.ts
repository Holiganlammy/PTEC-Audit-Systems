import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AMItem } from '../domain/model/am-item.entity';
import { CreateAuditItemDto } from '../dto/create-audit-item.dto';
import { UpdateAuditItemDto } from '../dto/update-audit-item.dto';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';
import { UserData, UserInfo } from '../domain/type/audit-job.interface';
import { AMItemOtherCommentUsersTag } from '../domain/model/am-item-other-comment-users-tag.entity';
import { AuditCategoryItem } from '../domain/model/audit-category-item.entity';

@Injectable()
export class AMItemsService {
  constructor(
    @InjectRepository(AMItem)
    private readonly AMItemsRepository: Repository<AMItem>,
    @InjectRepository(AuditCategoryItem)
    private readonly categoryRepository: Repository<AuditCategoryItem>,
    private readonly userRightService: UserRightService,
  ) {}

  private async resolveJobSource(
    dto: CreateAuditItemDto,
  ): Promise<'AM' | 'AA'> {
    const dtoJobSource = (dto as { jobSource?: unknown }).jobSource;
    const explicit =
      typeof dtoJobSource === 'string' ? dtoJobSource.toUpperCase() : undefined;
    if (explicit === 'AM' || explicit === 'AA') {
      return explicit;
    }

    if (dto.categoryItemId) {
      const category = await this.categoryRepository.findOne({
        where: { categoryItemId: dto.categoryItemId },
      });
      const categoryType = category?.positionType?.toUpperCase();
      if (categoryType === 'AM' || categoryType === 'AA') {
        return categoryType;
      }
    }

    return 'AM';
  }

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
  async create(createAuditItemDto: CreateAuditItemDto): Promise<AMItem> {
    const jobSource = await this.resolveJobSource(createAuditItemDto);
    const AMItem = this.AMItemsRepository.create({
      ...createAuditItemDto,
      jobSource,
    });
    return await this.AMItemsRepository.save(AMItem);
  }

  // Create multiple audit items at once
  async createMany(
    createAuditItemDtos: CreateAuditItemDto[],
  ): Promise<AMItem[]> {
    const items = await Promise.all(
      createAuditItemDtos.map(async (dto) => {
        const jobSource = await this.resolveJobSource(dto);
        return this.AMItemsRepository.create({
          ...dto,
          jobSource,
        });
      }),
    );
    return await this.AMItemsRepository.save(items);
  }

  // Get all audit items with filters
  async findAll(
    filters?: {
      jobId?: number;
      search?: string;
    },
    user?: UserInfo,
  ): Promise<AMItem[]> {
    const query = this.AMItemsRepository.createQueryBuilder('item');

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

      if (roleId === 1) {
        // Role 1 (Admin): เห็นทุก item
      } else if (roleId === 3) {
        // Role 3 (AM): เห็น item ของ job ที่ตัวเองเป็น AM หรือเป็นคนสร้าง
        query.andWhere('(job.amUserId = :userId OR job.createdBy = :userId)', {
          userId,
        });
      } else if (roleId === 4) {
        // Role 4 (RM): เห็น item ของ job ที่ตัวเองเป็น RM
        query.andWhere('job.rmUserId = :userId', { userId });
      } else if (roleId === 5) {
        // Role 5: เห็นเฉพาะ item ที่ถูก tag
        query.andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('1')
            .from(AMItem, 'item')
            .innerJoin(
              AMItemOtherCommentUsersTag,
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
  async findOne(id: number): Promise<AMItem> {
    const AMItem = await this.AMItemsRepository.findOne({
      where: { itemId: id },
      relations: [
        'job',
        'categoryItem',
        'itemStatusRelation',
        'itemStatusEditRelation',
        'headerChecklistStatusRelation',
        'amComments',
        'amCheckerComments',
        'otherComments',
        'taggedUsers',
      ],
    });

    if (!AMItem) {
      throw new NotFoundException(`Audit Item with ID ${id} not found`);
    }

    return AMItem;
  }

  // Get all items for a specific job with comments
  async findByItemsJobAuditId(
    filters?: {
      jobId?: number;
      search?: string;
      jobSource?: string;
    },
    user?: UserInfo,
  ): Promise<any[]> {
    const query = this.AMItemsRepository.createQueryBuilder('item');

    const roleId = user?.role_id;
    const userId = user?.user_id;

    // console.log('🔒 Filtering items:', { roleId, userId, filters });

    const isAA = filters?.jobSource?.toUpperCase() === 'AA';
    const jobAlias = isAA ? 'item.aaJob' : 'item.job';

    if (roleId === 1) {
      // Admin: เห็นทุก item
      query.where('item.jobId = :jobId', { jobId: filters?.jobId });
    } else if (isAA) {
      // AA job — แยก permission ตาม role
      if (roleId === 3) {
        // AM: เห็น item ของ AA job ที่ตัวเองเป็น amManager หรือเป็นคนสร้าง
        query
          .innerJoin(jobAlias, 'job')
          .where('item.jobId = :jobId', { jobId: filters?.jobId })
          .andWhere(
            '(job.amManagerUserId = :userId OR job.createdBy = :userId)',
            { userId },
          );
      } else if (roleId === 4) {
        // RM: เห็น item ของ AA job ที่ตัวเองเป็น amManager
        query
          .innerJoin(jobAlias, 'job')
          .where('item.jobId = :jobId', { jobId: filters?.jobId })
          .andWhere('job.amManagerUserId = :userId', { userId });
      } else if (roleId === 8) {
        // AA: เห็น item ของ AA job ที่ตัวเองเป็น aaUser หรือเป็นคนสร้าง
        query
          .innerJoin(jobAlias, 'job')
          .where('item.jobId = :jobId', { jobId: filters?.jobId })
          .andWhere('(job.aaUserId = :userId OR job.createdBy = :userId)', {
            userId,
          });
      } else if (roleId === 5) {
        query
          .where('item.jobId = :jobId', { jobId: filters?.jobId })
          .andWhere((qb) => {
            const subQuery = qb
              .subQuery()
              .select('1')
              .from(AMItemOtherCommentUsersTag, 'tag')
              .where('tag.itemId = item.itemId')
              .andWhere('tag.userId = :userId', { userId })
              .andWhere('tag.active = :tagActive', { tagActive: true })
              .getQuery();
            return `EXISTS ${subQuery}`;
          });
      } else if (roleId === 6) {
        query
          .innerJoin(jobAlias, 'job')
          .where('item.jobId = :jobId', { jobId: filters?.jobId })
          .andWhere('job.branchManagerUserId = :userId', { userId });
      } else {
        query.where('1 = 0');
      }
    } else {
      // AM job permission
      if (roleId === 3) {
        // AM: เห็น item ของ job ที่ตัวเองเป็น AM หรือเป็นคนสร้าง
        query
          .innerJoin(jobAlias, 'job')
          .where('item.jobId = :jobId', { jobId: filters?.jobId })
          .andWhere('(job.amUserId = :userId OR job.createdBy = :userId)', {
            userId,
          });
      } else if (roleId === 4) {
        // RM: เห็น item ของ job ที่ตัวเองเป็น RM
        query
          .innerJoin(jobAlias, 'job')
          .where('item.jobId = :jobId', { jobId: filters?.jobId })
          .andWhere('job.rmUserId = :userId', { userId });
      } else if (roleId === 5) {
        query
          .where('item.jobId = :jobId', { jobId: filters?.jobId })
          .andWhere((qb) => {
            const subQuery = qb
              .subQuery()
              .select('1')
              .from(AMItemOtherCommentUsersTag, 'tag')
              .where('tag.itemId = item.itemId')
              .andWhere('tag.userId = :userId', { userId })
              .andWhere('tag.active = :tagActive', { tagActive: true })
              .getQuery();
            return `EXISTS ${subQuery}`;
          });
      } else if (roleId === 6) {
        query
          .innerJoin(jobAlias, 'job')
          .where('item.jobId = :jobId', { jobId: filters?.jobId })
          .andWhere('job.branchManagerUserId = :userId', { userId });
      } else {
        query.where('1 = 0');
      }
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

    if (filters?.jobSource) {
      const jobSource = filters.jobSource.toUpperCase();
      if (jobSource === 'AM') {
        query.andWhere(
          '(item.jobSource = :jobSource OR item.jobSource IS NULL)',
          {
            jobSource: 'AM',
          },
        );
      } else if (jobSource === 'AA') {
        query.andWhere('item.jobSource = :jobSource', { jobSource: 'AA' });
      }
    }

    query
      .andWhere('item.active = :active', { active: true })
      .leftJoinAndSelect('item.categoryItem', 'categoryItem')
      .leftJoinAndSelect('item.amComments', 'amComments')
      .leftJoinAndSelect('item.amCheckerComments', 'amCheckerComments')
      .leftJoinAndSelect('item.aaComments', 'aaComments')
      .leftJoinAndSelect('item.otherComments', 'otherComments')
      .leftJoinAndSelect('item.itemStatusRelation', 'itemStatusRelation')
      .leftJoinAndSelect(
        'item.headerChecklistStatusRelation',
        'headerChecklistStatusRelation',
      )
      .leftJoinAndSelect(
        'item.itemStatusEditRelation',
        'itemStatusEditRelation',
      )
      .orderBy('item.inspectionDate', 'ASC');

    const items = await query.getMany();

    return await Promise.all(
      items.map(async (item) => {
        const enrichComments = async (
          comments: Array<{
            userId: number;
            approverBy: number;
            active: boolean;
            [key: string]: unknown;
          }>,
        ) =>
          Promise.all(
            (comments || [])
              .filter((d) => d.active)
              .map(async (detail) => {
                const { userId, approverBy, ...rest } = detail;
                const [OwnerCommentUser, approverByUser] = await Promise.all([
                  this.getUserData(userId),
                  this.getUserData(approverBy),
                ]);
                return { ...rest, OwnerCommentUser, approverByUser };
              }),
          );

        const [
          amCommentsEnriched,
          amCheckerCommentsEnriched,
          aaCommentsEnriched,
          otherCommentsEnriched,
        ] = await Promise.all([
          enrichComments(
            item.amComments as unknown as Array<{
              userId: number;
              approverBy: number;
              active: boolean;
              [key: string]: unknown;
            }>,
          ),
          enrichComments(
            item.amCheckerComments as unknown as Array<{
              userId: number;
              approverBy: number;
              active: boolean;
              [key: string]: unknown;
            }>,
          ),
          enrichComments(
            (
              item as unknown as {
                aaComments: Array<{
                  userId: number;
                  approverBy: number;
                  active: boolean;
                  [key: string]: unknown;
                }>;
              }
            ).aaComments,
          ),
          enrichComments(
            item.otherComments as unknown as Array<{
              userId: number;
              approverBy: number;
              active: boolean;
              [key: string]: unknown;
            }>,
          ),
        ]);

        return {
          ...item,
          amComments: amCommentsEnriched,
          amCheckerComments: amCheckerCommentsEnriched,
          aaComments: aaCommentsEnriched,
          otherComments: otherCommentsEnriched,
        };
      }),
    );
  }

  // Get items by category
  async findByCategoryId(categoryItemId: number): Promise<AMItem[]> {
    return await this.AMItemsRepository.find({
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
  ): Promise<AMItem> {
    const AMItem = await this.AMItemsRepository.findOne({
      where: { itemId: id },
    });
    if (!AMItem) {
      throw new NotFoundException(`Audit Item with ID ${id} not found`);
    }

    Object.assign(AMItem, updateAuditItemDto);

    return await this.AMItemsRepository.save(AMItem);
  }

  // Soft delete
  async remove(id: number): Promise<void> {
    const AMItem = await this.findOne(id);
    AMItem.active = false;
    await this.AMItemsRepository.save(AMItem);
  }

  // Hard delete
  async delete(id: number): Promise<void> {
    const result = await this.AMItemsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Audit Item with ID ${id} not found`);
    }
  }

  // Update item status
  async updateStatus(id: number, status: number): Promise<AMItem> {
    const AMItem = await this.findOne(id);
    AMItem.itemStatus = status;
    return await this.AMItemsRepository.save(AMItem);
  }

  // async updateBranchScore(id: number, score: number): Promise<AMItem> {
  //   const AMItem = await this.findOne(id);
  //   AMItem.branchAuditScore = score;
  //   return await this.AMItemsRepository.save(AMItem);
  // }

  //Get items with comment counts
  async findByJobIdWithCounts(jobId: number): Promise<any[]> {
    const items = await this.AMItemsRepository.createQueryBuilder('item')
      .leftJoinAndSelect('item.categoryItem', 'category')
      .leftJoin('item.amComments', 'am')
      .leftJoin('item.amCheckerComments', 'audit')
      .leftJoin('item.otherComments', 'other')
      .where('item.jobId = :jobId', { jobId })
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
    const result = await this.AMItemsRepository.createQueryBuilder('item')
      .leftJoin('item.amComments', 'am')
      .leftJoin('item.amCheckerComments', 'audit')
      .leftJoin('item.otherComments', 'other')
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
  ): Promise<AMItem> {
    const AMItem = await this.AMItemsRepository.findOne({
      where: { itemId },
    });

    if (!AMItem) {
      throw new NotFoundException(`Audit Item with ID ${itemId} not found`);
    }

    // Update AM Checklist fields
    AMItem.headerChecklistStatus = data.status;
    AMItem.headerChecklistDetail = data.detail || null;
    AMItem.headerChecklistBy = data.checkedBy;
    AMItem.headerChecklistAt = new Date();

    return await this.AMItemsRepository.save(AMItem);
  }

  async getAMChecklist(itemId: number): Promise<{
    status: number | null;
    detail: string | null;
    checkedBy: number | null;
    checkedAt: Date | null;
    checkedByUser?: UserData;
  }> {
    const AMItem = await this.AMItemsRepository.findOne({
      where: { itemId },
      select: [
        'itemId',
        'headerChecklistStatus',
        'headerChecklistDetail',
        'headerChecklistBy',
        'headerChecklistAt',
      ],
    });

    if (!AMItem) {
      throw new NotFoundException(`Audit Item with ID ${itemId} not found`);
    }

    // Get user data ถ้ามี checkedBy
    let checkedByUser: UserData | undefined;
    if (AMItem.headerChecklistBy) {
      checkedByUser = await this.getUserData(AMItem.headerChecklistBy);
    }

    return {
      status: AMItem.headerChecklistStatus,
      detail: AMItem.headerChecklistDetail,
      checkedBy: AMItem.headerChecklistBy,
      checkedAt: AMItem.headerChecklistAt,
      checkedByUser,
    };
  }

  async clearAMChecklist(itemId: number): Promise<AMItem> {
    const AMItem = await this.AMItemsRepository.findOne({
      where: { itemId },
    });

    if (!AMItem) {
      throw new NotFoundException(`Audit Item with ID ${itemId} not found`);
    }

    // Clear all AM Checklist fields
    AMItem.headerChecklistStatus = null;
    AMItem.headerChecklistDetail = null;
    AMItem.headerChecklistBy = null;
    AMItem.headerChecklistAt = null;

    return await this.AMItemsRepository.save(AMItem);
  }
}
