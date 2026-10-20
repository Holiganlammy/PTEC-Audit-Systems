// branch-audit-score.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { BranchAmScores } from '../domain/model/branch_am_scores.entity';
import { AMJobHeader } from '../domain/model/am.jobs-header.entity';
import { AAJobHeader } from '../domain/model/aa.jobs-header.entity';
import {
  CreateBranchAuditScoreDto,
  UpdateBranchAuditScoreDto,
  CreateScoreBatchDto,
} from '../dto/branch-audit-score.dto';

@Injectable()
export class BranchAmScoresService {
  constructor(
    @InjectRepository(BranchAmScores)
    private readonly scoreRepository: Repository<BranchAmScores>,
    @InjectRepository(AMJobHeader)
    private readonly amJobRepository: Repository<AMJobHeader>,
    @InjectRepository(AAJobHeader)
    private readonly aaJobRepository: Repository<AAJobHeader>,
  ) {}

  // job_id ของตารางนี้เป็น polymorphic (ชี้ไป AMJobs_Header หรือ AAJobs_Header แล้วแต่ source)
  // DB ไม่มี FK คุ้มครองแล้ว (ถูกถอดออกเพราะ FK เดิมผูกไว้กับ AMJobs_Header ตารางเดียว ทำให้
  // insert ของฝั่ง AA พังเวลา job_id ไม่ตรงกับตาราง AM) จึงต้องเช็คเองที่ชั้นนี้แทน
  private async assertJobExists(jobId: number, source: string): Promise<void> {
    const exists =
      source === 'AA'
        ? await this.aaJobRepository.exists({ where: { jobId } })
        : await this.amJobRepository.exists({ where: { jobId } });

    if (!exists) {
      throw new NotFoundException(
        `Job ${jobId} not found in ${source === 'AA' ? 'AAJobs_Header' : 'AMJobs_Header'}`,
      );
    }
  }

  // ==================== CREATE ====================
  async create(createDto: CreateBranchAuditScoreDto): Promise<BranchAmScores> {
    const source = (createDto.source as string) || 'AM';
    await this.assertJobExists(createDto.jobId, source);

    const existing = await this.scoreRepository.findOne({
      where: {
        jobId: createDto.jobId,
        itemId: createDto.itemId,
        source,
        active: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Score already exists for job ${createDto.jobId} and item ${createDto.itemId}`,
      );
    }

    const score = this.scoreRepository.create({
      ...createDto,
      source,
      active: true,
    });

    return await this.scoreRepository.save(score);
  }

  // ==================== batch CREATE ====================
  async batchCreate(batchDto: CreateScoreBatchDto): Promise<BranchAmScores[]> {
    const source = (batchDto.source as string) || 'AM';
    await this.assertJobExists(batchDto.jobId, source);

    const scores = batchDto.scores.map((scoreData) =>
      this.scoreRepository.create({
        jobId: batchDto.jobId,
        branchId: batchDto.branchId,
        itemId: scoreData.itemId,
        score: scoreData.score,
        remarks: scoreData.remarks,
        createdBy: batchDto.createdBy,
        source,
        active: true,
      }),
    );

    return await this.scoreRepository.save(scores);
  }

  // ==================== FIND ALL ====================
  async findAll(filter?: {
    jobId?: number;
    branchId?: number;
    source?: string;
  }): Promise<BranchAmScores[]> {
    const where: FindOptionsWhere<BranchAmScores> = { active: true };
    if (filter?.jobId) where.jobId = filter.jobId;
    if (filter?.branchId) where.branchId = filter.branchId;
    if (filter?.source) where.source = filter.source;
    return await this.scoreRepository.find({
      where,
      relations: ['item'],
      order: { createdAt: 'DESC' },
    });
  }

  // ==================== FIND BY JOB ====================
  async findByJob(jobId: number): Promise<BranchAmScores[]> {
    return await this.scoreRepository.find({
      where: { jobId, active: true },
      relations: ['item'],
      order: { itemId: 'ASC' },
    });
  }

  // ==================== FIND BY BRANCH ====================
  async findByBranch(branchId: number): Promise<BranchAmScores[]> {
    return await this.scoreRepository.find({
      where: { branchId, active: true },
      relations: ['item'],
      order: { createdAt: 'DESC' },
    });
  }

  // ==================== FIND BY ITEM ====================
  async findByItem(itemId: number): Promise<BranchAmScores | null> {
    return await this.scoreRepository.findOne({
      where: { itemId, active: true },
      relations: ['item'],
    });
  }

  // ==================== FIND ONE ====================
  async findOne(scoreId: number): Promise<BranchAmScores> {
    const score = await this.scoreRepository.findOne({
      where: { scoreId, active: true },
      relations: ['item'],
    });

    if (!score) {
      throw new NotFoundException(`Score with ID ${scoreId} not found`);
    }

    return score;
  }

  // ==================== UPDATE ====================
  async update(
    scoreId: number,
    updateDto: UpdateBranchAuditScoreDto,
  ): Promise<BranchAmScores> {
    const score = await this.findOne(scoreId);

    Object.assign(score, updateDto);

    return await this.scoreRepository.save(score);
  }

  // ==================== DELETE (SOFT) ====================
  async remove(scoreId: number): Promise<void> {
    const score = await this.findOne(scoreId);
    score.active = false;
    await this.scoreRepository.save(score);
  }

  // ==================== GET SUMMARY BY JOB ====================
  async getSummaryByJob(jobId: number): Promise<{
    jobId: number;
    branchId: number;
    totalItems: number;
    passed: number;
    warning: number;
    failed: number;
    totalScore: number;
    percentage: number;
  }> {
    const scores = await this.findByJob(jobId);

    if (scores.length === 0) {
      throw new NotFoundException(`No scores found for job ${jobId}`);
    }

    const branchId = scores[0].branchId;
    const totalItems = scores.length;
    const passed = scores.filter((s) => s.score === 1).length;
    const warning = scores.filter((s) => s.score === 0).length;
    const failed = scores.filter((s) => s.score === -1).length;
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const maxScore = totalItems; // Max = 1 per item
    const percentage = (totalScore / maxScore) * 100;

    return {
      jobId,
      branchId,
      totalItems,
      passed,
      warning,
      failed,
      totalScore,
      percentage: Math.round(percentage * 100) / 100, // 2 decimal places
    };
  }

  // ==================== GET SUMMARY BY BRANCH ====================
  async getSummaryByBranch(branchId: number): Promise<{
    branchId: number;
    totalJobs: number;
    totalItems: number;
    passed: number;
    warning: number;
    failed: number;
    totalScore: number;
    averagePercentage: number;
  }> {
    const scores = await this.findByBranch(branchId);

    if (scores.length === 0) {
      throw new NotFoundException(`No scores found for branch ${branchId}`);
    }

    const uniqueJobs = [...new Set(scores.map((s) => s.jobId))];
    const totalJobs = uniqueJobs.length;
    const totalItems = scores.length;
    const passed = scores.filter((s) => s.score === 1).length;
    const warning = scores.filter((s) => s.score === 0).length;
    const failed = scores.filter((s) => s.score === -1).length;
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const maxScore = totalItems;
    const averagePercentage = (totalScore / maxScore) * 100;

    return {
      branchId,
      totalJobs,
      totalItems,
      passed,
      warning,
      failed,
      totalScore,
      averagePercentage: Math.round(averagePercentage * 100) / 100,
    };
  }
}
