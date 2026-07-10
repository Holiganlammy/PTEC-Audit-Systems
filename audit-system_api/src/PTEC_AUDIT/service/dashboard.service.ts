// dashboard/service/dashboard.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditItem } from '../domain/model/audit-item.entity';
import { AuditJobsHeader } from '../domain/model/audit.jobs-header.entity';
import { AuditItemAuditComment } from '../domain/model/audit-item-audit-comment.entity';
import { AuditItemAMComment } from '../domain/model/audit-item-am-comment.entity';
import { AuditItemOtherComment } from '../domain/model/audit-item-other-comment.entity';
import { AuditItemOtherCommentUserTag } from '../domain/model/audit-item-other-comment-users-tag.entity';
import { AMItem } from '../../PTEC_AUDIT_AM_AA/domain/model/am-item.entity';
import { AMJobHeader } from '../../PTEC_AUDIT_AM_AA/domain/model/am.jobs-header.entity';
import { AMItemAMComment } from '../../PTEC_AUDIT_AM_AA/domain/model/am-item-am-comment.entity';
import { AMItemAMCheckerComment } from '../../PTEC_AUDIT_AM_AA/domain/model/am-item-am-checker-comment.entity';
import { AMItemOtherComment } from '../../PTEC_AUDIT_AM_AA/domain/model/am-item-other-comment.entity';
import { AMItemOtherCommentUsersTag } from '../../PTEC_AUDIT_AM_AA/domain/model/am-item-other-comment-users-tag.entity';
import { AppService as UserRightService } from '../../PTEC_USERIGHT/service/ptec_useright.service';
import {
  // AMChartData,
  // AuditChartData,
  // AMChartData,
  // AuditChartData,
  UserChartData,
  // ManagerChartData,
} from '../domain/type/dashboard-chart';

// ==========================================
// Interfaces
// ==========================================

interface AuditStats {
  totalJobs: number;
  activeJobs: number;
  closedJobs: number;
  pendingCloseCase: number;
  overdueItems: number;
}

interface UserStats {
  taggedMe: number;
  myComments: number;
  hasReplies: number;
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
  categoryName: string | null;
  categoryCode: number | null;
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
  totalCount: number;
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
interface AuditStatsResult {
  closedJobs: string;
  pendingCloseCase: string;
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

interface AMChartData {
  date: string;
  passed: number;
  failed: number;
  needFix: number;
}

interface AuditChartData {
  date: string;
  active: number;
  closed: number;
  waitingAM: number;
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

    @InjectRepository(AuditItemOtherCommentUserTag)
    private readonly tagRepo: Repository<AuditItemOtherCommentUserTag>,

    @InjectRepository(AMItem)
    private readonly amItemRepo: Repository<AMItem>,

    @InjectRepository(AMJobHeader)
    private readonly amJobRepo: Repository<AMJobHeader>,

    @InjectRepository(AMItemAMComment)
    private readonly amAmCommentRepo: Repository<AMItemAMComment>,

    @InjectRepository(AMItemAMCheckerComment)
    private readonly amCheckerCommentRepo: Repository<AMItemAMCheckerComment>,

    @InjectRepository(AMItemOtherComment)
    private readonly amOtherCommentRepo: Repository<AMItemOtherComment>,

    @InjectRepository(AMItemOtherCommentUsersTag)
    private readonly amTagRepo: Repository<AMItemOtherCommentUsersTag>,

    private readonly userRightService: UserRightService,
  ) {}

  // ==========================================
  // Dashboard Data Methods
  // ==========================================

  /**
   *  Get AM Dashboard Data
   */
  async getAMDashboardData(userId: string, dateRange: number) {
    const stats = await this.getAMDocStats(dateRange);
    const recentActivities = await this.getAMRecentActivities(dateRange);
    const branchIssues = await this.getAMBranchIssues(dateRange);

    const notCheckedItems = await this.getAMDocItemsByStatus(
      dateRange,
      'NOT_CHECKED',
    );
    const activeItems = await this.getActiveAMJobs(dateRange);
    const pendingCloseCaseItems = await this.getAMDocItemsByStatus(
      dateRange,
      'PENDING_CLOSE_CASE',
    );
    const overdueItems = await this.getOverdueAMItems();

    return {
      stats: { am: stats },
      notCheckedItems,
      activeItems,
      pendingCloseCaseItems,
      overdueItems,
      recentActivities,
      branchIssues,
    };
  }

  /**
   *  Get Audit Dashboard Data
   */
  async getAuditDashboardData(userId: string, dateRange: number) {
    const stats = await this.getAuditStats(dateRange);
    const recentActivities = await this.getRecentActivities(dateRange);

    const notCheckedItems = await this.getAuditItemsByStatus(
      dateRange,
      'NOT_CHECKED',
    );
    const activeItems = await this.getActiveAuditJobs(dateRange);
    const pendingCloseCaseItems = await this.getAuditItemsByStatus(
      dateRange,
      'PENDING_CLOSE_CASE',
    );
    const overdueItems = await this.getOverdueAuditItems();

    return {
      stats: { audit: stats },
      notCheckedItems,
      activeItems,
      pendingCloseCaseItems,
      overdueItems,
      recentActivities,
    };
  }

  /**
   *  Get User Dashboard Data
   */
  async getUserDashboardData(userId: string, dateRange: number) {
    const stats = await this.getUserStats(userId, dateRange);
    const recentActivities = await this.getRecentActivities(dateRange);

    const taggedItems = await this.getUserItemsByType(
      userId,
      dateRange,
      'TAGGED',
    );
    const myComments = await this.getUserItemsByType(
      userId,
      dateRange,
      'MY_COMMENTS',
    );
    const mentionedItems = await this.getUserItemsByType(
      userId,
      dateRange,
      'MENTIONS',
    );

    return {
      stats: { user: stats },
      taggedItems,
      myComments,
      mentioned: mentionedItems, // เปลี่ยนชื่อใน response เป็น mentionedItems แทน
      recentActivities,
    };
  }

  /**
   * Get Manager Dashboard Data
   */
  async getManagerDashboardData(userId: string, dateRange: number) {
    const stats = await this.getManagerStats(dateRange);
    const recentActivities = await this.getRecentActivities(dateRange);
    const branchRankings = await this.getManagerBranchRankings(dateRange);

    // เพิ่ม Branch Lists
    const branchesWithIssues = await this.getBranchesWithIssues(dateRange);
    const normalBranches = await this.getNormalBranches(dateRange);

    return {
      stats: { manager: stats },
      recentActivities,
      branchRankings,
      branchesWithIssues,
      normalBranches,
    };
  }

  // ==========================================
  // AM Stats & Items
  // ==========================================

  private async getAMBranchIssues(dateRange: number): Promise<BranchIssue[]> {
    const startDate = this.getStartDate(dateRange);

    // ใช้ Branch_Am_Scores (คะแนนที่ให้ครั้งแรกตอนตรวจ) แทน headerChecklistStatus
    // เพราะแม้ภายหลังจะมีการแก้ไข checklist status คะแนนแรกที่เจอปัญหาก็ยังคงสำคัญ
    // ใช้ LEFT JOIN + COUNT(DISTINCT ... CASE) แทน COUNT(CASE WHEN EXISTS(...))
    // เพราะ SQL Server ไม่อนุญาตให้ aggregate ครอบ subquery ซ้อนกันแบบนั้น (error 130)
    // กรองช่วงวันที่ด้วย "วันที่ให้คะแนน" (bs.createdAt) ไม่ใช่ ai.updatedAt
    // เพราะ item ที่ให้คะแนนแล้วไม่มีใครแก้ไขต่อจะหลุดจากตัวหารถ้าใช้ updatedAt
    const issueScoreCase = `CASE WHEN bs.score IN (0, -1) THEN ai.itemId END`;

    const result = await this.amItemRepo
      .createQueryBuilder('ai')
      .select('aj.branchId', 'branchId')
      .addSelect('aj.branchName', 'branchName')
      .addSelect(`COUNT(DISTINCT ${issueScoreCase})`, 'issueCount')
      .addSelect('COUNT(DISTINCT ai.itemId)', 'totalCount')
      .innerJoin('ai.job', 'aj')
      .innerJoin('ai.branchAmScores', 'bs', 'bs.active = :bsActive', {
        bsActive: true,
      })
      .where('bs.createdAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('aj.positionType IN (:...positionTypes)', {
        positionTypes: ['AM', 'AA'],
      })
      .groupBy('aj.branchId')
      .addGroupBy('aj.branchName')
      .having(`COUNT(DISTINCT ${issueScoreCase}) > 0`)
      .orderBy('issueCount', 'DESC')
      .limit(5)
      .getRawMany<BranchIssueResult>();

    return result.map((row) => ({
      branchId: row.branchId,
      branchName: row.branchName,
      issueCount: parseInt(row.issueCount, 10),
      totalCount: parseInt(row.totalCount, 10),
      failureRate: Math.round(
        (parseInt(row.issueCount, 10) / parseInt(row.totalCount, 10)) * 100,
      ),
    }));
  }

  private async getAMDocStats(dateRange: number): Promise<AuditStats> {
    const startDate = this.getStartDate(dateRange);

    const result = await this.amItemRepo
      .createQueryBuilder('ai')
      .select([
        'COUNT(CASE WHEN ai.itemStatusEdit = 4 THEN 1 END) AS closedJobs',
        'COUNT(CASE WHEN ai.itemStatusEdit IS NULL OR ai.itemStatusEdit = 2 THEN 1 END) AS pendingCloseCase',
      ])
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('aj.positionType IN (:...positionTypes)', {
        positionTypes: ['AM', 'AA'],
      })
      .getRawOne<AuditStatsResult>();

    const jobResult = await this.amJobRepo
      .createQueryBuilder('aj')
      .select([
        'COUNT(*) AS totalJobs',
        'COUNT(CASE WHEN aj.status IS NULL OR aj.status <> 2 THEN 1 END) AS activeJobs',
      ])
      .where('aj.updatedAt >= :startDate', { startDate })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('aj.positionType IN (:...positionTypes)', {
        positionTypes: ['AM', 'AA'],
      })
      .getRawOne<{ totalJobs: string; activeJobs: string }>();

    const overdueThreshold = new Date();
    overdueThreshold.setDate(overdueThreshold.getDate() - 7);
    const overdueItems = await this.amItemRepo
      .createQueryBuilder('ai')
      .innerJoin('ai.job', 'aj')
      .where('(ai.itemStatusEdit IS NULL OR ai.itemStatusEdit <> 4)')
      .andWhere('ai.updatedAt <= :overdueThreshold', { overdueThreshold })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('aj.positionType IN (:...positionTypes)', {
        positionTypes: ['AM', 'AA'],
      })
      .getCount();

    return {
      totalJobs: parseInt(jobResult?.totalJobs || '0', 10),
      activeJobs: parseInt(jobResult?.activeJobs || '0', 10),
      closedJobs: parseInt(result?.closedJobs || '0', 10),
      pendingCloseCase: parseInt(result?.pendingCloseCase || '0', 10),
      overdueItems,
    };
  }

  private async getAMDocItemsByStatus(
    dateRange: number,
    statusType: 'NOT_CHECKED' | 'PENDING_CLOSE_CASE',
  ): Promise<ItemList> {
    const startDate = this.getStartDate(dateRange);
    let whereClause = '';

    switch (statusType) {
      case 'NOT_CHECKED':
        whereClause =
          '(ai.itemStatusEdit IS NULL OR ai.itemStatusEdit <> 4 OR ai.headerChecklistStatus IS NULL OR ai.headerChecklistStatus = 0)';
        break;
      case 'PENDING_CLOSE_CASE':
        whereClause = '(ai.itemStatusEdit IS NULL OR ai.itemStatusEdit = 2)';
        break;
    }

    const totalCount = await this.amItemRepo
      .createQueryBuilder('ai')
      .innerJoin('ai.job', 'aj')
      .where(whereClause)
      .andWhere('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('aj.positionType IN (:...positionTypes)', {
        positionTypes: ['AM', 'AA'],
      })
      .getCount();

    const items = await this.amItemRepo
      .createQueryBuilder('ai')
      .leftJoinAndSelect('ai.job', 'aj')
      .leftJoinAndSelect('ai.categoryItem', 'cat')
      .where(whereClause)
      .andWhere('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('aj.positionType IN (:...positionTypes)', {
        positionTypes: ['AM', 'AA'],
      })
      .orderBy('ai.updatedAt', 'DESC')
      .take(50)
      .getMany();

    return {
      items: items.map((item) => ({
        id: item.itemId,
        jobNo: item.job?.jobNo || '',
        branchName: item.job?.branchName || '',
        categoryName: item.categoryItem?.categoryName || '',
        categoryCode: item.categoryItem?.categoryCode ?? null,
        status: this.getAuditItemStatusText(
          item.itemStatusEdit,
          item.headerChecklistStatus,
        ),
        daysAgo: this.calculateDaysAgo(item.updatedAt),
        statusColor: this.getAuditItemStatusColor(
          item.itemStatusEdit,
          item.headerChecklistStatus,
        ),
      })),
      totalCount,
    };
  }

  private async getActiveAMJobs(dateRange: number): Promise<ItemList> {
    const startDate = this.getStartDate(dateRange);
    const whereClause = '(aj.status IS NULL OR aj.status <> 2)';

    const totalCount = await this.amJobRepo
      .createQueryBuilder('aj')
      .where(whereClause)
      .andWhere('aj.updatedAt >= :startDate', { startDate })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('aj.positionType IN (:...positionTypes)', {
        positionTypes: ['AM', 'AA'],
      })
      .getCount();

    const jobs = await this.amJobRepo
      .createQueryBuilder('aj')
      .where(whereClause)
      .andWhere('aj.updatedAt >= :startDate', { startDate })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('aj.positionType IN (:...positionTypes)', {
        positionTypes: ['AM', 'AA'],
      })
      .orderBy('aj.updatedAt', 'DESC')
      .take(50)
      .getMany();

    return {
      items: jobs.map((job) => ({
        id: job.jobId,
        jobNo: job.jobNo || '',
        branchName: job.branchName || '',
        categoryName: null,
        categoryCode: null,
        status:
          job.status === 2 ? 'ดำเนินการเสร็จสิ้น' : 'อยู่ระหว่างดำเนินการ',
        daysAgo: this.calculateDaysAgo(job.updatedAt),
        statusColor: job.status === 2 ? 'default' : 'secondary',
      })),
      totalCount,
    };
  }

  private async getOverdueAMItems(): Promise<ItemList> {
    const overdueThreshold = new Date();
    overdueThreshold.setDate(overdueThreshold.getDate() - 7);
    const whereClause = '(ai.itemStatusEdit IS NULL OR ai.itemStatusEdit <> 4)';

    const totalCount = await this.amItemRepo
      .createQueryBuilder('ai')
      .innerJoin('ai.job', 'aj')
      .where(whereClause)
      .andWhere('ai.updatedAt <= :overdueThreshold', { overdueThreshold })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('aj.positionType IN (:...positionTypes)', {
        positionTypes: ['AM', 'AA'],
      })
      .getCount();

    const items = await this.amItemRepo
      .createQueryBuilder('ai')
      .leftJoinAndSelect('ai.job', 'aj')
      .leftJoinAndSelect('ai.categoryItem', 'cat')
      .where(whereClause)
      .andWhere('ai.updatedAt <= :overdueThreshold', { overdueThreshold })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('aj.positionType IN (:...positionTypes)', {
        positionTypes: ['AM', 'AA'],
      })
      .orderBy('ai.updatedAt', 'ASC')
      .take(50)
      .getMany();

    return {
      items: items.map((item) => ({
        id: item.itemId,
        jobNo: item.job?.jobNo || '',
        branchName: item.job?.branchName || '',
        categoryName: item.categoryItem?.categoryName || '',
        categoryCode: item.categoryItem?.categoryCode ?? null,
        status: this.getAuditItemStatusText(
          item.itemStatusEdit,
          item.headerChecklistStatus,
        ),
        daysAgo: this.calculateDaysAgo(item.updatedAt),
        statusColor: this.getAuditItemStatusColor(
          item.itemStatusEdit,
          item.headerChecklistStatus,
        ),
      })),
      totalCount,
    };
  }

  // ==========================================
  // Audit Stats & Items
  // ==========================================

  private async getAuditStats(dateRange: number): Promise<AuditStats> {
    const startDate = this.getStartDate(dateRange);

    const result = await this.auditItemRepo
      .createQueryBuilder('ai')
      .select([
        'COUNT(CASE WHEN ai.itemStatusEdit = 4 THEN 1 END) AS closedJobs',
        'COUNT(CASE WHEN ai.itemStatusEdit IS NULL OR ai.itemStatusEdit = 2 THEN 1 END) AS pendingCloseCase',
      ])
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .getRawOne<AuditStatsResult>();

    // totalJobs / activeJobs ต้องมาจาก query เดียวกัน (ตาราง + date field เดียวกัน)
    // ไม่งั้น activeJobs อาจมากกว่า totalJobs ได้เพราะคนละ field วันที่กัน
    const jobResult = await this.auditJobRepo
      .createQueryBuilder('aj')
      .select([
        'COUNT(*) AS totalJobs',
        'COUNT(CASE WHEN aj.status IS NULL OR aj.status <> 2 THEN 1 END) AS activeJobs',
      ])
      .where('aj.updatedAt >= :startDate', { startDate })
      .andWhere('aj.active = :active', { active: true })
      .getRawOne<{ totalJobs: string; activeJobs: string }>();

    // ค้างเกิน 7 วัน = ยังไม่ปิดเคส (itemStatusEdit ไม่ใช่ 4) และไม่มีความเคลื่อนไหวมาแล้ว 7 วัน
    // ใช้ threshold ตายตัว ไม่ผูกกับตัวกรอง "แสดงข้อมูลย้อนหลัง" ของหน้า dashboard
    const overdueThreshold = new Date();
    overdueThreshold.setDate(overdueThreshold.getDate() - 7);
    const overdueItems = await this.auditItemRepo
      .createQueryBuilder('ai')
      .innerJoin('ai.job', 'aj')
      .where('(ai.itemStatusEdit IS NULL OR ai.itemStatusEdit <> 4)')
      .andWhere('ai.updatedAt <= :overdueThreshold', { overdueThreshold })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .getCount();

    return {
      totalJobs: parseInt(jobResult?.totalJobs || '0', 10),
      activeJobs: parseInt(jobResult?.activeJobs || '0', 10),
      closedJobs: parseInt(result?.closedJobs || '0', 10),
      pendingCloseCase: parseInt(result?.pendingCloseCase || '0', 10),
      overdueItems,
    };
  }

  private async getOverdueAuditItems(): Promise<ItemList> {
    const overdueThreshold = new Date();
    overdueThreshold.setDate(overdueThreshold.getDate() - 7);
    const whereClause = '(ai.itemStatusEdit IS NULL OR ai.itemStatusEdit <> 4)';

    const totalCount = await this.auditItemRepo
      .createQueryBuilder('ai')
      .innerJoin('ai.job', 'aj')
      .where(whereClause)
      .andWhere('ai.updatedAt <= :overdueThreshold', { overdueThreshold })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .getCount();

    const items = await this.auditItemRepo
      .createQueryBuilder('ai')
      .leftJoinAndSelect('ai.job', 'aj')
      .leftJoinAndSelect('ai.categoryItem', 'cat')
      .where(whereClause)
      .andWhere('ai.updatedAt <= :overdueThreshold', { overdueThreshold })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .orderBy('ai.updatedAt', 'ASC')
      .take(50)
      .getMany();

    return {
      items: items.map((item) => ({
        id: item.itemId,
        jobNo: item.job?.jobNo || '',
        branchName: item.job?.branchName || '',
        categoryName: item.categoryItem?.categoryName || '',
        categoryCode: item.categoryItem?.categoryCode ?? null,
        status: this.getAuditItemStatusText(
          item.itemStatusEdit,
          item.amChecklistStatus,
        ),
        daysAgo: this.calculateDaysAgo(item.updatedAt),
        statusColor: this.getAuditItemStatusColor(
          item.itemStatusEdit,
          item.amChecklistStatus,
        ),
      })),
      totalCount,
    };
  }

  private async getAuditItemsByStatus(
    dateRange: number,
    statusType: 'NOT_CHECKED' | 'PENDING_CLOSE_CASE',
  ): Promise<ItemList> {
    const startDate = this.getStartDate(dateRange);
    let whereClause = '';

    switch (statusType) {
      case 'NOT_CHECKED':
        // รวม: ยังไม่ปิดเคส, ยังไม่ได้ใส่สถานะ, หรือยังไม่ได้ตรวจ Checker
        whereClause =
          '(ai.itemStatusEdit IS NULL OR ai.itemStatusEdit <> 4 OR ai.amChecklistStatus IS NULL OR ai.amChecklistStatus = 0)';
        break;
      case 'PENDING_CLOSE_CASE':
        whereClause = '(ai.itemStatusEdit IS NULL OR ai.itemStatusEdit = 2)';
        break;
    }

    const totalCount = await this.auditItemRepo
      .createQueryBuilder('ai')
      .innerJoin('ai.job', 'aj')
      .where(whereClause)
      .andWhere('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .getCount();

    const items = await this.auditItemRepo
      .createQueryBuilder('ai')
      .leftJoinAndSelect('ai.job', 'aj')
      .leftJoinAndSelect('ai.categoryItem', 'cat')
      .where(whereClause)
      .andWhere('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .orderBy('ai.updatedAt', 'DESC')
      .take(50)
      .getMany();

    return {
      items: items.map((item) => ({
        id: item.itemId,
        jobNo: item.job?.jobNo || '',
        branchName: item.job?.branchName || '',
        categoryName: item.categoryItem?.categoryName || '',
        categoryCode: item.categoryItem?.categoryCode ?? null,
        status: this.getAuditItemStatusText(
          item.itemStatusEdit,
          item.amChecklistStatus,
        ),
        daysAgo: this.calculateDaysAgo(item.updatedAt),
        statusColor: this.getAuditItemStatusColor(
          item.itemStatusEdit,
          item.amChecklistStatus,
        ),
      })),
      totalCount,
    };
  }

  private async getActiveAuditJobs(dateRange: number): Promise<ItemList> {
    const startDate = this.getStartDate(dateRange);
    const whereClause = '(aj.status IS NULL OR aj.status <> 2)';

    const totalCount = await this.auditJobRepo
      .createQueryBuilder('aj')
      .where(whereClause)
      .andWhere('aj.updatedAt >= :startDate', { startDate })
      .andWhere('aj.active = :active', { active: true })
      .getCount();

    const jobs = await this.auditJobRepo
      .createQueryBuilder('aj')
      .where(whereClause)
      .andWhere('aj.updatedAt >= :startDate', { startDate })
      .andWhere('aj.active = :active', { active: true })
      .orderBy('aj.updatedAt', 'DESC')
      .take(50)
      .getMany();

    return {
      items: jobs.map((job) => ({
        id: job.jobId,
        jobNo: job.jobNo || '',
        branchName: job.branchName || '',
        categoryName: null,
        categoryCode: null,
        status:
          job.status === 2 ? 'ดำเนินการเสร็จสิ้น' : 'อยู่ระหว่างดำเนินการ',
        daysAgo: this.calculateDaysAgo(job.updatedAt),
        statusColor: job.status === 2 ? 'default' : 'secondary',
      })),
      totalCount,
    };
  }

  // ==========================================
  // User Stats & Items
  // ==========================================

  /**
   *  User Stats
   */
  private async getUserStats(
    userId: string,
    dateRange: number,
  ): Promise<UserStats> {
    const startDate = this.getStartDate(dateRange);

    // userId จริงๆ คือ userCode (string) ที่มาจาก req.user
    const userData = await this.getUserDataByCode(userId);
    // console.log(userData, 'userData');
    const userIdNum = userData?.userId ?? 0;
    const userCode = userData?.userCode || '';

    // 1. Tag ใน Item (จาก AuditItems_OtherComment_Users_Tag)
    const taggedCount = await this.auditItemRepo
      .createQueryBuilder('ai')
      .innerJoin('ai.taggedUsers', 't')
      .innerJoin('ai.job', 'aj')
      .where('t.userId = :userId', { userId: userIdNum })
      .andWhere('t.active = :active', { active: true })
      .andWhere('t.createdAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .getCount();

    // 2. Comment ทั้งหมดของฉัน
    const myCommentsCount = await this.otherCommentRepo
      .createQueryBuilder('c')
      .innerJoin('c.item', 'ai')
      .where('c.createdBy = :userId', { userId: userIdNum })
      .andWhere('c.createdAt >= :startDate', { startDate })
      .andWhere('c.active = :active', { active: true })
      .andWhere('ai.active = :active', { active: true })
      .getCount();

    // 3. Mention ฉัน (@ ในข้อความ Comment) เช็ก 3 ตาราง
    const mentionCount = await this.auditItemRepo
      .createQueryBuilder('ai')
      .innerJoin('ai.job', 'aj')
      .where(
        `(
          EXISTS (
            SELECT 1 FROM AuditItems_OtherComment c
            WHERE c.item_id = ai.item_id
              AND c.note LIKE :mention
              AND c.created_by != :userId
              AND c.created_at >= :startDate
              AND c.active = 1
          )
          OR EXISTS (
            SELECT 1 FROM AuditItem_AMComment c
            WHERE c.item_id = ai.item_id
              AND c.note LIKE :mention
              AND c.created_by != :userId
              AND c.created_at >= :startDate
              AND c.active = 1
          )
          OR EXISTS (
            SELECT 1 FROM AuditItem_AuditComment c
            WHERE c.item_id = ai.item_id
              AND c.note LIKE :mention
              AND c.created_by != :userId
              AND c.created_at >= :startDate
              AND c.active = 1
          )
        )`,
        { mention: `%@${userCode}%`, userId: userIdNum, startDate },
      )
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .getCount();

    return {
      taggedMe: taggedCount,
      myComments: myCommentsCount,
      hasReplies: mentionCount, // เปลี่ยนชื่อใน interface เป็น mentions แทน
    };
  }

  /**
   *  Get User Items by Type
   */
  private async getUserItemsByType(
    userId: string,
    dateRange: number,
    type: 'TAGGED' | 'MY_COMMENTS' | 'MENTIONS',
  ): Promise<ItemList> {
    const startDate = this.getStartDate(dateRange);

    // userId จริงๆ คือ userCode (string) ที่มาจาก req.user
    const userData = await this.getUserDataByCode(userId);
    const userIdNum = userData?.userId ?? 0;
    const userCode = userData?.userCode || '';

    let totalCount = 0;
    let items: AuditItem[] = [];

    switch (type) {
      case 'TAGGED': {
        // 1. Tag ใน Item (จาก AuditItems_OtherComment_Users_Tag)
        totalCount = await this.auditItemRepo
          .createQueryBuilder('ai')
          .innerJoin('ai.taggedUsers', 't')
          .innerJoin('ai.job', 'aj')
          .where('t.userId = :userId', { userId: userIdNum })
          .andWhere('t.active = :active', { active: true })
          .andWhere('t.createdAt >= :startDate', { startDate })
          .andWhere('ai.active = :active', { active: true })
          .andWhere('aj.active = :active', { active: true })
          .getCount();

        items = await this.auditItemRepo
          .createQueryBuilder('ai')
          .leftJoinAndSelect('ai.job', 'aj')
          .leftJoinAndSelect('ai.categoryItem', 'cat')
          .innerJoin('ai.taggedUsers', 't')
          .where('t.userId = :userId', { userId: userIdNum })
          .andWhere('t.active = :active', { active: true })
          .andWhere('t.createdAt >= :startDate', { startDate })
          .andWhere('ai.active = :active', { active: true })
          .andWhere('aj.active = :active', { active: true })
          .orderBy('ai.updatedAt', 'DESC')
          .take(50)
          .getMany();
        break;
      }

      case 'MY_COMMENTS': {
        // 2. Items ที่ฉัน Comment
        totalCount = await this.auditItemRepo
          .createQueryBuilder('ai')
          .innerJoin('ai.job', 'aj')
          .where(
            `EXISTS (
            SELECT 1 FROM AuditItems_OtherComment c
            WHERE c.item_id = ai.item_id
              AND c.created_by = :userId
              AND c.created_at >= :startDate
              AND c.active = 1
          )`,
            { userId: userIdNum, startDate },
          )
          .andWhere('ai.active = :active', { active: true })
          .andWhere('aj.active = :active', { active: true })
          .getCount();

        items = await this.auditItemRepo
          .createQueryBuilder('ai')
          .leftJoinAndSelect('ai.job', 'aj')
          .leftJoinAndSelect('ai.categoryItem', 'cat')
          .where(
            `EXISTS (
            SELECT 1 FROM AuditItems_OtherComment c
            WHERE c.item_id = ai.item_id
              AND c.created_by = :userId
              AND c.created_at >= :startDate
              AND c.active = 1
          )`,
            { userId: userIdNum, startDate },
          )
          .andWhere('ai.active = :active', { active: true })
          .andWhere('aj.active = :active', { active: true })
          .orderBy('ai.updatedAt', 'DESC')
          .take(50)
          .getMany();
        break;
      }

      case 'MENTIONS': {
        // 3. Items ที่มีคน Mention (@) ฉันใน Comment (เช็ก 3 ตาราง)
        const mentionWhere = `(
          EXISTS (
            SELECT 1 FROM AuditItems_OtherComment c
            WHERE c.item_id = ai.item_id
              AND c.note LIKE :mention
              AND c.created_by != :userId
              AND c.created_at >= :startDate
              AND c.active = 1
          )
          OR EXISTS (
            SELECT 1 FROM AuditItem_AMComment c
            WHERE c.item_id = ai.item_id
              AND c.note LIKE :mention
              AND c.created_by != :userId
              AND c.created_at >= :startDate
              AND c.active = 1
          )
          OR EXISTS (
            SELECT 1 FROM AuditItem_AuditComment c
            WHERE c.item_id = ai.item_id
              AND c.note LIKE :mention
              AND c.created_by != :userId
              AND c.created_at >= :startDate
              AND c.active = 1
          )
        )`;
        const mentionParams = {
          mention: `%@${userCode}%`,
          userId: userIdNum,
          startDate,
        };

        totalCount = await this.auditItemRepo
          .createQueryBuilder('ai')
          .innerJoin('ai.job', 'aj')
          .where(mentionWhere, mentionParams)
          .andWhere('ai.active = :active', { active: true })
          .andWhere('aj.active = :active', { active: true })
          .getCount();

        items = await this.auditItemRepo
          .createQueryBuilder('ai')
          .leftJoinAndSelect('ai.job', 'aj')
          .leftJoinAndSelect('ai.categoryItem', 'cat')
          .where(mentionWhere, mentionParams)
          .andWhere('ai.active = :active', { active: true })
          .andWhere('aj.active = :active', { active: true })
          .orderBy('ai.updatedAt', 'DESC')
          .take(50)
          .getMany();
        break;
      }
    }

    return {
      items: items.map((item) => ({
        id: item.itemId,
        jobNo: item.job?.jobNo || '',
        branchName: item.job?.branchName || '',
        categoryName: item.categoryItem?.categoryName || '',
        categoryCode: item.categoryItem?.categoryCode ?? null,
        status: this.getUserItemStatusText(
          item.itemStatus,
          item.itemStatusEdit,
          item.amChecklistStatus,
        ),
        daysAgo: this.calculateDaysAgo(item.updatedAt),
        statusColor: this.getUserItemStatusColor(item.amChecklistStatus),
      })),
      totalCount,
    };
  }

  // ==========================================
  // Manager Stats
  // ==========================================

  private async getManagerStats(dateRange: number): Promise<ManagerStats> {
    const startDate = this.getStartDate(dateRange);

    // 1. นับสาขาทั้งหมด
    const totalBranchesResult = await this.auditJobRepo
      .createQueryBuilder('aj')
      .select('COUNT(DISTINCT aj.branchId)', 'count')
      .where('aj.active = :active', { active: true })
      .getRawOne<CountResult>();

    const totalBranches = parseInt(totalBranchesResult?.count || '0', 10);

    // 2. นับสาขาที่มีปัญหา (มี Items ที่ Failed หรือ Need Fix)
    const branchesWithIssuesResult = await this.auditItemRepo
      .createQueryBuilder('ai')
      .select('COUNT(DISTINCT aj.branchId)', 'count')
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('ai.amChecklistStatus IN (:...statuses)', { statuses: [3, 4] }) // Failed, Need Fix
      .getRawOne<CountResult>();

    const branchesWithIssues = parseInt(
      branchesWithIssuesResult?.count || '0',
      10,
    );

    // 3. สาขาปกติ = สาขาทั้งหมด - สาขาที่มีปัญหา
    const normalBranches = totalBranches - branchesWithIssues;

    // 4. คำนวณคะแนนเฉลี่ย (% ของ Items ที่ผ่าน)
    const scoreResult = await this.auditItemRepo
      .createQueryBuilder('ai')
      .select([
        'COUNT(CASE WHEN ai.amChecklistStatus = 2 THEN 1 END) as passed',
        'COUNT(*) as total',
      ])
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('ai.amChecklistStatus IS NOT NULL')
      .getRawOne<{ passed: string; total: string }>();

    const passed = parseInt(scoreResult?.passed || '0', 10);
    const total = parseInt(scoreResult?.total || '0', 10);
    const averageScore = total > 0 ? Math.round((passed / total) * 100) : 0;

    return {
      totalBranches,
      branchesWithIssues,
      normalBranches,
      averageScore,
    };
  }

  private async getBranchesWithIssues(dateRange: number): Promise<ItemList> {
    const startDate = this.getStartDate(dateRange);

    // Query: สาขาที่มี Items Failed หรือ Need Fix
    const branchesQuery = await this.auditItemRepo
      .createQueryBuilder('ai')
      .select('aj.branchId', 'branchId')
      .addSelect('aj.branchName', 'branchName')
      .addSelect('COUNT(*)', 'issueCount')
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('ai.amChecklistStatus IN (:...statuses)', { statuses: [3, 4] }) // Failed, Need Fix
      .groupBy('aj.branchId')
      .addGroupBy('aj.branchName')
      .orderBy('issueCount', 'DESC')
      .getRawMany<{
        branchId: number;
        branchName: string;
        issueCount: string;
      }>();

    const totalCount = branchesQuery.length;

    const items: ActionItem[] = branchesQuery.slice(0, 50).map((branch) => ({
      id: branch.branchId,
      jobNo: `${branch.issueCount} รายการ`,
      branchName: branch.branchName,
      categoryName: 'มีรายการที่ต้องแก้ไข',
      categoryCode: null,
      status: `${branch.issueCount} ปัญหา`,
      daysAgo: 0,
      statusColor: 'destructive' as const,
    }));

    return { items, totalCount };
  }

  private async getNormalBranches(dateRange: number): Promise<ItemList> {
    const startDate = this.getStartDate(dateRange);

    // 1. ดึงสาขาที่มีปัญหา
    const branchesWithIssuesQuery = await this.auditItemRepo
      .createQueryBuilder('ai')
      .select('aj.branchId', 'branchId')
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('ai.amChecklistStatus IN (:...statuses)', { statuses: [3, 4] })
      .groupBy('aj.branchId')
      .getRawMany<{ branchId: number }>();

    const problematicBranchIds = branchesWithIssuesQuery.map((b) => b.branchId);

    // 2. ดึงสาขาทั้งหมดที่ไม่มีปัญหา พร้อม jobNo ล่าสุด
    const queryBuilder = this.auditJobRepo
      .createQueryBuilder('aj')
      .select('aj.branchId', 'branchId')
      .addSelect('aj.branchName', 'branchName')
      .addSelect('MAX(aj.jobId)', 'latestJobId')
      .where('aj.active = :active', { active: true })
      .groupBy('aj.branchId')
      .addGroupBy('aj.branchName');

    // ถ้ามีสาขาที่มีปัญหา ให้ exclude ออก
    if (problematicBranchIds.length > 0) {
      queryBuilder.andWhere('aj.branchId NOT IN (:...excludeIds)', {
        excludeIds: problematicBranchIds,
      });
    }

    const normalBranchesQuery = await queryBuilder
      .orderBy('aj.branchName', 'ASC')
      .getRawMany<{
        branchId: number;
        branchName: string;
        latestJobId: number;
      }>();

    const totalCount = normalBranchesQuery.length;

    // ดึง jobNo ของ job ล่าสุดแต่ละสาขา
    const latestJobIds = normalBranchesQuery
      .map((b) => b.latestJobId)
      .filter(Boolean);
    const latestJobs =
      latestJobIds.length > 0
        ? await this.auditJobRepo
            .createQueryBuilder('aj')
            .select('aj.jobId', 'jobId')
            .addSelect('aj.jobNo', 'jobNo')
            .where('aj.jobId IN (:...ids)', { ids: latestJobIds })
            .getRawMany<{ jobId: number; jobNo: string }>()
        : [];

    const jobNoMap = new Map(latestJobs.map((j) => [j.jobId, j.jobNo]));

    // แปลงเป็น ActionItem format
    const items: ActionItem[] = normalBranchesQuery
      .slice(0, 50)
      .map((branch) => ({
        id: branch.branchId,
        jobNo: jobNoMap.get(branch.latestJobId) || '-',
        branchName: branch.branchName,
        categoryName: 'ไม่มีปัญหา',
        categoryCode: null,
        status: 'ปกติ',
        daysAgo: 0,
        statusColor: 'secondary' as const,
      }));

    return { items, totalCount };
  }

  private async getManagerBranchRankings(
    dateRange: number,
  ): Promise<BranchRanking[]> {
    const startDate = this.getStartDate(dateRange);

    const result = await this.auditItemRepo
      .createQueryBuilder('ai')
      .select([
        'aj.branchId as branchId',
        'aj.branchName as branchName',
        'COUNT(*) as totalCount',
        'COUNT(CASE WHEN ai.amChecklistStatus = 2 THEN 1 END) as passedCount',
        'COUNT(CASE WHEN ai.amChecklistStatus IN (3, 4) THEN 1 END) as issueCount',
      ])
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('ai.amChecklistStatus IS NOT NULL')
      .groupBy('aj.branchId')
      .addGroupBy('aj.branchName')
      .orderBy('passedCount', 'DESC')
      .addOrderBy('totalCount', 'DESC')
      .limit(10)
      .getRawMany<{
        branchId: number;
        branchName: string;
        totalCount: string;
        passedCount: string;
        issueCount: string;
      }>();

    return result.map((row, index) => {
      const total = parseInt(row.totalCount, 10);
      const passed = parseInt(row.passedCount, 10);
      const score = total > 0 ? Math.round((passed / total) * 100) : 0;

      return {
        branchId: row.branchId,
        branchName: row.branchName,
        score,
        issueCount: parseInt(row.issueCount, 10),
        rank: index + 1,
      };
    });
  }

  // ==========================================
  // Recent Activities
  // ==========================================

  private async getRecentActivities(dateRange: number): Promise<Activity[]> {
    const startDate = this.getStartDate(dateRange);
    const activities: Activity[] = [];

    const [
      auditComments,
      amComments,
      otherComments,
      tagEvents,
      checklistUpdates,
    ] = await Promise.all([
      this.auditCommentRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.item', 'ai')
        .leftJoinAndSelect('ai.job', 'aj')
        .where('c.createdAt >= :startDate', { startDate })
        .andWhere('c.active = :active', { active: true })
        .orderBy('c.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.amCommentRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.item', 'ai')
        .leftJoinAndSelect('ai.job', 'aj')
        .where('c.createdAt >= :startDate', { startDate })
        .andWhere('c.active = :active', { active: true })
        .orderBy('c.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.otherCommentRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.item', 'ai')
        .leftJoinAndSelect('ai.job', 'aj')
        .where('c.createdAt >= :startDate', { startDate })
        .andWhere('c.active = :active', { active: true })
        .orderBy('c.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.tagRepo
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.item', 'ai')
        .leftJoinAndSelect('ai.job', 'aj')
        .where('t.createdAt >= :startDate', { startDate })
        .andWhere('t.active = :active', { active: true })
        .orderBy('t.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.auditItemRepo
        .createQueryBuilder('ai')
        .leftJoinAndSelect('ai.job', 'aj')
        .where('ai.amChecklistAt >= :startDate', { startDate })
        .andWhere('ai.active = :active', { active: true })
        .orderBy('ai.amChecklistAt', 'DESC')
        .take(5)
        .getMany(),
    ]);

    const uniqueUserIds = [
      ...new Set(
        [
          ...auditComments.map((c) => c.userId),
          ...amComments.map((c) => c.userId),
          ...otherComments.map((c) => c.userId),
          ...tagEvents.map((t) => t.createdBy),
          ...checklistUpdates.map((i) => i.amChecklistBy),
        ].filter((id): id is number => id !== null && id !== undefined),
      ),
    ];

    const userDataList = await Promise.all(
      uniqueUserIds.map((id) => this.getUserData(id)),
    );
    const userMap = new Map(
      uniqueUserIds.map((id, idx) => [id, userDataList[idx]]),
    );

    auditComments.forEach((comment) => {
      const userData = comment.userId ? userMap.get(comment.userId) : null;
      activities.push({
        id: `audit-${comment.auditDetailId}`,
        user: userData?.userCode || 'Unknown',
        userCode: userData?.userCode || '',
        action: 'Comment ใน Audit Unit',
        jobNo: comment.item?.job?.jobNo || '',
        timestamp: new Date(comment.createdAt),
        type: 'comment',
      });
    });

    amComments.forEach((comment) => {
      const userData = comment.userId ? userMap.get(comment.userId) : null;
      activities.push({
        id: `am-${comment.amDetailId}`,
        user: userData?.userCode || 'Unknown',
        userCode: userData?.userCode || '',
        action: 'Comment ใน AM Unit',
        jobNo: comment.item?.job?.jobNo || '',
        timestamp: new Date(comment.createdAt),
        type: 'comment',
      });
    });

    otherComments.forEach((comment) => {
      const userData = comment.userId ? userMap.get(comment.userId) : null;
      activities.push({
        id: `other-${comment.otherDetailId}`,
        user: userData?.userCode || 'Unknown',
        userCode: userData?.userCode || '',
        action: 'Comment ใน หน่วยงานที่เกี่ยวข้อง',
        jobNo: comment.item?.job?.jobNo || '',
        timestamp: new Date(comment.createdAt),
        type: 'comment',
      });
    });

    tagEvents.forEach((tag) => {
      const userData = tag.createdBy ? userMap.get(tag.createdBy) : null;
      activities.push({
        id: `tag-${tag.taggedUserId}`,
        user: userData?.userCode || 'Unknown',
        userCode: userData?.userCode || '',
        action: 'แท็กผู้ใช้ในรายการ',
        jobNo: tag.item?.job?.jobNo || '',
        timestamp: new Date(tag.createdAt),
        type: 'create',
      });
    });

    checklistUpdates.forEach((item) => {
      if (!item.amChecklistAt) return;
      const userData = item.amChecklistBy
        ? userMap.get(item.amChecklistBy)
        : null;
      const verdict =
        item.amChecklistStatus === 2
          ? 'ตรวจผ่าน'
          : item.amChecklistStatus === 3
            ? 'ตรวจไม่ผ่าน'
            : item.amChecklistStatus === 4
              ? 'ให้แก้ไข'
              : 'ตรวจสอบ';
      activities.push({
        id: `checklist-${item.itemId}`,
        user: userData?.userCode || 'Unknown',
        userCode: userData?.userCode || '',
        action: `Checker ${verdict}ใน`,
        jobNo: item.job?.jobNo || '',
        timestamp: new Date(item.amChecklistAt),
        type: 'approve',
      });
    });

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  private async getAMRecentActivities(dateRange: number): Promise<Activity[]> {
    const startDate = this.getStartDate(dateRange);
    const activities: Activity[] = [];

    const [
      checkerComments,
      amComments,
      otherComments,
      tagEvents,
      checklistUpdates,
    ] = await Promise.all([
      this.amCheckerCommentRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.item', 'ai')
        .leftJoinAndSelect('ai.job', 'aj')
        .where('c.createdAt >= :startDate', { startDate })
        .andWhere('c.active = :active', { active: true })
        .orderBy('c.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.amAmCommentRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.item', 'ai')
        .leftJoinAndSelect('ai.job', 'aj')
        .where('c.createdAt >= :startDate', { startDate })
        .andWhere('c.active = :active', { active: true })
        .orderBy('c.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.amOtherCommentRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.item', 'ai')
        .leftJoinAndSelect('ai.job', 'aj')
        .where('c.createdAt >= :startDate', { startDate })
        .andWhere('c.active = :active', { active: true })
        .orderBy('c.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.amTagRepo
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.item', 'ai')
        .leftJoinAndSelect('ai.job', 'aj')
        .where('t.createdAt >= :startDate', { startDate })
        .andWhere('t.active = :active', { active: true })
        .orderBy('t.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.amItemRepo
        .createQueryBuilder('ai')
        .leftJoinAndSelect('ai.job', 'aj')
        .where('ai.headerChecklistAt >= :startDate', { startDate })
        .andWhere('ai.active = :active', { active: true })
        .orderBy('ai.headerChecklistAt', 'DESC')
        .take(5)
        .getMany(),
    ]);

    const uniqueUserIds = [
      ...new Set(
        [
          ...checkerComments.map((c) => c.userId),
          ...amComments.map((c) => c.userId),
          ...otherComments.map((c) => c.userId),
          ...tagEvents.map((t) => t.createdBy),
          ...checklistUpdates.map((i) => i.headerChecklistBy),
        ].filter((id): id is number => id !== null && id !== undefined),
      ),
    ];

    const userDataList = await Promise.all(
      uniqueUserIds.map((id) => this.getUserData(id)),
    );
    const userMap = new Map(
      uniqueUserIds.map((id, idx) => [id, userDataList[idx]]),
    );

    checkerComments.forEach((comment) => {
      const userData = comment.userId ? userMap.get(comment.userId) : null;
      activities.push({
        id: `am-checker-${comment.amCheckerDetailId}`,
        user: userData?.userCode || 'Unknown',
        userCode: userData?.userCode || '',
        action: 'Comment ใน Checker Unit',
        jobNo: comment.item?.job?.jobNo || '',
        timestamp: new Date(comment.createdAt),
        type: 'comment',
      });
    });

    amComments.forEach((comment) => {
      const userData = comment.userId ? userMap.get(comment.userId) : null;
      activities.push({
        id: `am-${comment.amDetailId}`,
        user: userData?.userCode || 'Unknown',
        userCode: userData?.userCode || '',
        action: 'Comment ใน AM Unit',
        jobNo: comment.item?.job?.jobNo || '',
        timestamp: new Date(comment.createdAt),
        type: 'comment',
      });
    });

    otherComments.forEach((comment) => {
      const userData = comment.userId ? userMap.get(comment.userId) : null;
      activities.push({
        id: `am-other-${comment.otherDetailId}`,
        user: userData?.userCode || 'Unknown',
        userCode: userData?.userCode || '',
        action: 'Comment ใน หน่วยงานที่เกี่ยวข้อง',
        jobNo: comment.item?.job?.jobNo || '',
        timestamp: new Date(comment.createdAt),
        type: 'comment',
      });
    });

    tagEvents.forEach((tag) => {
      const userData = tag.createdBy ? userMap.get(tag.createdBy) : null;
      activities.push({
        id: `am-tag-${tag.taggedUserId}`,
        user: userData?.userCode || 'Unknown',
        userCode: userData?.userCode || '',
        action: 'แท็กผู้ใช้ในรายการ',
        jobNo: tag.item?.job?.jobNo || '',
        timestamp: new Date(tag.createdAt),
        type: 'create',
      });
    });

    checklistUpdates.forEach((item) => {
      if (!item.headerChecklistAt) return;
      const userData = item.headerChecklistBy
        ? userMap.get(item.headerChecklistBy)
        : null;
      const verdict =
        item.headerChecklistStatus === 2
          ? 'ตรวจผ่าน'
          : item.headerChecklistStatus === 3
            ? 'ตรวจไม่ผ่าน'
            : item.headerChecklistStatus === 4
              ? 'ให้แก้ไข'
              : 'ตรวจสอบ';
      activities.push({
        id: `am-checklist-${item.itemId}`,
        user: userData?.userCode || 'Unknown',
        userCode: userData?.userCode || '',
        action: `Checker ${verdict}ใน`,
        jobNo: item.job?.jobNo || '',
        timestamp: new Date(item.headerChecklistAt),
        type: 'approve',
      });
    });

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  async getUserChartData(
    userId: string,
    dateRange: number,
  ): Promise<UserChartData[]> {
    const startDate = this.getStartDate(dateRange);

    // userId จริงๆ คือ userCode (string) ที่มาจาก req.user
    const userData = await this.getUserDataByCode(userId);
    const userIdNum = userData?.userId ?? 0;
    const userCode = userData?.userCode || '';

    // 1. Query Tag ใน Item
    const tagData = await this.auditItemRepo
      .createQueryBuilder('ai')
      .select([
        "FORMAT(t.createdAt, 'yyyy-MM-dd') as date",
        'COUNT(*) as count',
      ])
      .innerJoin('ai.taggedUsers', 't')
      .where('t.userId = :userId', { userId: userIdNum })
      .andWhere('t.createdAt >= :startDate', { startDate })
      .andWhere('t.active = :active', { active: true })
      .andWhere('ai.active = :active', { active: true })
      .groupBy("FORMAT(t.createdAt, 'yyyy-MM-dd')")
      .getRawMany<{ date: string; count: string }>();

    // 2. Query Comment ของฉัน
    const commentData = await this.otherCommentRepo
      .createQueryBuilder('c')
      .select([
        "FORMAT(c.createdAt, 'yyyy-MM-dd') as date",
        'COUNT(*) as count',
      ])
      .innerJoin('c.item', 'ai')
      .where('c.createdBy = :userId', { userId: userIdNum })
      .andWhere('c.createdAt >= :startDate', { startDate })
      .andWhere('c.active = :active', { active: true })
      .andWhere('ai.active = :active', { active: true })
      .groupBy("FORMAT(c.createdAt, 'yyyy-MM-dd')")
      .getRawMany<{ date: string; count: string }>();

    // 3. Query Mention ฉัน (เช็ก 3 ตาราง)
    const mentionOtherData = await this.otherCommentRepo
      .createQueryBuilder('c')
      .select([
        "FORMAT(c.createdAt, 'yyyy-MM-dd') as date",
        'COUNT(*) as count',
      ])
      .innerJoin('c.item', 'ai')
      .where('c.note LIKE :mention', { mention: `%@${userCode}%` })
      .andWhere('c.createdBy != :userId', { userId: userIdNum })
      .andWhere('c.createdAt >= :startDate', { startDate })
      .andWhere('c.active = :active', { active: true })
      .andWhere('ai.active = :active', { active: true })
      .groupBy("FORMAT(c.createdAt, 'yyyy-MM-dd')")
      .getRawMany<{ date: string; count: string }>();

    const mentionAMData = await this.amCommentRepo
      .createQueryBuilder('c')
      .select([
        "FORMAT(c.createdAt, 'yyyy-MM-dd') as date",
        'COUNT(*) as count',
      ])
      .innerJoin('c.item', 'ai')
      .where('c.note LIKE :mention', { mention: `%@${userCode}%` })
      .andWhere('c.createdBy != :userId', { userId: userIdNum })
      .andWhere('c.createdAt >= :startDate', { startDate })
      .andWhere('c.active = :active', { active: true })
      .andWhere('ai.active = :active', { active: true })
      .groupBy("FORMAT(c.createdAt, 'yyyy-MM-dd')")
      .getRawMany<{ date: string; count: string }>();

    const mentionAuditData = await this.auditCommentRepo
      .createQueryBuilder('c')
      .select([
        "FORMAT(c.createdAt, 'yyyy-MM-dd') as date",
        'COUNT(*) as count',
      ])
      .innerJoin('c.item', 'ai')
      .where('c.note LIKE :mention', { mention: `%@${userCode}%` })
      .andWhere('c.createdBy != :userId', { userId: userIdNum })
      .andWhere('c.createdAt >= :startDate', { startDate })
      .andWhere('c.active = :active', { active: true })
      .andWhere('ai.active = :active', { active: true })
      .groupBy("FORMAT(c.createdAt, 'yyyy-MM-dd')")
      .getRawMany<{ date: string; count: string }>();

    // 4. รวมข้อมูลทั้งหมดเป็น Map
    const dateMap = new Map<string, number>();

    const addToMap = (rows: { date: string; count: string }[]) => {
      rows.forEach((row) => {
        const count = parseInt(row.count || '0', 10);
        dateMap.set(row.date, (dateMap.get(row.date) || 0) + count);
      });
    };

    addToMap(tagData);
    addToMap(commentData);
    addToMap(mentionOtherData);
    addToMap(mentionAMData);
    addToMap(mentionAuditData);

    // 5. แปลง Map เป็น Array และเรียงตามวันที่
    const result: UserChartData[] = Array.from(dateMap.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }

  private async getUserData(userId: number | null) {
    if (!userId) return null;
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
          empUpperId: user.EmpUpperID ? Number(user.EmpUpperID) : null,
        };
      }
    } catch (error) {
      console.error(`Error fetching user data for userId ${userId}:`, error);
    }
    return null;
  }

  private async getUserDataByCode(userCode: string) {
    if (!userCode) return null;
    try {
      const users = await this.userRightService.getUsersFromProcedure(
        userCode,
        null,
      );
      if (users && users.length > 0) {
        const user = users[0];
        return {
          userId: user.UserID,
          userCode: user.UserCode,
          fullname: user.fristName ? user.fristName + ' ' + user.lastName : '',
          email: user.Email,
          position: user.Position,
          branchId: user.BranchID,
          empUpperId: user.EmpUpperID ? Number(user.EmpUpperID) : null,
        };
      }
    } catch (error) {
      console.error(
        `Error fetching user data for userCode ${userCode}:`,
        error,
      );
    }
    return null;
  }

  /**
   * AM Chart - สถานะงาน (ต่อวัน) - รูปแบบเดียวกับ Audit Chart แต่ใช้ข้อมูล AM
   * 3 เส้น: กำลังดำเนินการ (2) / ปิดเคสแล้ว (4) / รอ Checker ตรวจ (4 + headerChecklistStatus null/0/1)
   */
  async getAMChartData(dateRange: number): Promise<AuditChartData[]> {
    const startDate = this.getStartDate(dateRange);

    const result = await this.amItemRepo
      .createQueryBuilder('ai')
      .select([
        "FORMAT(ai.updatedAt, 'yyyy-MM-dd') as date",
        'SUM(CASE WHEN ai.itemStatusEdit = 2 THEN 1 ELSE 0 END) as active',
        'SUM(CASE WHEN ai.itemStatusEdit = 4 THEN 1 ELSE 0 END) as closed',
        `SUM(CASE WHEN ai.itemStatusEdit = 4
        AND (ai.headerChecklistStatus IS NULL OR ai.headerChecklistStatus IN (0, 1))
        THEN 1 ELSE 0 END) as waitingAM`,
      ])
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('aj.positionType IN (:...positionTypes)', {
        positionTypes: ['AM', 'AA'],
      })
      .groupBy("FORMAT(ai.updatedAt, 'yyyy-MM-dd')")
      .orderBy('date', 'ASC')
      .getRawMany<{
        date: string;
        active: string;
        closed: string;
        waitingAM: string;
      }>();

    return result.map((row) => ({
      date: row.date,
      active: parseInt(row.active || '0', 10),
      closed: parseInt(row.closed || '0', 10),
      waitingAM: parseInt(row.waitingAM || '0', 10),
    }));
  }

  /**
   * Audit Chart - สถานะงาน (ต่อวัน)
   * 3 เส้น: กำลังดำเนินการ (2) / ปิดเคสแล้ว (4) / รอ Checker ตรวจ (4 + AM null/0/1)
   */
  async getAuditChartData(dateRange: number): Promise<AuditChartData[]> {
    const startDate = this.getStartDate(dateRange);

    const result = await this.auditItemRepo
      .createQueryBuilder('ai')
      .select([
        "FORMAT(ai.updatedAt, 'yyyy-MM-dd') as date",
        'SUM(CASE WHEN ai.itemStatusEdit = 2 THEN 1 ELSE 0 END) as active',
        'SUM(CASE WHEN ai.itemStatusEdit = 4 THEN 1 ELSE 0 END) as closed',
        `SUM(CASE WHEN ai.itemStatusEdit = 4 
        AND (ai.amChecklistStatus IS NULL OR ai.amChecklistStatus IN (0, 1)) 
        THEN 1 ELSE 0 END) as waitingAM`,
      ])
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .groupBy("FORMAT(ai.updatedAt, 'yyyy-MM-dd')")
      .orderBy('date', 'ASC')
      .getRawMany<{
        date: string;
        active: string;
        closed: string;
        waitingAM: string;
      }>();

    return result.map((row) => ({
      date: row.date,
      active: parseInt(row.active || '0', 10),
      closed: parseInt(row.closed || '0', 10),
      waitingAM: parseInt(row.waitingAM || '0', 10),
    }));
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

  private getAuditItemStatusText(
    itemStatusEdit: number | null,
    amChecklistStatus: number | null,
  ): string {
    if (amChecklistStatus === 3) return 'Checker: ไม่ผ่าน';
    if (amChecklistStatus === 4) return 'Checker: ต้องแก้ไข';
    if (amChecklistStatus === 2) return 'Checker: ผ่าน';

    if (itemStatusEdit === 2) return 'กำลังดำเนินการ';
    if (itemStatusEdit === 4) return 'ปิดเคส - รอ Checker';

    return 'ยังไม่ตรวจ';
  }

  private getAuditItemStatusColor(
    itemStatusEdit: number | null,
    amChecklistStatus: number | null,
  ): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (amChecklistStatus === 3 || amChecklistStatus === 4)
      return 'destructive';
    if (amChecklistStatus === 2) return 'secondary';
    if (itemStatusEdit === 2) return 'default';
    if (itemStatusEdit === 4) return 'outline';
    return 'outline';
  }

  private getUserItemStatusText(
    itemStatus: number | null | undefined,
    itemStatusEdit: number | null | undefined,
    amChecklistStatus: number | null | undefined,
  ): string {
    const parts: string[] = [];

    if (itemStatus === 1) parts.push('Audit: ปกติ');
    else if (itemStatus === 2) parts.push('Audit: กำลังตรวจ');
    else if (itemStatus === 3) parts.push('Audit: ผิดปกติ');
    else if (itemStatus === 4) parts.push('Audit: ปิดเคส');

    if (amChecklistStatus === 0 || amChecklistStatus === null)
      parts.push('AM: ยังไม่ตรวจ');
    else if (amChecklistStatus === 1) parts.push('AM: รอตรวจ');
    else if (amChecklistStatus === 2) parts.push('AM: ผ่าน');
    else if (amChecklistStatus === 3) parts.push('AM: ไม่ผ่าน');
    else if (amChecklistStatus === 4) parts.push('AM: ต้องแก้ไข');

    return parts.join(' | ') || 'ยังไม่มีสถานะ';
  }

  private getUserItemStatusColor(
    amChecklistStatus: number | null | undefined,
  ): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (amChecklistStatus === 2) return 'secondary';
    if (amChecklistStatus === 3 || amChecklistStatus === 4)
      return 'destructive';
    if (amChecklistStatus === 1) return 'default';
    return 'outline';
  }
  async getManagerChartData(dateRange: number): Promise<AMChartData[]> {
    const startDate = this.getStartDate(dateRange);

    const result = await this.auditItemRepo
      .createQueryBuilder('ai')
      .select([
        "FORMAT(ai.updatedAt, 'yyyy-MM-dd') as date",
        'SUM(CASE WHEN ai.amChecklistStatus = 2 THEN 1 ELSE 0 END) as passed',
        'SUM(CASE WHEN ai.amChecklistStatus = 3 THEN 1 ELSE 0 END) as failed',
        'SUM(CASE WHEN ai.amChecklistStatus = 4 THEN 1 ELSE 0 END) as needFix',
      ])
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('ai.amChecklistStatus IN (:...statuses)', {
        statuses: [2, 3, 4],
      })
      .groupBy("FORMAT(ai.updatedAt, 'yyyy-MM-dd')")
      .orderBy('date', 'ASC')
      .getRawMany<{
        date: string;
        passed: string;
        failed: string;
        needFix: string;
      }>();

    return result.map((row) => ({
      date: row.date,
      passed: parseInt(row.passed || '0', 10),
      failed: parseInt(row.failed || '0', 10),
      needFix: parseInt(row.needFix || '0', 10),
    }));
  }
}
