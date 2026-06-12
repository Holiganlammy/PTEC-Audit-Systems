import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as sql from 'mssql';
import { AAJobHeader } from '../domain/model/aa.jobs-header.entity';
import { AMItem } from '../domain/model/am-item.entity';
import { AMItemOtherCommentUsersTag } from '../domain/model/am-item-other-comment-users-tag.entity';
import { CreateAuditJobDto } from '../dto/create-audit-job.dto';
import { UpdateAuditJobDto } from '../dto/update-audit-job.dto';
import { DatabaseManagerService } from '../../database/database-manager.service';
import { databaseConfig } from '../config/database.config';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';
import {
  PaginationParams,
  PaginatedResponse,
  UserInfo,
  UserData,
  AuditItemWithUsers,
  AuditJobWithUsers,
} from '../domain/type/audit-job.interface';

@Injectable()
export class AAJobsService {
  constructor(
    @InjectRepository(AAJobHeader)
    private readonly aaJobsRepository: Repository<AAJobHeader>,
    private readonly dbManager: DatabaseManagerService,
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
          firstName: user.fristName || '',
          lastName: user.lastName || '',
          fullname: user.fristName ? user.fristName + ' ' + user.lastName : '',
          email: user.Email,
          position: user.Position,
          branchId: user.BranchID,
          branchName: user.BranchName,
          userId: user.UserID,
        };
      }
    } catch (error) {
      console.error(`Error fetching user data for userId ${userId}:`, error);
    }

    return undefined;
  }

  private transformAAItemWithUsers(item: AMItem): AuditItemWithUsers {
    return item as AuditItemWithUsers;
  }

  private async transformAAJobWithUsers(
    job: AAJobHeader,
  ): Promise<AuditJobWithUsers> {
    const [aaUser, amManager, branchManager, createdByUser, updatedByUser] =
      await Promise.all([
        this.getUserData(job.aaUserId),
        this.getUserData(job.amManagerUserId),
        this.getUserData(job.branchManagerUserId),
        this.getUserData(job.createdBy),
        this.getUserData(job.updatedBy),
      ]);

    let transformedItems: AuditItemWithUsers[] | undefined;
    if (job.items && job.items.length > 0) {
      transformedItems = job.items.map((item) =>
        this.transformAAItemWithUsers(item),
      );
    }

    // AA User (คนตรวจสอบ) + snapshot
    const auditorWithSnapshot = aaUser
      ? {
          ...aaUser,
          userCode: job.aaUserCode || aaUser.userCode,
          firstName: job.aaFirstName || aaUser.firstName,
          lastName: job.aaLastName || aaUser.lastName,
          fullname:
            job.aaFirstName && job.aaLastName
              ? `${job.aaFirstName} ${job.aaLastName}`
              : aaUser.fullname,
          branchName: job.aaBranchName || aaUser.branchName,
        }
      : undefined;

    // AM Manager (หัวหน้า) + snapshot
    const districtManagerWithSnapshot = amManager
      ? {
          ...amManager,
          userCode: job.amManagerUserCode || amManager.userCode,
          firstName: job.amManagerFirstName || amManager.firstName,
          lastName: job.amManagerLastName || amManager.lastName,
          fullname:
            job.amManagerFirstName && job.amManagerLastName
              ? `${job.amManagerFirstName} ${job.amManagerLastName}`
              : amManager.fullname,
          branchName: job.amManagerBranchName || amManager.branchName,
        }
      : undefined;

    // Branch Manager + snapshot
    const branchManagerWithSnapshot = branchManager
      ? {
          ...branchManager,
          userCode: job.branchManagerUserCode || branchManager.userCode,
          firstName: job.branchManagerFirstName || branchManager.firstName,
          lastName: job.branchManagerLastName || branchManager.lastName,
          fullname:
            job.branchManagerFirstName && job.branchManagerLastName
              ? `${job.branchManagerFirstName} ${job.branchManagerLastName}`
              : branchManager.fullname,
        }
      : undefined;

    const {
      aaUserId: _aaUserId,
      aaUserCode: _aaUserCode,
      aaFirstName: _aaFirstName,
      aaLastName: _aaLastName,
      aaBranchName: _aaBranchName,

      amManagerUserId: _amManagerUserId,
      amManagerUserCode: _amManagerUserCode,
      amManagerFirstName: _amManagerFirstName,
      amManagerLastName: _amManagerLastName,
      amManagerBranchName: _amManagerBranchName,

      branchManagerUserId: _branchManagerUserId,
      branchManagerUserCode: _branchManagerUserCode,
      branchManagerFirstName: _branchManagerFirstName,
      branchManagerLastName: _branchManagerLastName,

      createdBy: _createdBy,
      updatedBy: _updatedBy,
      items: _items,
      ...jobWithoutIds
    } = job;

    return {
      ...jobWithoutIds,
      auditor: auditorWithSnapshot,
      districtManager: districtManagerWithSnapshot,
      branchManager: branchManagerWithSnapshot,
      createdByUser,
      updatedByUser,
      items: transformedItems,
    };
  }

  async running_number(type: string): Promise<string> {
    try {
      const pool = await this.dbManager.getPool();
      const request = pool.request();

      request.input('code', sql.NVarChar(50), type);
      request.input('date', sql.DateTime(), new Date());
      request.output('docno', sql.VarChar(100));

      const result = await request.execute(
        `${databaseConfig.database}.dbo.RunningNo`,
      );

      return result.output.docno as string;
    } catch (error) {
      console.error('Running Number Error:', error);
      throw error;
    }
  }

  async create(createDto: CreateAuditJobDto): Promise<AAJobHeader> {
    try {
      const jobNo = await this.running_number('ROS-AA');

      if (!jobNo) {
        throw new Error('Running number not generated');
      }

      const [aaUser, amManager, branchManager] = await Promise.all([
        this.getUserData(createDto.auditorUserId || null),
        this.getUserData(createDto.districtManagerUserId || null),
        this.getUserData(createDto.branchManagerUserId || null),
      ]);

      const aaJob = this.aaJobsRepository.create({
        jobNo,
        branchId: createDto.branchId,
        branchName: createDto.branchName,
        auditDate: createDto.auditDate,
        address: createDto.address,
        pmCode: createDto.pmCode,
        positionType: createDto.positionType,
        additionalNotes: createDto.additionalNotes,
        createdBy: createDto.createdBy,
        status: 1,

        // AA User (คนตรวจสอบ) ← จาก DTO.auditorUserId
        aaUserId: createDto.auditorUserId,
        aaUserCode: aaUser?.userCode || undefined,
        aaFirstName: aaUser?.firstName || undefined,
        aaLastName: aaUser?.lastName || undefined,
        aaBranchName: aaUser?.branchName || undefined,

        // AM Manager (หัวหน้า) ← จาก DTO.districtManagerUserId
        amManagerUserId: createDto.districtManagerUserId,
        amManagerUserCode: amManager?.userCode || undefined,
        amManagerFirstName: amManager?.firstName || undefined,
        amManagerLastName: amManager?.lastName || undefined,
        amManagerBranchName: amManager?.branchName || undefined,

        // Branch Manager
        branchManagerUserId: createDto.branchManagerUserId,
        branchManagerUserCode: branchManager?.userCode || undefined,
        branchManagerFirstName: branchManager?.firstName || undefined,
        branchManagerLastName: branchManager?.lastName || undefined,
      });

      return await this.aaJobsRepository.save(aaJob);
    } catch (error) {
      console.error('Error creating AA job:', error);
      throw error;
    }
  }

  async findAll(
    params: PaginationParams,
    user: UserInfo,
  ): Promise<PaginatedResponse> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.aaJobsRepository.createQueryBuilder('job');

    query.leftJoinAndSelect('job.statusInfo', 'statusInfo');

    if (params.status !== undefined) {
      query.andWhere('job.status = :status', { status: params.status });
    }
    if (params.branchId !== undefined) {
      query.andWhere('job.branchId = :branchId', { branchId: params.branchId });
    }
    if (params.auditorUserId !== undefined) {
      query.andWhere('job.aaUserId = :aaUserId', {
        aaUserId: params.auditorUserId,
      });
    }
    if (params.districtManagerUserId !== undefined) {
      query.andWhere('job.amManagerUserId = :amManagerUserId', {
        amManagerUserId: params.districtManagerUserId,
      });
    }
    if (params.branchManagerUserId !== undefined) {
      query.andWhere('job.branchManagerUserId = :branchManagerUserId', {
        branchManagerUserId: params.branchManagerUserId,
      });
    }
    if (params.dateFrom) {
      query.andWhere('job.auditDate >= :dateFrom', {
        dateFrom: params.dateFrom,
      });
    }
    if (params.dateTo) {
      query.andWhere('job.auditDate <= :dateTo', { dateTo: params.dateTo });
    }
    if (params.search) {
      query.andWhere(
        `(
          job.jobNo LIKE :search OR
          job.branchName LIKE :search OR
          statusInfo.statusName LIKE :search OR
          CONVERT(NVARCHAR, job.auditDate, 23) LIKE :search OR
          job.aaFirstName LIKE :search OR
          job.aaLastName LIKE :search OR
          job.aaUserCode LIKE :search OR
          job.amManagerFirstName LIKE :search OR
          job.amManagerLastName LIKE :search OR
          job.amManagerUserCode LIKE :search OR
          job.branchManagerFirstName LIKE :search OR
          job.branchManagerLastName LIKE :search OR
          job.branchManagerUserCode LIKE :search
        )`,
        { search: `%${params.search}%` },
      );
    }
    if (params.active !== undefined) {
      query.andWhere('job.active = :active', { active: params.active });
    } else {
      query.andWhere('job.active = :active', { active: true });
    }

    // Permission Filter
    const roleId = user.role_id;
    const userId = user.user_id;

    if (roleId === 1) {
      // Admin: เห็นทุก job
    } else if (roleId === 2) {
      // Admin: เห็นทุก job
    } else if (roleId === 3) {
      // AM: เห็น job ที่ตัวเองเป็น amManager หรือเป็นคนสร้าง
      query.andWhere(
        '(job.amManagerUserId = :userId OR job.createdBy = :userId)',
        { userId },
      );
    } else if (roleId === 4) {
      // DM : เห็นทุก job ของ AA
    } else if (roleId === 8) {
      // AA: เห็น job ที่ตัวเองเป็น aaUser หรือเป็นคนสร้าง
      query.andWhere('(job.aaUserId = :userId OR job.createdBy = :userId)', {
        userId,
      });
    } else if (roleId === 5) {
      // User: เห็นเฉพาะ job ที่ถูก tag
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
      // Branch Manager
      query.andWhere('job.branchManagerUserId = :userId', { userId });
    } else {
      query.andWhere('1 = 0');
    }

    const total = await query.getCount();
    query.orderBy('job.createdAt', 'DESC').skip(skip).take(limit);

    const data = await query.getMany();
    const transformedData = await Promise.all(
      data.map((job) => this.transformAAJobWithUsers(job)),
    );

    const totalPages = Math.ceil(total / limit);

    return {
      code: 200,
      data: transformedData,
      message: 'Success',
      pagination: {
        page: page.toString(),
        limit: limit.toString(),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      user,
    };
  }

  async findOne(id: number): Promise<AuditJobWithUsers> {
    const aaJob = await this.aaJobsRepository.findOne({
      where: { jobId: id },
      relations: [
        'statusInfo',
        'items',
        'items.categoryItem',
        'items.amComments',
        'items.aaComments',
        'items.otherComments',
        'items.taggedUsers',
      ],
    });

    if (!aaJob) {
      throw new NotFoundException(`AA Job with ID ${id} not found`);
    }

    return await this.transformAAJobWithUsers(aaJob);
  }

  async findByJobNo(jobNo: string): Promise<AuditJobWithUsers> {
    const aaJob = await this.aaJobsRepository.findOne({
      where: { jobNo },
      relations: [
        'statusInfo',
        'items',
        'items.categoryItem',
        'items.amComments',
        'items.aaComments',
        'items.otherComments',
        'items.taggedUsers',
      ],
    });

    if (!aaJob) {
      throw new NotFoundException(`AA Job with JobNo ${jobNo} not found`);
    }

    return await this.transformAAJobWithUsers(aaJob);
  }

  async update(
    id: number,
    updateDto: UpdateAuditJobDto,
  ): Promise<AuditJobWithUsers> {
    const aaJob = await this.aaJobsRepository.findOne({ where: { jobId: id } });

    if (!aaJob) {
      throw new NotFoundException(`AA Job with ID ${id} not found`);
    }

    // DTO.auditorUserId → entity.aaUserId
    if (
      updateDto.auditorUserId !== undefined &&
      updateDto.auditorUserId !== aaJob.aaUserId
    ) {
      const aaUser = await this.getUserData(updateDto.auditorUserId);
      if (aaUser) {
        aaJob.aaUserId = updateDto.auditorUserId;
        aaJob.aaUserCode = aaUser.userCode || '';
        aaJob.aaFirstName = aaUser.firstName || '';
        aaJob.aaLastName = aaUser.lastName || '';
        aaJob.aaBranchName = aaUser.branchName || '';
      }
    }

    // DTO.districtManagerUserId → entity.amManagerUserId
    if (
      updateDto.districtManagerUserId !== undefined &&
      updateDto.districtManagerUserId !== aaJob.amManagerUserId
    ) {
      const amManager = await this.getUserData(updateDto.districtManagerUserId);
      if (amManager) {
        aaJob.amManagerUserId = updateDto.districtManagerUserId;
        aaJob.amManagerUserCode = amManager.userCode || '';
        aaJob.amManagerFirstName = amManager.firstName || '';
        aaJob.amManagerLastName = amManager.lastName || '';
        aaJob.amManagerBranchName = amManager.branchName || '';
      }
    }

    // Branch Manager
    if (
      updateDto.branchManagerUserId !== undefined &&
      updateDto.branchManagerUserId !== aaJob.branchManagerUserId
    ) {
      const bm = await this.getUserData(updateDto.branchManagerUserId);
      if (bm) {
        aaJob.branchManagerUserId = updateDto.branchManagerUserId;
        aaJob.branchManagerUserCode = bm.userCode;
        aaJob.branchManagerFirstName = bm.firstName;
        aaJob.branchManagerLastName = bm.lastName;
      }
    }

    if (updateDto.branchId !== undefined) aaJob.branchId = updateDto.branchId;
    if (updateDto.branchName !== undefined)
      aaJob.branchName = updateDto.branchName;
    if (updateDto.auditDate !== undefined)
      aaJob.auditDate = updateDto.auditDate;
    if (updateDto.address !== undefined) aaJob.address = updateDto.address;
    if (updateDto.pmCode !== undefined) aaJob.pmCode = updateDto.pmCode;
    if (updateDto.positionType !== undefined)
      aaJob.positionType = updateDto.positionType;
    if (updateDto.additionalNotes !== undefined)
      aaJob.additionalNotes = updateDto.additionalNotes;
    if (updateDto.updatedBy !== undefined)
      aaJob.updatedBy = updateDto.updatedBy;

    const savedJob = await this.aaJobsRepository.save(aaJob);
    return await this.transformAAJobWithUsers(savedJob);
  }

  async remove(
    id: number,
    deleteReason?: string,
    deletedBy?: number,
  ): Promise<void> {
    const aaJob = await this.aaJobsRepository.findOne({ where: { jobId: id } });
    if (!aaJob) throw new NotFoundException(`AA Job with ID ${id} not found`);

    aaJob.active = false;
    if (deleteReason) {
      aaJob.deleteReason = deleteReason;
      aaJob.deletedAt = new Date();
      aaJob.deletedBy = deletedBy;
    }
    await this.aaJobsRepository.save(aaJob);
  }

  async confirm(id: number, confirmedBy: number): Promise<AuditJobWithUsers> {
    const aaJob = await this.aaJobsRepository.findOne({ where: { jobId: id } });
    if (!aaJob) throw new NotFoundException(`AA Job with ID ${id} not found`);

    aaJob.status = 2;
    aaJob.updatedBy = confirmedBy;

    const savedJob = await this.aaJobsRepository.save(aaJob);
    return await this.transformAAJobWithUsers(savedJob);
  }

  async delete(id: number): Promise<void> {
    const result = await this.aaJobsRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`AA Job with ID ${id} not found`);
  }

  async findByStatus(status: number): Promise<AAJobHeader[]> {
    return await this.aaJobsRepository.find({
      where: { status, active: true },
    });
  }

  async findByAAUser(aaUserId: number): Promise<AAJobHeader[]> {
    return await this.aaJobsRepository.find({
      where: { aaUserId, active: true },
      relations: ['items'],
    });
  }

  async checkAndMarkJobCreatedEmail(
    jobId: number,
    userby: number,
  ): Promise<{ alreadySent: boolean; sentAt: Date | null }> {
    const job = await this.aaJobsRepository.findOne({ where: { jobId } });
    if (!job) throw new NotFoundException(`Job id ${jobId} not found`);

    if (job.jobCreatedEmailSentAt !== null) {
      return { alreadySent: true, sentAt: job.jobCreatedEmailSentAt };
    }

    await this.aaJobsRepository.update(jobId, {
      jobCreatedEmailSentAt: new Date(),
      jobCreatedEmailSentBy: userby,
    });

    return { alreadySent: false, sentAt: null };
  }
}
