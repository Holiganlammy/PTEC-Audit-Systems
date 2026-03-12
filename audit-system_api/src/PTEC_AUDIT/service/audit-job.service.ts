import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as sql from 'mssql';
import { AuditJobsHeader } from '../domain/model/audit.jobs-header.entity';
import { AuditItem } from '../domain/model/audit-item.entity';
import { CreateAuditJobDto } from '../dto/create-audit-job.dto';
import { UpdateAuditJobDto } from '../dto/update-audit-job.dto';
import { DatabaseManagerService } from '../../database/database-manager.service';
import { databaseConfig } from '../config/database.config';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';
// import { User } from '../../PTEC_USERIGHT/domain/model/ptec_useright.entity';
import {
  PaginationParams,
  PaginatedResponse,
  PaginationMeta,
  UserInfo,
  UserData,
  AuditItemWithUsers,
  AuditJobWithUsers,
} from '../domain/type/audit-job.interface';

@Injectable()
export class AuditJobsService {
  constructor(
    @InjectRepository(AuditJobsHeader)
    private readonly auditJobsRepository: Repository<AuditJobsHeader>,
    private readonly dbManager: DatabaseManagerService,
    private readonly userRightService: UserRightService,
  ) {}

  // Helper method to get user data by UserID
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
          email: user.Email,
          position: user.Position,
          branchId: user.BranchID,
        };
      }
    } catch (error) {
      console.error(`Error fetching user data for userId ${userId}:`, error);
    }

    return undefined;
  }

  // Helper method to transform audit item with user data
  private async transformAuditItemWithUsers(
    item: AuditItem,
  ): Promise<AuditItemWithUsers> {
    const [createdByUser, updatedByUser] = await Promise.all([
      this.getUserData(item.createdBy),
      this.getUserData(item.updateBy),
    ]);

    return {
      itemId: item.itemId,
      jobId: item.jobId,
      categoryItemId: item.categoryItemId,
      inspectionDate: item.inspectionDate,
      itemStatus: item.itemStatus,
      remarks: item.remarks,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      active: item.active,
      createdByUser,
      updatedByUser,
      categoryItem: item.categoryItem,
      amDetail: item.amDetail,
      auditDetail: item.auditDetail,
      otherDetails: item.otherDetails,
      taggedUsers: item.taggedUsers,
    };
  }

  // Helper method to transform audit job with user data
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
      transformedItems = await Promise.all(
        job.items.map((item) => this.transformAuditItemWithUsers(item)),
      );
    }

    // Remove the ID fields and add user data
    const {
      auditorUserId: _auditorUserId,
      districtManagerUserId: _districtManagerUserId,
      branchManagerUserId: _branchManagerUserId,
      createdBy: _createdBy,
      updatedBy: _updatedBy,
      items: _items,
      ...jobWithoutIds
    } = job;

    return {
      ...jobWithoutIds,
      auditor,
      districtManager,
      branchManager,
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

  // Create new audit job
  async create(createAuditJobDto: CreateAuditJobDto): Promise<AuditJobsHeader> {
    try {
      // Generate running number for jobNo
      const jobNo = await this.running_number('AJB');
      console.log('Generated Job Number:', jobNo);

      if (!jobNo) {
        throw new Error('Running number not generated');
      }

      const auditJob = this.auditJobsRepository.create({
        ...createAuditJobDto,
        jobNo,
      });
      return await this.auditJobsRepository.save(auditJob);
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
    // Set default values
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    // Build query
    const query = this.auditJobsRepository.createQueryBuilder('job');

    // Apply filters
    if (params.status !== undefined) {
      query.andWhere('job.status = :status', { status: params.status });
    }

    if (params.branchId !== undefined) {
      query.andWhere('job.branchId = :branchId', {
        branchId: params.branchId,
      });
    }

    if (params.auditorUserId !== undefined) {
      query.andWhere('job.auditorUserId = :auditorUserId', {
        auditorUserId: params.auditorUserId,
      });
    }

    if (params.active !== undefined) {
      query.andWhere('job.active = :active', { active: params.active });
    } else {
      // Default: only show active jobs
      query.andWhere('job.active = :active', { active: true });
    }

    if (!user.is_admin) {
      query.andWhere(
        '(job.auditorUserId = :userId OR job.districtManagerUserId = :userId OR job.branchManagerUserId = :userId)',
        { userId: user.user_id },
      );
    }

    // Get total count
    const total = await query.getCount();

    // Apply pagination and sorting
    query.orderBy('job.createdAt', 'DESC').skip(skip).take(limit);

    // Get data
    const data = await query.getMany();

    // Transform data to include user information
    const transformedData = await Promise.all(
      data.map((job) => this.transformAuditJobWithUsers(job)),
    );

    // Calculate pagination meta
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

  // Get audit job by ID with relations (สำหรับหน้า edit)
  async findOne(id: number): Promise<AuditJobWithUsers> {
    const auditJob = await this.auditJobsRepository.findOne({
      where: { jobId: id },
      relations: [
        'items',
        'items.categoryItem',
        'items.amDetail',
        'items.auditDetail',
        'items.relatedAgencies',
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
        'items',
        'items.categoryItem',
        'items.amDetail',
        'items.auditDetail',
        'items.relatedAgencies',
        'items.taggedUsers',
      ],
    });

    if (!auditJob) {
      throw new NotFoundException(`Audit Job with JobNo ${jobNo} not found`);
    }

    return await this.transformAuditJobWithUsers(auditJob);
  }

  // Update audit job
  async update(
    id: number,
    updateAuditJobDto: UpdateAuditJobDto,
  ): Promise<AuditJobWithUsers> {
    // ดึงข้อมูลแบบปกติจาก repository (ไม่ใช่ผ่าน findOne ที่ได้ transform แล้ว)
    const auditJob = await this.auditJobsRepository.findOne({
      where: { jobId: id },
    });

    if (!auditJob) {
      throw new NotFoundException(`Audit Job with ID ${id} not found`);
    }

    Object.assign(auditJob, updateAuditJobDto);

    const savedJob = await this.auditJobsRepository.save(auditJob);

    // Transform และ return ข้อมูลพร้อม user data
    return await this.transformAuditJobWithUsers(savedJob);
  }

  // Soft delete (set active = false)
  async remove(id: number): Promise<void> {
    const auditJob = await this.auditJobsRepository.findOne({
      where: { jobId: id },
    });

    if (!auditJob) {
      throw new NotFoundException(`Audit Job with ID ${id} not found`);
    }

    auditJob.active = false;
    await this.auditJobsRepository.save(auditJob);
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
