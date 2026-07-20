// Version: 1.0.0 | Date: 2025-06-05 | Updated: AM Jobs Service - แก้แค่ column references
// ==========================================
// am-job.service.ts
// ==========================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as sql from 'mssql';
import { AMJobHeader } from '../domain/model/am.jobs-header.entity';
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
export class AMJobsService {
  constructor(
    @InjectRepository(AMJobHeader)
    private readonly amJobsRepository: Repository<AMJobHeader>,
    private readonly dbManager: DatabaseManagerService,
    private readonly userRightService: UserRightService,
  ) {}

  // Helper: ดึงข้อมูล user
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

  private transformAMItemWithUsers(item: AMItem): AuditItemWithUsers {
    return item as AuditItemWithUsers;
  }

  private async transformAMJobWithUsers(
    job: AMJobHeader,
  ): Promise<AuditJobWithUsers> {
    const [
      amUser, // คนตรวจสอบ (AM)
      rmManager, // หัวหน้า (RM)
      branchManager,
      createdByUser,
      updatedByUser,
    ] = await Promise.all([
      this.getUserData(job.amUserId),
      this.getUserData(job.rmUserId),
      this.getUserData(job.branchManagerUserId),
      this.getUserData(job.createdBy),
      this.getUserData(job.updatedBy),
    ]);

    let transformedItems: AuditItemWithUsers[] | undefined;
    if (job.items && job.items.length > 0) {
      transformedItems = job.items.map((item) =>
        this.transformAMItemWithUsers(item),
      );
    }

    // AM User (คนตรวจสอบ) + snapshot → ส่งเป็น "auditor" ใน response
    const auditorWithSnapshot = amUser
      ? {
          ...amUser,
          userCode: job.amUserCode || amUser.userCode,
          firstName: job.amFirstName || amUser.firstName,
          lastName: job.amLastName || amUser.lastName,
          fullname:
            job.amFirstName && job.amLastName
              ? `${job.amFirstName} ${job.amLastName}`
              : amUser.fullname,
          branchName: job.amBranchName || amUser.branchName,
        }
      : undefined;

    // RM Manager (หัวหน้า) + snapshot → ส่งเป็น "districtManager" ใน response
    const districtManagerWithSnapshot = rmManager
      ? {
          ...rmManager,
          userCode: job.rmUserCode || rmManager.userCode,
          firstName: job.rmFirstName || rmManager.firstName,
          lastName: job.rmLastName || rmManager.lastName,
          fullname:
            job.rmFirstName && job.rmLastName
              ? `${job.rmFirstName} ${job.rmLastName}`
              : rmManager.fullname,
          branchName: job.rmBranchName || rmManager.branchName,
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
      amUserId: _amUserId,
      amUserCode: _amUserCode,
      amFirstName: _amFirstName,
      amLastName: _amLastName,
      amBranchName: _amBranchName,

      rmUserId: _rmUserId,
      rmUserCode: _rmUserCode,
      rmFirstName: _rmFirstName,
      rmLastName: _rmLastName,
      rmBranchName: _rmBranchName,

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

  // Running number generator
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

      const docno = result.output.docno as string;
      return docno;
    } catch (error) {
      console.error('Running Number Error:', error);
      throw error;
    }
  }

  // Create
  async create(createDto: CreateAuditJobDto): Promise<AMJobHeader> {
    try {
      // TODO: เปลี่ยน running type ตามที่ต้องการ
      const runningType =
        createDto.positionType === 'AM'
          ? 'ROS-AM'
          : createDto.positionType === 'AA'
            ? 'ROS-AA'
            : 'AM';
      const jobNo = await this.running_number(runningType);

      if (!jobNo) {
        throw new Error('Running number not generated');
      }

      // ดึงข้อมูล users สำหรับ snapshot
      // DTO ยังใช้ชื่อเดิม → map ไปหา entity field
      const [amUser, rmManager, branchManager] = await Promise.all([
        this.getUserData(createDto.auditorUserId || null),
        this.getUserData(createDto.districtManagerUserId || null),
        this.getUserData(createDto.branchManagerUserId || null),
      ]);

      const amJob = this.amJobsRepository.create({
        jobNo,
        branchId: createDto.branchId,
        branchName: createDto.branchName,
        auditDate: createDto.auditDate,
        address: createDto.address,
        pmCode: createDto.pmCode,
        positionType: createDto.positionType,
        additionalNotes: createDto.additionalNotes,
        branchAssignment: createDto.branchAssignment,
        createdBy: createDto.createdBy,
        status: 1,

        // AM User (คนตรวจสอบ) ← จาก DTO.auditorUserId
        amUserId: createDto.auditorUserId,
        amUserCode: amUser?.userCode || undefined,
        amFirstName: amUser?.firstName || undefined,
        amLastName: amUser?.lastName || undefined,
        amBranchName: amUser?.branchName || undefined,

        // RM User (หัวหน้า) ← จาก DTO.districtManagerUserId
        rmUserId: createDto.districtManagerUserId,
        rmUserCode: rmManager?.userCode || undefined,
        rmFirstName: rmManager?.firstName || undefined,
        rmLastName: rmManager?.lastName || undefined,
        rmBranchName: rmManager?.branchName || undefined,

        // Branch Manager
        branchManagerUserId: createDto.branchManagerUserId,
        branchManagerUserCode: branchManager?.userCode || undefined,
        branchManagerFirstName: branchManager?.firstName || undefined,
        branchManagerLastName: branchManager?.lastName || undefined,
      });

      return await this.amJobsRepository.save(amJob);
    } catch (error) {
      console.error('Error creating AM job:', error);
      throw error;
    }
  }

  // Get all with pagination
  async findAll(
    params: PaginationParams,
    user: UserInfo,
  ): Promise<PaginatedResponse> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.amJobsRepository.createQueryBuilder('job');

    query.leftJoinAndSelect('job.statusInfo', 'statusInfo');

    if (params.status !== undefined) {
      query.andWhere('job.status = :status', { status: params.status });
    }
    if (params.branchId !== undefined) {
      query.andWhere('job.branchId = :branchId', { branchId: params.branchId });
    }
    // DTO ใช้ auditorUserId → entity เป็น amUserId
    if (params.auditorUserId !== undefined) {
      query.andWhere('job.amUserId = :amUserId', {
        amUserId: params.auditorUserId,
      });
    }
    // DTO ใช้ districtManagerUserId → entity เป็น rmUserId
    if (params.districtManagerUserId !== undefined) {
      query.andWhere('job.rmUserId = :rmUserId', {
        rmUserId: params.districtManagerUserId,
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
          job.amFirstName LIKE :search OR
          job.amLastName LIKE :search OR
          job.amUserCode LIKE :search OR
          job.rmFirstName LIKE :search OR
          job.rmLastName LIKE :search OR
          job.rmUserCode LIKE :search OR
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
      // เห็นทุก job
    } else if (roleId === 2) {
      // Admin: เห็นทุก job
    } else if (roleId === 9) {
      // SSD: read-only ดูได้ทุก job
    } else if (roleId === 3) {
      // AM: เห็น job ที่ตัวเองเป็น amUser หรือเป็นคนสร้าง job
      query.andWhere('(job.amUserId = :userId OR job.createdBy = :userId)', {
        userId,
      });
    } else if (roleId === 4) {
      // RM: เห็นเฉพาะ job ที่ตัวเองเป็น rmUser (หัวหน้า)
      // query.andWhere('job.rmUserId = :userId', { userId });
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
      data.map((job) => this.transformAMJobWithUsers(job)),
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

  // Get by ID
  async findOne(id: number): Promise<AuditJobWithUsers> {
    const amJob = await this.amJobsRepository.findOne({
      where: { jobId: id },
      relations: [
        'statusInfo',
        'items',
        'items.categoryItem',
        'items.amComments',
        'items.amCheckerComments',
        'items.otherComments',
        'items.taggedUsers',
      ],
    });

    if (!amJob) {
      throw new NotFoundException(`AM Job with ID ${id} not found`);
    }

    return await this.transformAMJobWithUsers(amJob);
  }

  // Get by jobNo
  async findByJobNo(jobNo: string): Promise<AuditJobWithUsers> {
    const amJob = await this.amJobsRepository.findOne({
      where: { jobNo },
      relations: [
        'statusInfo',
        'items',
        'items.categoryItem',
        'items.amComments',
        'items.amCheckerComments',
        'items.otherComments',
        'items.taggedUsers',
      ],
    });

    if (!amJob) {
      throw new NotFoundException(`AM Job with JobNo ${jobNo} not found`);
    }

    return await this.transformAMJobWithUsers(amJob);
  }

  // Update - snapshot ถ้าเปลี่ยน user
  async update(
    id: number,
    updateDto: UpdateAuditJobDto,
  ): Promise<AuditJobWithUsers> {
    const amJob = await this.amJobsRepository.findOne({ where: { jobId: id } });

    if (!amJob) {
      throw new NotFoundException(`AM Job with ID ${id} not found`);
    }

    // DTO.auditorUserId → entity.amUserId
    if (
      updateDto.auditorUserId !== undefined &&
      updateDto.auditorUserId !== amJob.amUserId
    ) {
      const amUser = await this.getUserData(updateDto.auditorUserId);
      if (amUser) {
        amJob.amUserId = updateDto.auditorUserId;
        amJob.amUserCode = amUser.userCode || '';
        amJob.amFirstName = amUser.firstName || '';
        amJob.amLastName = amUser.lastName || '';
        amJob.amBranchName = amUser.branchName || '';
      }
    }

    // DTO.districtManagerUserId → entity.rmUserId
    if (
      updateDto.districtManagerUserId !== undefined &&
      updateDto.districtManagerUserId !== amJob.rmUserId
    ) {
      const rm = await this.getUserData(updateDto.districtManagerUserId);
      if (rm) {
        amJob.rmUserId = updateDto.districtManagerUserId;
        amJob.rmUserCode = rm.userCode || '';
        amJob.rmFirstName = rm.firstName || '';
        amJob.rmLastName = rm.lastName || '';
        amJob.rmBranchName = rm.branchName || '';
      }
    }

    // Branch Manager
    if (
      updateDto.branchManagerUserId !== undefined &&
      updateDto.branchManagerUserId !== amJob.branchManagerUserId
    ) {
      const bm = await this.getUserData(updateDto.branchManagerUserId);
      if (bm) {
        amJob.branchManagerUserId = updateDto.branchManagerUserId;
        amJob.branchManagerUserCode = bm.userCode;
        amJob.branchManagerFirstName = bm.firstName;
        amJob.branchManagerLastName = bm.lastName;
      }
    }

    // อัพเดท fields อื่นๆ ที่ไม่ใช่ user (branchId, branchName, auditDate, etc.)
    if (updateDto.branchId !== undefined) amJob.branchId = updateDto.branchId;
    if (updateDto.branchName !== undefined)
      amJob.branchName = updateDto.branchName;
    if (updateDto.auditDate !== undefined)
      amJob.auditDate = updateDto.auditDate;
    if (updateDto.address !== undefined) amJob.address = updateDto.address;
    if (updateDto.pmCode !== undefined) amJob.pmCode = updateDto.pmCode;
    if (updateDto.positionType !== undefined)
      amJob.positionType = updateDto.positionType;
    if (updateDto.additionalNotes !== undefined)
      amJob.additionalNotes = updateDto.additionalNotes;
    if (updateDto.branchAssignment !== undefined)
      amJob.branchAssignment = updateDto.branchAssignment;
    if (updateDto.updatedBy !== undefined)
      amJob.updatedBy = updateDto.updatedBy;

    const savedJob = await this.amJobsRepository.save(amJob);
    return await this.transformAMJobWithUsers(savedJob);
  }

  // Soft delete
  async remove(
    id: number,
    deleteReason?: string,
    deletedBy?: number,
  ): Promise<void> {
    const amJob = await this.amJobsRepository.findOne({ where: { jobId: id } });
    if (!amJob) throw new NotFoundException(`AM Job with ID ${id} not found`);

    amJob.active = false;
    if (deleteReason) {
      amJob.deleteReason = deleteReason;
      amJob.deletedAt = new Date();
      amJob.deletedBy = deletedBy;
    }
    await this.amJobsRepository.save(amJob);
  }

  // Admin: update status directly
  async updateStatus(
    id: number,
    status: number,
    updatedBy: number,
  ): Promise<AuditJobWithUsers> {
    const amJob = await this.amJobsRepository.findOne({ where: { jobId: id } });
    if (!amJob) throw new NotFoundException(`AM Job with ID ${id} not found`);
    amJob.status = status;
    amJob.updatedBy = updatedBy;
    const savedJob = await this.amJobsRepository.save(amJob);
    return await this.transformAMJobWithUsers(savedJob);
  }

  // Confirm (lock)
  async confirm(id: number, confirmedBy: number): Promise<AuditJobWithUsers> {
    const amJob = await this.amJobsRepository.findOne({ where: { jobId: id } });
    if (!amJob) throw new NotFoundException(`AM Job with ID ${id} not found`);

    amJob.status = 2;
    amJob.updatedBy = confirmedBy;

    const savedJob = await this.amJobsRepository.save(amJob);
    return await this.transformAMJobWithUsers(savedJob);
  }

  // Hard delete
  async delete(id: number): Promise<void> {
    const result = await this.amJobsRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`AM Job with ID ${id} not found`);
  }

  // Get by status
  async findByStatus(status: number): Promise<AMJobHeader[]> {
    return await this.amJobsRepository.find({
      where: { status, active: true },
    });
  }

  // Get by AM User (คนตรวจ)
  async findByAMUser(amUserId: number): Promise<AMJobHeader[]> {
    return await this.amJobsRepository.find({
      where: { amUserId, active: true },
      relations: ['items'],
    });
  }

  // Check email sent
  async checkAndMarkJobCreatedEmail(
    jobId: number,
    userby: number,
  ): Promise<{ alreadySent: boolean; sentAt: Date | null }> {
    const job = await this.amJobsRepository.findOne({ where: { jobId } });
    if (!job) throw new NotFoundException(`Job id ${jobId} not found`);

    if (job.jobCreatedEmailSentAt !== null) {
      return { alreadySent: true, sentAt: job.jobCreatedEmailSentAt };
    }

    await this.amJobsRepository.update(jobId, {
      jobCreatedEmailSentAt: new Date(),
      jobCreatedEmailSentBy: userby,
    });

    return { alreadySent: false, sentAt: null };
  }
}
