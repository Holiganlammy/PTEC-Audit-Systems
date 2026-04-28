// ==========================================
// audit-job.service.ts - บันทึก Snapshot
// ==========================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as sql from 'mssql';
import { AuditJobsHeader } from '../domain/model/audit.jobs-header.entity';
import { AuditItem } from '../domain/model/audit-item.entity';
import { AuditItemOtherCommentUserTag } from '../domain/model/audit-item-other-comment-users-tag.entity';
import { CreateAuditJobDto } from '../dto/create-audit-job.dto';
import { UpdateAuditJobDto } from '../dto/update-audit-job.dto';
import { DatabaseManagerService } from '../../database/database-manager.service';
import { databaseConfig } from '../config/database.config';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';
import {
  PaginationParams,
  PaginatedResponse,
  PaginationMeta,
  UserInfo,
  UserData,
  AuditItemWithUsers,
  AuditJobWithUsers,
} from '../domain/type/audit-job.interface';
import { AuditCreateDocGmailApiService } from '../../email/audit-create-doc-gmail-api.service';

@Injectable()
export class AuditJobsService {
  constructor(
    @InjectRepository(AuditJobsHeader)
    private readonly auditJobsRepository: Repository<AuditJobsHeader>,
    private readonly dbManager: DatabaseManagerService,
    private readonly userRightService: UserRightService,
    private readonly auditCreateDocGmailService: AuditCreateDocGmailApiService,
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

  // Helper method to transform audit item with user data
  private transformAuditItemWithUsers(item: AuditItem): AuditItemWithUsers {
    // Transform the item as needed based on its structure
    return item as AuditItemWithUsers;
  }

  private async transformAuditJobWithUsers(
    job: AuditJobsHeader,
  ): Promise<AuditJobWithUsers> {
    const [
      auditor,
      districtManager,
      branchManager,
      createdByUser,
      updatedByUser,
    ] = await Promise.all([
      this.getUserData(job.auditorUserId),
      this.getUserData(job.districtManagerUserId),
      this.getUserData(job.branchManagerUserId),
      this.getUserData(job.createdBy),
      this.getUserData(job.updatedBy),
    ]);

    // Transform items if they exist
    let transformedItems: AuditItemWithUsers[] | undefined;
    if (job.items && job.items.length > 0) {
      transformedItems = job.items.map((item) =>
        this.transformAuditItemWithUsers(item),
      );
    }

    // รวม snapshot fields เข้าไปใน auditor object
    const auditorWithSnapshot = auditor
      ? {
          ...auditor,
          // Override ด้วย snapshot (ถ้ามี)
          userCode: job.auditorUserCode || auditor.userCode,
          firstName: job.auditorFirstName || auditor.firstName,
          lastName: job.auditorLastName || auditor.lastName,
          fullname:
            job.auditorFirstName && job.auditorLastName
              ? `${job.auditorFirstName} ${job.auditorLastName}`
              : auditor.fullname,
          branchName: job.auditorBranchName || auditor.branchName,
        }
      : undefined;

    // รวม snapshot fields เข้าไปใน districtManager object
    const districtManagerWithSnapshot = districtManager
      ? {
          ...districtManager,
          userCode: job.districtManagerUserCode || districtManager.userCode,
          firstName: job.districtManagerFirstName || districtManager.firstName,
          lastName: job.districtManagerLastName || districtManager.lastName,
          fullname:
            job.districtManagerFirstName && job.districtManagerLastName
              ? `${job.districtManagerFirstName} ${job.districtManagerLastName}`
              : districtManager.fullname,
          branchName:
            job.districtManagerBranchName || districtManager.branchName,
        }
      : undefined;

    // รวม snapshot fields เข้าไปใน branchManager object
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
          // ไม่มี branchName สำหรับ Branch Manager (ใช้ของ header)
        }
      : undefined;

    // ลบ snapshot fields ออกจาก root + ลบ user_id fields
    const {
      auditorUserId: _auditorUserId,
      auditorUserCode: _auditorUserCode,
      auditorFirstName: _auditorFirstName,
      auditorLastName: _auditorLastName,
      auditorBranchName: _auditorBranchName,

      districtManagerUserId: _districtManagerUserId,
      districtManagerUserCode: _districtManagerUserCode,
      districtManagerFirstName: _districtManagerFirstName,
      districtManagerLastName: _districtManagerLastName,
      districtManagerBranchName: _districtManagerBranchName,

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

  // Create new audit job - บันทึก Snapshot
  async create(createAuditJobDto: CreateAuditJobDto): Promise<AuditJobsHeader> {
    //mark
    try {
      // Generate running number based on position_type
      console.log('Creating audit job with positionType:', createAuditJobDto);
      const runningType =
        createAuditJobDto.positionType === 'visit'
          ? 'IAO-VS'
          : createAuditJobDto.positionType === 'online'
            ? 'IAO-OL'
            : 'IAO';
      const jobNo = await this.running_number(runningType);
      console.log('Generated Job Number:', jobNo);

      if (!jobNo) {
        throw new Error('Running number not generated');
      }

      // ดึงข้อมูล users สำหรับ snapshot
      const [auditor, districtManager, branchManager] = await Promise.all([
        this.getUserData(createAuditJobDto.auditorUserId || null),
        this.getUserData(createAuditJobDto.districtManagerUserId || null),
        this.getUserData(createAuditJobDto.branchManagerUserId || null),
        this.getUserData(createAuditJobDto.createdBy || null),
      ]);

      // สร้าง job พร้อม snapshot
      const auditJob = this.auditJobsRepository.create({
        ...createAuditJobDto,
        jobNo,

        // Auditor snapshot
        auditorUserCode: auditor?.userCode || undefined,
        auditorFirstName: auditor?.firstName || undefined,
        auditorLastName: auditor?.lastName || undefined,
        auditorBranchName: auditor?.branchName || undefined,

        // District Manager snapshot
        districtManagerUserCode: districtManager?.userCode || undefined,
        districtManagerFirstName: districtManager?.firstName || undefined,
        districtManagerLastName: districtManager?.lastName || undefined,
        districtManagerBranchName: districtManager?.branchName || undefined,

        // Branch Manager snapshot (ไม่มี branchName)
        branchManagerUserCode: branchManager?.userCode || undefined,
        branchManagerFirstName: branchManager?.firstName || undefined,
        branchManagerLastName: branchManager?.lastName || undefined,
      });

      const saveJob = await this.auditJobsRepository.save(auditJob);

      // ==================== ส่งเมลแจ้งเตือน ====================
      // try {
      //   const auditDateFormatted = createAuditJobDto.auditDate
      //     ? format(new Date(createAuditJobDto.auditDate), 'dd MMMM yyyy')
      //     : '-';

      //   await this.auditCreateDocGmailService.sendAuditJobCreatedEmail({
      //     groupEmails: [
      //       // 'npc@rpcthai.com',
      //       'ptaudit@rpcthai.com', // Group 1: PURE_GroupAM
      //       'groupssd@rpcthai.com', // Group 2: PTEC-Dept-SSD
      //     ],
      //     additionalRecipients: [
      //       'swp@rpcthai.com', // บุคคลเพิ่มเติม
      //     ],
      //     jobNo: saveJob.jobNo,
      //     branchName: createAuditJobDto.branchName || '-',
      //     auditDate: auditDateFormatted,
      //     createdByFullname: createdByUser?.fullname || 'ผู้ใช้งานในระบบ',
      //     auditorFullname: auditor?.fullname || '-',
      //     districtManagerFullname: districtManager?.fullname || '-',
      //     branchManagerFullname: branchManager?.fullname || '-',
      //     jobUrl: `${process.env.FRONTEND_URL || 'https://audit.purethai.co.th'}/audit/edit_document?jobNo=${saveJob.jobNo}`,
      //   });

      //   console.log(`✓ Sent notification emails for job ${saveJob.jobNo}`);
      // } catch (emailError) {
      //   // ไม่ให้ error ของเมลทำให้ create job ล้มเหลว
      //   console.error('Error sending notification emails:', emailError);
      // }

      return saveJob;
    } catch (error) {
      console.error('Error creating audit job:', error);
      throw error;
    }
  }

  // Get all audit jobs with pagination
  async findAll(
    params: PaginationParams,
    user: UserInfo,
  ): Promise<PaginatedResponse> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.auditJobsRepository.createQueryBuilder('job');

    // Filter by status, branchId, auditorUserId, active (เหมือนเดิม)
    if (params.status !== undefined) {
      query.andWhere('job.status = :status', { status: params.status });
    }

    if (params.branchId !== undefined) {
      query.andWhere('job.branchId = :branchId', { branchId: params.branchId });
    }

    if (params.auditorUserId !== undefined) {
      query.andWhere('job.auditorUserId = :auditorUserId', {
        auditorUserId: params.auditorUserId,
      });
    }

    if (params.active !== undefined) {
      query.andWhere('job.active = :active', { active: params.active });
    } else {
      query.andWhere('job.active = :active', { active: true });
    }

    // Permission Filter ตาม role_id
    const roleId = user.role_id;
    const userId = user.user_id;

    if (roleId === 1 || roleId === 2) {
      // Role 1, 2: เห็นทุก job
      // ไม่ต้อง filter
    } else if (roleId === 3) {
      // Role 3 (District Manager): เห็นเฉพาะ job ที่ตัวเองเป็น district_manager
      query.andWhere('job.districtManagerUserId = :userId', { userId });
    } else if (roleId === 4) {
      // Role 4 (Manager DM): เห็นทุก job
      // ไม่ต้อง filter
    } else if (roleId === 5) {
      // Role 5 (User): เห็นเฉพาะ job ที่ถูก tag
      query.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(AuditItem, 'item')
          .innerJoin(
            AuditItemOtherCommentUserTag,
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
      // Role 6 (Branch Manager): เห็นเฉพาะ job ที่ตัวเองเป็น branch_manager
      query.andWhere('job.branchManagerUserId = :userId', { userId });
    } else {
      // ไม่ใช่ role ที่กำหนด → ไม่เห็นอะไร
      query.andWhere('1 = 0');
    }

    const total = await query.getCount();

    query.leftJoinAndSelect('job.statusInfo', 'statusInfo');
    query.orderBy('job.createdAt', 'DESC').skip(skip).take(limit);

    const data = await query.getMany();

    const transformedData = await Promise.all(
      data.map((job) => this.transformAuditJobWithUsers(job)),
    );

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const pagination: PaginationMeta = {
      page: page.toString(),
      limit: limit.toString(),
      total,
      totalPages,
      hasNext,
      hasPrev,
    };

    return {
      code: 200,
      data: transformedData,
      message: 'Success',
      pagination,
      user,
    };
  }

  // Get audit job by ID with relations
  async findOne(id: number): Promise<AuditJobWithUsers> {
    const auditJob = await this.auditJobsRepository.findOne({
      where: { jobId: id },
      relations: [
        'statusInfo',
        'items',
        'items.categoryItem',
        'items.amComments',
        'items.auditComments',
        'items.otherComments',
        'items.taggedUsers',
      ],
    });

    if (!auditJob) {
      throw new NotFoundException(`Audit Job with ID ${id} not found`);
    }

    return await this.transformAuditJobWithUsers(auditJob);
  }

  async findByJobNo(jobNo: string): Promise<AuditJobWithUsers> {
    const auditJob = await this.auditJobsRepository.findOne({
      where: { jobNo },
      relations: [
        'statusInfo',
        'items',
        'items.categoryItem',
        'items.amComments',
        'items.auditComments',
        'items.otherComments',
        'items.taggedUsers',
      ],
    });

    if (!auditJob) {
      throw new NotFoundException(`Audit Job with JobNo ${jobNo} not found`);
    }

    return await this.transformAuditJobWithUsers(auditJob);
  }

  // Update audit job - อัพเดท Snapshot ถ้าเปลี่ยน user
  async update(
    id: number,
    updateAuditJobDto: UpdateAuditJobDto,
  ): Promise<AuditJobWithUsers> {
    const auditJob = await this.auditJobsRepository.findOne({
      where: { jobId: id },
    });

    if (!auditJob) {
      throw new NotFoundException(`Audit Job with ID ${id} not found`);
    }

    // ถ้ามีการเปลี่ยน auditor → update snapshot
    if (
      updateAuditJobDto.auditorUserId !== undefined &&
      updateAuditJobDto.auditorUserId !== auditJob.auditorUserId
    ) {
      const auditor = await this.getUserData(updateAuditJobDto.auditorUserId);
      if (auditor) {
        updateAuditJobDto['auditorUserCode'] = auditor.userCode;
        updateAuditJobDto['auditorFirstName'] = auditor.firstName;
        updateAuditJobDto['auditorLastName'] = auditor.lastName;
        updateAuditJobDto['auditorBranchName'] = auditor.branchName;
      }
    }

    // ถ้ามีการเปลี่ยน district manager → update snapshot
    if (
      updateAuditJobDto.districtManagerUserId !== undefined &&
      updateAuditJobDto.districtManagerUserId !== auditJob.districtManagerUserId
    ) {
      const dm = await this.getUserData(
        updateAuditJobDto.districtManagerUserId,
      );
      if (dm) {
        updateAuditJobDto['districtManagerUserCode'] = dm.userCode;
        updateAuditJobDto['districtManagerFirstName'] = dm.firstName;
        updateAuditJobDto['districtManagerLastName'] = dm.lastName;
        updateAuditJobDto['districtManagerBranchName'] = dm.branchName;
      }
    }

    // ถ้ามีการเปลี่ยน branch manager → update snapshot
    if (
      updateAuditJobDto.branchManagerUserId !== undefined &&
      updateAuditJobDto.branchManagerUserId !== auditJob.branchManagerUserId
    ) {
      const bm = await this.getUserData(updateAuditJobDto.branchManagerUserId);
      if (bm) {
        updateAuditJobDto['branchManagerUserCode'] = bm.userCode;
        updateAuditJobDto['branchManagerFirstName'] = bm.firstName;
        updateAuditJobDto['branchManagerLastName'] = bm.lastName;
        // ไม่มี branchManagerBranchName
      }
    }

    Object.assign(auditJob, updateAuditJobDto);

    const savedJob = await this.auditJobsRepository.save(auditJob);

    return await this.transformAuditJobWithUsers(savedJob);
  }

  // Soft delete
  async remove(
    id: number,
    deleteReason?: string,
    deletedBy?: number,
  ): Promise<void> {
    const auditJob = await this.auditJobsRepository.findOne({
      where: { jobId: id },
    });

    if (!auditJob) {
      throw new NotFoundException(`Audit Job with ID ${id} not found`);
    }

    auditJob.active = false;
    if (deleteReason) {
      auditJob.deleteReason = deleteReason;
      auditJob.deletedAt = new Date();
      auditJob.deletedBy = deletedBy;
    }
    await this.auditJobsRepository.save(auditJob);
  }

  // Confirm (lock) audit job
  async confirm(id: number, confirmedBy: number): Promise<AuditJobWithUsers> {
    const auditJob = await this.auditJobsRepository.findOne({
      where: { jobId: id },
    });

    if (!auditJob) {
      throw new NotFoundException(`Audit Job with ID ${id} not found`);
    }

    auditJob.status = 2;
    auditJob.updatedBy = confirmedBy;

    const savedJob = await this.auditJobsRepository.save(auditJob);
    return await this.transformAuditJobWithUsers(savedJob);
  }

  // Hard delete
  async delete(id: number): Promise<void> {
    const result = await this.auditJobsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Audit Job with ID ${id} not found`);
    }
  }

  // Get audit jobs by status
  async findByStatus(status: number): Promise<AuditJobsHeader[]> {
    return await this.auditJobsRepository.find({
      where: { status, active: true },
    });
  }

  // Get audit jobs by auditor
  async findByAuditor(auditorUserId: number): Promise<AuditJobsHeader[]> {
    return await this.auditJobsRepository.find({
      where: { auditorUserId, active: true },
      relations: ['items'],
    });
  }
}
