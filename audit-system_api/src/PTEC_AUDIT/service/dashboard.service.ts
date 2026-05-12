// dashboard/service/dashboard.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditItem } from '../domain/model/audit-item.entity';
import { AuditJobsHeader } from '../domain/model/audit.jobs-header.entity';
import { AuditItemAuditComment } from '../domain/model/audit-item-audit-comment.entity';
import { AuditItemAMComment } from '../domain/model/audit-item-am-comment.entity';
import { AuditItemOtherComment } from '../domain/model/audit-item-other-comment.entity';

// ==========================================
// Interfaces
// ==========================================

interface AMStats {
  notChecked: number;
  pending: number;
  passed: number;
  failed: number;
  needFix: number;
  totalIssues: number;
}

interface AuditStats {
  totalJobs: number;
  activeJobs: number;
  waitingAM: number;
  issueJobs: number;
  closedJobs: number;
}

interface UserStats {
  taggedMe: number;
  waitingMyComment: number;
  completed: number;
}

interface ManagerStats {
  totalBranches: number;
  branchesWithIssues: number;
  normalBranches: number;
  averageScore: number;
}

interface ActionItem {
  id: number;
  jobNo: string;
  branchName: string;
  status: string;
  daysAgo: number;
  statusColor: 'default' | 'secondary' | 'destructive' | 'outline';
}

interface Activity {
  id: string;
  user: string;
  userCode: string;
  action: string;
  jobNo: string;
  timestamp: Date;
  type: 'comment' | 'approve' | 'create' | 'update';
}

interface BranchIssue {
  branchId: number;
  branchName: string;
  issueCount: number;
  failureRate: number;
}

interface BranchRanking {
  branchId: number;
  branchName: string;
  score: number;
  issueCount: number;
  rank: number;
}

interface ItemList {
  items: ActionItem[];
  totalCount: number;
}

// Query Result Interfaces
interface AMStatsResult {
  notCheckedCount: string;
  pendingCount: string;
  passedCount: string;
  failedCount: string;
  needFixCount: string;
}

interface AuditStatsResult {
  totalJobs: string;
  activeJobs: string;
  waitingAM: string;
  issueJobs: string;
  closedJobs: string;
}

interface CountResult {
  count: string;
}

interface BranchIssueResult {
  branchId: number;
  branchName: string;
  issueCount: string;
  totalCount: string;
}

// ==========================================
// Service
// ==========================================

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(AuditItem)
    private readonly auditItemRepo: Repository<AuditItem>,

    @InjectRepository(AuditJobsHeader)
    private readonly auditJobRepo: Repository<AuditJobsHeader>,

    @InjectRepository(AuditItemAuditComment)
    private readonly auditCommentRepo: Repository<AuditItemAuditComment>,

    @InjectRepository(AuditItemAMComment)
    private readonly amCommentRepo: Repository<AuditItemAMComment>,

    @InjectRepository(AuditItemOtherComment)
    private readonly otherCommentRepo: Repository<AuditItemOtherComment>,
  ) {}

  // ==========================================
  // Dashboard Data Methods
  // ==========================================

  /**
   * Get AM Dashboard Data (Enhanced with separated lists)
   */
  async getAMDashboardData(userId: string, dateRange: number) {
    const stats = await this.getAMStats(userId, dateRange);
    const recentActivities = await this.getRecentActivities(dateRange);
    const branchIssues = await this.getAMBranchIssues(userId, dateRange);

    // แยก Action Items ตามสถานะ
    const notCheckedItems = await this.getAMItemsByStatus(
      userId,
      dateRange,
      [0],
    ); // ยังไม่ตรวจ
    const failedItems = await this.getAMItemsByStatus(userId, dateRange, [3]); // ไม่ผ่าน
    const needFixItems = await this.getAMItemsByStatus(userId, dateRange, [4]); // ต้องแก้ไข

    return {
      stats: { am: stats },
      notCheckedItems,
      failedItems,
      needFixItems,
      recentActivities,
      branchIssues,
    };
  }

  /**
   * Get Audit Dashboard Data
   */
  async getAuditDashboardData(userId: string, dateRange: number) {
    const stats = await this.getAuditStats(dateRange);
    const actionItems = await this.getAuditActionItems(dateRange);
    const recentActivities = await this.getRecentActivities(dateRange);

    return {
      stats: { audit: stats },
      actionItems,
      recentActivities,
    };
  }

  /**
   * Get User Dashboard Data
   */
  async getUserDashboardData(userId: string, dateRange: number) {
    const stats = this.getUserStats(userId, dateRange);
    const actionItems = this.getUserActionItems(userId, dateRange);
    const recentActivities = await this.getRecentActivities(dateRange);

    return {
      stats: { user: stats },
      actionItems,
      recentActivities,
    };
  }

  /**
   * Get Manager Dashboard Data
   */
  async getManagerDashboardData(userId: string, dateRange: number) {
    const stats = await this.getManagerStats(dateRange);
    const actionItems: ActionItem[] = [];
    const recentActivities = await this.getRecentActivities(dateRange);
    const branchRankings: BranchRanking[] = [];

    return {
      stats: { manager: stats },
      actionItems,
      recentActivities,
      branchRankings,
    };
  }

  // ==========================================
  // AM Stats & Items
  // ==========================================

  private async getAMStats(
    userId: string,
    dateRange: number,
  ): Promise<AMStats> {
    const startDate = this.getStartDate(dateRange);

    const result = await this.auditItemRepo
      .createQueryBuilder('ai')
      .select([
        'COUNT(CASE WHEN ai.amChecklistStatus IS NULL OR ai.amChecklistStatus = 0 THEN 1 END) AS notCheckedCount',
        'COUNT(CASE WHEN ai.amChecklistStatus = 1 THEN 1 END) AS pendingCount',
        'COUNT(CASE WHEN ai.amChecklistStatus = 2 THEN 1 END) AS passedCount',
        'COUNT(CASE WHEN ai.amChecklistStatus = 3 THEN 1 END) AS failedCount',
        'COUNT(CASE WHEN ai.amChecklistStatus = 4 THEN 1 END) AS needFixCount',
      ])
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('aj.districtManagerUserCode = :userId', { userId })
      .getRawOne<AMStatsResult>();

    const failed = parseInt(result?.failedCount || '0', 10);
    const needFix = parseInt(result?.needFixCount || '0', 10);

    return {
      notChecked: parseInt(result?.notCheckedCount || '0', 10),
      pending: parseInt(result?.pendingCount || '0', 10),
      passed: parseInt(result?.passedCount || '0', 10),
      failed,
      needFix,
      totalIssues: failed + needFix,
    };
  }

  /**
   * ดึง AM Items ตามสถานะ (สำหรับ Dialog)
   */
  private async getAMItemsByStatus(
    userId: string,
    dateRange: number,
    statuses: number[],
  ): Promise<ItemList> {
    const startDate = this.getStartDate(dateRange);
    const statusCondition = statuses.includes(0)
      ? '(ai.amChecklistStatus IS NULL OR ai.amChecklistStatus = 0)'
      : 'ai.amChecklistStatus IN (:...statuses)';
    const statusParams = statuses.includes(0) ? {} : { statuses };

    // นับจำนวน job header ที่มี item ตามสถานะ
    const totalCount = await this.auditJobRepo
      .createQueryBuilder('aj')
      .innerJoin('aj.items', 'ai')
      .where('aj.districtManagerUserCode = :userId', { userId })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.updatedAt >= :startDate', { startDate })
      .andWhere(statusCondition, statusParams)
      .select('aj.jobId')
      .distinct(true)
      .getCount();

    // ดึง job header (TOP 50) ที่มี item ตามสถานะ — แสดง job header ละ 1 แถว
    const jobs = await this.auditJobRepo
      .createQueryBuilder('aj')
      .innerJoin('aj.items', 'ai')
      .where('aj.districtManagerUserCode = :userId', { userId })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.updatedAt >= :startDate', { startDate })
      .andWhere(statusCondition, statusParams)
      .select(['aj.jobId', 'aj.jobNo', 'aj.branchName', 'aj.updatedAt'])
      .distinct(true)
      .orderBy('aj.updatedAt', 'DESC')
      .take(50)
      .getMany();

    return {
      items: jobs.map((job) => ({
        id: job.jobId,
        jobNo: job.jobNo || '',
        branchName: job.branchName || '',
        status: '',
        daysAgo: this.calculateDaysAgo(job.updatedAt),
        statusColor: 'default' as const,
      })),
      totalCount,
    };
  }

  /**
   * ดึงสาขาที่มีปัญหามากที่สุด (Top 5)
   */
  private async getAMBranchIssues(
    userId: string,
    dateRange: number,
  ): Promise<BranchIssue[]> {
    const startDate = this.getStartDate(dateRange);

    const result = await this.auditItemRepo
      .createQueryBuilder('ai')
      .select('aj.branchId', 'branchId')
      .addSelect('aj.branchName', 'branchName')
      .addSelect(
        'COUNT(CASE WHEN ai.amChecklistStatus IN (3, 4) THEN 1 END)',
        'issueCount',
      )
      .addSelect('COUNT(*)', 'totalCount')
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('aj.districtManagerUserCode = :userId', { userId })
      .groupBy('aj.branchId')
      .addGroupBy('aj.branchName')
      .having('COUNT(CASE WHEN ai.amChecklistStatus IN (3, 4) THEN 1 END) > 0')
      .orderBy('issueCount', 'DESC')
      .limit(5)
      .getRawMany<BranchIssueResult>();

    return result.map((row) => ({
      branchId: row.branchId,
      branchName: row.branchName,
      issueCount: parseInt(row.issueCount, 10),
      failureRate: Math.round(
        (parseInt(row.issueCount, 10) / parseInt(row.totalCount, 10)) * 100,
      ),
    }));
  }

  // ==========================================
  // Audit Stats & Items
  // ==========================================

  private async getAuditStats(dateRange: number): Promise<AuditStats> {
    const startDate = this.getStartDate(dateRange);

    const result = await this.auditItemRepo
      .createQueryBuilder('ai')
      .select([
        'COUNT(DISTINCT ai.jobId) AS totalJobs',
        'COUNT(CASE WHEN ai.itemStatus = 2 THEN 1 END) AS activeJobs',
        'COUNT(CASE WHEN ai.amChecklistStatus = 1 THEN 1 END) AS waitingAM',
        'COUNT(CASE WHEN ai.itemStatus = 3 THEN 1 END) AS issueJobs',
        'COUNT(CASE WHEN ai.itemStatus = 4 THEN 1 END) AS closedJobs',
      ])
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .getRawOne<AuditStatsResult>();

    return {
      totalJobs: parseInt(result?.totalJobs || '0', 10),
      activeJobs: parseInt(result?.activeJobs || '0', 10),
      waitingAM: parseInt(result?.waitingAM || '0', 10),
      issueJobs: parseInt(result?.issueJobs || '0', 10),
      closedJobs: parseInt(result?.closedJobs || '0', 10),
    };
  }

  private async getAuditActionItems(dateRange: number): Promise<ActionItem[]> {
    const startDate = this.getStartDate(dateRange);

    const items = await this.auditItemRepo
      .createQueryBuilder('ai')
      .leftJoinAndSelect('ai.job', 'aj')
      .where('ai.itemStatus IN (:...statuses)', { statuses: [2, 3] })
      .andWhere('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .orderBy('ai.updatedAt', 'DESC')
      .take(10)
      .getMany();

    return items.map((item) => ({
      id: item.itemId,
      jobNo: item.job?.jobNo || '',
      branchName: item.job?.branchName || '',
      status: this.getItemStatusText(item.itemStatus),
      daysAgo: this.calculateDaysAgo(item.updatedAt),
      statusColor: this.getItemStatusColor(item.itemStatus),
    }));
  }

  // ==========================================
  // User Stats & Items
  // ==========================================

  private getUserStats(_userId: string, _dateRange: number): UserStats {
    return {
      taggedMe: 0,
      waitingMyComment: 0,
      completed: 0,
    };
  }

  private getUserActionItems(
    _userId: string,
    _dateRange: number,
  ): ActionItem[] {
    return [];
  }

  // ==========================================
  // Manager Stats
  // ==========================================

  private async getManagerStats(_dateRange: number): Promise<ManagerStats> {
    const result = await this.auditJobRepo
      .createQueryBuilder('aj')
      .select('COUNT(DISTINCT aj.branchId)', 'count')
      .where('aj.active = :active', { active: true })
      .getRawOne<CountResult>();

    const totalBranches = parseInt(result?.count || '0', 10);

    return {
      totalBranches,
      branchesWithIssues: 0,
      normalBranches: 0,
      averageScore: 0,
    };
  }

  // ==========================================
  // Recent Activities
  // ==========================================

  private async getRecentActivities(dateRange: number): Promise<Activity[]> {
    const startDate = this.getStartDate(dateRange);
    const activities: Activity[] = [];

    const auditComments = await this.auditCommentRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.item', 'ai')
      .leftJoinAndSelect('ai.job', 'aj')
      .where('c.createdAt >= :startDate', { startDate })
      .andWhere('c.active = :active', { active: true })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .orderBy('c.createdAt', 'DESC')
      .take(5)
      .getMany();

    auditComments.forEach((comment) => {
      activities.push({
        id: `audit-${comment.auditDetailId}`,
        user: this.getUserFullname(comment.userId),
        userCode: `USER${comment.userId}`,
        action: 'Comment ใน',
        jobNo: comment.item?.job?.jobNo || '',
        timestamp: new Date(comment.createdAt),
        type: 'comment',
      });
    });

    const amComments = await this.amCommentRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.item', 'ai')
      .leftJoinAndSelect('ai.job', 'aj')
      .where('c.createdAt >= :startDate', { startDate })
      .andWhere('c.active = :active', { active: true })
      .andWhere('ai.active = :active', { active: true })
      .orderBy('c.createdAt', 'DESC')
      .take(5)
      .getMany();

    amComments.forEach((comment) => {
      activities.push({
        id: `am-${comment.amDetailId}`,
        user: this.getUserFullname(comment.userId),
        userCode: `USER${comment.userId}`,
        action: 'AM Check ใน',
        jobNo: comment.item?.job?.jobNo || '',
        timestamp: new Date(comment.createdAt),
        type: 'approve',
      });
    });

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private getStartDate(dateRange: number): Date {
    if (dateRange === 0) {
      return new Date('1900-01-01');
    }
    const date = new Date();
    date.setDate(date.getDate() - dateRange);
    return date;
  }

  private calculateDaysAgo(date: Date): number {
    const now = new Date();
    const updatedAt = new Date(date);
    const diffTime = Math.abs(now.getTime() - updatedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private getUserFullname(userId: number | null): string {
    return userId ? `User ${userId}` : 'Unknown';
  }

  private getAMChecklistStatusText(status: number | null): string {
    const statusMap: Record<number, string> = {
      0: 'ยังไม่ได้ตรวจ',
      1: 'รอตรวจสอบ',
      2: 'ผ่าน',
      3: 'ไม่ผ่าน',
      4: 'ต้องแก้ไข',
    };
    return status !== null ? statusMap[status] || 'ยังไม่เช็ค' : 'ยังไม่เช็ค';
  }

  private getAMChecklistStatusColor(
    status: number | null,
  ): 'default' | 'secondary' | 'destructive' | 'outline' {
    const colorMap: Record<
      number,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
      0: 'outline',
      1: 'default',
      2: 'secondary',
      3: 'destructive',
      4: 'default',
    };
    return status !== null ? colorMap[status] || 'outline' : 'outline';
  }

  private getItemStatusText(status: number | null): string {
    const statusMap: Record<number, string> = {
      1: 'ปกติ',
      2: 'อยู่ระหว่างดำเนินการ',
      3: 'ผิดปกติ',
      4: 'ปิดเคส',
    };
    return status !== null ? statusMap[status] || '-' : '-';
  }

  private getItemStatusColor(
    status: number | null,
  ): 'default' | 'secondary' | 'destructive' | 'outline' {
    const colorMap: Record<
      number,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
      1: 'secondary',
      2: 'default',
      3: 'destructive',
      4: 'outline',
    };
    return status !== null ? colorMap[status] || 'outline' : 'outline';
  }
}
