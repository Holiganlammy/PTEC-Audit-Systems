import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as sql from 'mssql';
import { AuditJobsHeader } from '../domain/audit.jobs-header.entity';
import { CreateAuditJobDto } from '../dto/create-audit-job.dto';
import { UpdateAuditJobDto } from '../dto/update-audit-job.dto';
import { DatabaseManagerService } from '../../database/database-manager.service';
import { databaseConfig } from '../config/database.config';

@Injectable()
export class AuditJobsService {
  constructor(
    @InjectRepository(AuditJobsHeader)
    private readonly auditJobsRepository: Repository<AuditJobsHeader>,
    private readonly dbManager: DatabaseManagerService,
  ) {}

  // Running number generator
  async running_number(type: string): Promise<string> {
    try {
      console.log('Database Config:', databaseConfig);
      console.log('Calling SP:', `${databaseConfig.database}.dbo.RunningNo`);

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
  // Get all audit jobs (with optional filters)
  async findAll(filters?: {
    status?: number;
    branchId?: number;
    auditorUserId?: number;
    active?: boolean;
  }): Promise<AuditJobsHeader[]> {
    const query = this.auditJobsRepository.createQueryBuilder('job');

    if (filters?.status !== undefined) {
      query.andWhere('job.status = :status', { status: filters.status });
    }

    if (filters?.branchId !== undefined) {
      query.andWhere('job.branchId = :branchId', {
        branchId: filters.branchId,
      });
    }

    if (filters?.auditorUserId !== undefined) {
      query.andWhere('job.auditorUserId = :auditorUserId', {
        auditorUserId: filters.auditorUserId,
      });
    }

    if (filters?.active !== undefined) {
      query.andWhere('job.active = :active', { active: filters.active });
    }

    return await query.getMany();
  }

  // Get audit job by ID with relations
  async findOne(id: number): Promise<AuditJobsHeader> {
    const auditJob = await this.auditJobsRepository.findOne({
      where: { jobId: id },
      relations: ['items', 'items.categoryItem'],
    });

    if (!auditJob) {
      throw new NotFoundException(`Audit Job with ID ${id} not found`);
    }

    return auditJob;
  }

  // Update audit job
  async update(
    id: number,
    updateAuditJobDto: UpdateAuditJobDto,
  ): Promise<AuditJobsHeader> {
    const auditJob = await this.findOne(id);

    Object.assign(auditJob, updateAuditJobDto);

    return await this.auditJobsRepository.save(auditJob);
  }

  // Soft delete (set active = false)
  async remove(id: number): Promise<void> {
    const auditJob = await this.findOne(id);
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
