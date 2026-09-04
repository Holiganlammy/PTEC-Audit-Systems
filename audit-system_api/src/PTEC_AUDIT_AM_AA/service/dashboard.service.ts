// dashboard/service/dashboard.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AMItem } from '../domain/model/am-item.entity';
import { AMJobHeader } from '../domain/model/am.jobs-header.entity';
import { AMItemAMCheckerComment } from '../domain/model/am-item-am-checker-comment.entity';
import { AMItemAMComment } from '../domain/model/am-item-am-comment.entity';
import { AMItemOtherComment } from '../domain/model/am-item-other-comment.entity';
import { AMItemOtherCommentUsersTag } from '../domain/model/am-item-other-comment-users-tag.entity';
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
  closedJobs: number;
  waitingAM: number;
  amRejected: number;
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
  categoryName: string;
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
  totalCount: number;
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
  closedJobs: string;
  waitingAM: string;
  amRejected: string;
}

interface CountResult {
  count: string;
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
    @InjectRepository(AMItem)
    private readonly amItemRepo: Repository<AMItem>,

    @InjectRepository(AMJobHeader)
    private readonly amJobRepo: Repository<AMJobHeader>,

    @InjectRepository(AMItemAMCheckerComment)
    private readonly auditCommentRepo: Repository<AMItemAMCheckerComment>,

    @InjectRepository(AMItemAMComment)
    private readonly amCommentRepo: Repository<AMItemAMComment>,

    @InjectRepository(AMItemOtherComment)
    private readonly otherCommentRepo: Repository<AMItemOtherComment>,

    @InjectRepository(AMItemOtherCommentUsersTag)
    private readonly tagRepo: Repository<AMItemOtherCommentUsersTag>,

    private readonly userRightService: UserRightService,
  ) {}

  // ==========================================
  // Dashboard Data Methods
  // ==========================================

  /**
   *  Get AM Dashboard Data
   */
  async getAMDashboardData(userId: string, dateRange: number) {
    const stats = await this.getAMStats(dateRange, userId);
    const recentActivities = await this.getRecentActivities(dateRange);
    const branchIssues = await this.getAMBranchIssues(dateRange, userId);

    const notCheckedItems = await this.getAMItemsByStatus(
      dateRange,
      'NOT_CHECKED',
      userId,
    );
    const pendingItems = await this.getAMItemsByStatus(
      dateRange,
      'PENDING',
      userId,
    );
    const failedItems = await this.getAMItemsByStatus(
      dateRange,
      'FAILED',
      userId,
    );
    const needFixItems = await this.getAMItemsByStatus(
      dateRange,
      'NEED_FIX',
      userId,
    );

    return {
      stats: { am: stats },
      notCheckedItems,
      pendingItems,
      failedItems,
      needFixItems,
      recentActivities,
      branchIssues,
    };
  }

  /**
   *  Get Audit Dashboard Data
   */
  async getAuditDashboardData(userId: string, dateRange: number) {
    const userData = await this.getUserDataByCode(userId);
    const userIdNum = userData?.userId ?? 0;

    const stats = await this.getAuditStats(dateRange, userIdNum);
    const recentActivities = await this.getRecentActivities(dateRange);

    const notCheckedItems = await this.getAuditItemsByStatus(
      dateRange,
      'NOT_CHECKED',
      userIdNum,
    );
    const activeItems = await this.getAuditItemsByStatus(
      dateRange,
      'ACTIVE',
      userIdNum,
    );
    const waitingAMItems = await this.getAuditItemsByStatus(
      dateRange,
      'WAITING_AM',
      userIdNum,
    );
    const amRejectedItems = await this.getAuditItemsByStatus(
      dateRange,
      'AM_REJECTED',
      userIdNum,
    );

    return {
      stats: { audit: stats },
      notCheckedItems,
      activeItems,
      waitingAMItems,
      amRejectedItems,
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

  private async getAMStats(
    dateRange: number,
    userCode: string,
  ): Promise<AMStats> {
    const startDate = this.getStartDate(dateRange);

    const result = await this.amItemRepo
      .createQueryBuilder('ai')
      .select([
        'COUNT(CASE WHEN ai.itemStatusEdit IS NULL THEN 1 END) AS notCheckedCount',
        'COUNT(CASE WHEN ai.itemStatusEdit = 2 THEN 1 END) AS pendingCount',
        `COUNT(CASE WHEN EXISTS (SELECT 1 FROM Branch_Am_Scores s WHERE s.item_id = ai.item_id AND s.score = 1 AND s.active = 1) THEN 1 END) AS passedCount`,
        `COUNT(CASE WHEN EXISTS (SELECT 1 FROM Branch_Am_Scores s WHERE s.item_id = ai.item_id AND s.score = 0 AND s.active = 1) THEN 1 END) AS failedCount`,
        `COUNT(CASE WHEN EXISTS (SELECT 1 FROM Branch_Am_Scores s WHERE s.item_id = ai.item_id AND s.score = -1 AND s.active = 1) THEN 1 END) AS needFixCount`,
      ])
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('aj.positionType IN (:...positionTypes)', {
        positionTypes: ['AM', 'AA'],
      })
      .andWhere('(aj.amUserCode = :userCode OR aj.rmUserCode = :userCode)', {
        userCode,
      })
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

  private async getAMItemsByStatus(
    dateRange: number,
    statusType: 'NOT_CHECKED' | 'PENDING' | 'FAILED' | 'NEED_FIX',
    userCode: string,
  ): Promise<ItemList> {
    const startDate = this.getStartDate(dateRange);

    let whereClause = '';
    switch (statusType) {
      case 'NOT_CHECKED':
        whereClause = 'ai.itemStatusEdit IS NULL';
        break;
      case 'PENDING':
        whereClause = 'ai.itemStatusEdit = 2';
        break;
      case 'FAILED':
        whereClause =
          'EXISTS (SELECT 1 FROM Branch_Am_Scores s WHERE s.item_id = ai.item_id AND s.score = 0 AND s.active = 1)';
        break;
      case 'NEED_FIX':
        whereClause =
          'EXISTS (SELECT 1 FROM Branch_Am_Scores s WHERE s.item_id = ai.item_id AND s.score = -1 AND s.active = 1)';
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
      .andWhere('(aj.amUserCode = :userCode OR aj.rmUserCode = :userCode)', {
        userCode,
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
      .andWhere('(aj.amUserCode = :userCode OR aj.rmUserCode = :userCode)', {
        userCode,
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
        status: this.getAMChecklistStatusText(item.headerChecklistStatus),
        daysAgo: this.calculateDaysAgo(item.updatedAt),
        statusColor: this.getAMChecklistStatusColor(item.headerChecklistStatus),
      })),
      totalCount,
    };
  }

  private async getAMBranchIssues(
    dateRange: number,
    userCode: string,
  ): Promise<BranchIssue[]> {
    const startDate = this.getStartDate(dateRange);

    // ความเสี่ยง = item ที่ itemStatus = 3 (ผิดปกติ) เทียบเป็น % จาก item ทั้งหมด (สูตรเดียวกับ Manager/Audit/AA)
    const result = await this.amItemRepo
      .createQueryBuilder('ai')
      .select('aj.branchId', 'branchId')
      .addSelect('aj.branchName', 'branchName')
      .addSelect('COUNT(*) as totalCount')
      .addSelect('COUNT(CASE WHEN ai.itemStatus = 3 THEN 1 END) as riskCount')
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('aj.positionType IN (:...positionTypes)', {
        positionTypes: ['AM', 'AA'],
      })
      .andWhere('(aj.amUserCode = :userCode OR aj.rmUserCode = :userCode)', {
        userCode,
      })
      .andWhere('ai.itemStatus IS NOT NULL')
      .groupBy('aj.branchId')
      .addGroupBy('aj.branchName')
      .getRawMany<{
        branchId: number;
        branchName: string;
        totalCount: string;
        riskCount: string;
      }>();

    const rows = result.map((row) => ({
      branchId: row.branchId,
      branchName: row.branchName,
      total: parseInt(row.totalCount, 10),
      riskCount: parseInt(row.riskCount, 10),
    }));

    return this.rankBranchesByRisk(rows, 5).map((row) => ({
      branchId: row.branchId,
      branchName: row.branchName,
      issueCount: row.riskCount,
      totalCount: row.total,
      failureRate: row.riskPercent,
    }));
  }

  // ==========================================
  // Audit Stats & Items
  // ==========================================

  private async getAuditStats(
    dateRange: number,
    userIdNum: number,
  ): Promise<AuditStats> {
    const startDate = this.getStartDate(dateRange);

    const result = await this.amItemRepo
      .createQueryBuilder('ai')
      .select([
        'COUNT(DISTINCT ai.jobId) AS totalJobs',
        'COUNT(CASE WHEN ai.itemStatusEdit = 2 THEN 1 END) AS activeJobs',
        'COUNT(CASE WHEN ai.itemStatusEdit = 4 THEN 1 END) AS closedJobs',
        'COUNT(CASE WHEN ai.itemStatusEdit = 4 AND (ai.amChecklistStatus IS NULL OR ai.amChecklistStatus IN (0, 1)) THEN 1 END) AS waitingAM',
        'COUNT(CASE WHEN ai.amChecklistStatus IN (3, 4) THEN 1 END) AS amRejected',
      ])
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('(aj.amUserId = :userIdNum OR aj.rmUserId = :userIdNum)', {
        userIdNum,
      })
      .getRawOne<AuditStatsResult>();

    return {
      totalJobs: parseInt(result?.totalJobs || '0', 10),
      activeJobs: parseInt(result?.activeJobs || '0', 10),
      closedJobs: parseInt(result?.closedJobs || '0', 10),
      waitingAM: parseInt(result?.waitingAM || '0', 10),
      amRejected: parseInt(result?.amRejected || '0', 10),
    };
  }

  private async getAuditItemsByStatus(
    dateRange: number,
    statusType: 'NOT_CHECKED' | 'ACTIVE' | 'WAITING_AM' | 'AM_REJECTED',
    userIdNum: number,
  ): Promise<ItemList> {
    const startDate = this.getStartDate(dateRange);
    let whereClause = '';

    switch (statusType) {
      case 'NOT_CHECKED':
        whereClause =
          '(ai.amChecklistStatus IS NULL OR ai.amChecklistStatus = 0)';
        break;
      case 'ACTIVE':
        whereClause = 'ai.itemStatusEdit = 2';
        break;
      case 'WAITING_AM':
        whereClause =
          'ai.itemStatusEdit = 4 AND (ai.amChecklistStatus IS NULL OR ai.amChecklistStatus IN (0, 1))';
        break;
      case 'AM_REJECTED':
        whereClause = 'ai.amChecklistStatus IN (3, 4)';
        break;
    }

    const totalCount = await this.amItemRepo
      .createQueryBuilder('ai')
      .innerJoin('ai.job', 'aj')
      .where(whereClause)
      .andWhere('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('(aj.amUserId = :userIdNum OR aj.rmUserId = :userIdNum)', {
        userIdNum,
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
      .andWhere('(aj.amUserId = :userIdNum OR aj.rmUserId = :userIdNum)', {
        userIdNum,
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
    const taggedCount = await this.amItemRepo
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
    const mentionCount = await this.amItemRepo
      .createQueryBuilder('ai')
      .innerJoin('ai.job', 'aj')
      .where(
        `(
          EXISTS (
            SELECT 1 FROM AMItemOtherComment c
            WHERE c.item_id = ai.item_id
              AND c.note LIKE :mention
              AND c.created_by != :userId
              AND c.created_at >= :startDate
              AND c.active = 1
          )
          OR EXISTS (
            SELECT 1 FROM AMItemAMComment c
            WHERE c.item_id = ai.item_id
              AND c.note LIKE :mention
              AND c.created_by != :userId
              AND c.created_at >= :startDate
              AND c.active = 1
          )
          OR EXISTS (
            SELECT 1 FROM AMItemAMCheckerComment c
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
    let items: AMItem[] = [];

    switch (type) {
      case 'TAGGED': {
        // 1. Tag ใน Item (จาก AuditItems_OtherComment_Users_Tag)
        totalCount = await this.amItemRepo
          .createQueryBuilder('ai')
          .innerJoin('ai.taggedUsers', 't')
          .innerJoin('ai.job', 'aj')
          .where('t.userId = :userId', { userId: userIdNum })
          .andWhere('t.active = :active', { active: true })
          .andWhere('t.createdAt >= :startDate', { startDate })
          .andWhere('ai.active = :active', { active: true })
          .andWhere('aj.active = :active', { active: true })
          .getCount();

        items = await this.amItemRepo
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
        totalCount = await this.amItemRepo
          .createQueryBuilder('ai')
          .innerJoin('ai.job', 'aj')
          .where(
            `EXISTS (
            SELECT 1 FROM AMItemOtherComment c
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

        items = await this.amItemRepo
          .createQueryBuilder('ai')
          .leftJoinAndSelect('ai.job', 'aj')
          .leftJoinAndSelect('ai.categoryItem', 'cat')
          .where(
            `EXISTS (
            SELECT 1 FROM AMItemOtherComment c
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
            SELECT 1 FROM AMItemOtherComment c
            WHERE c.item_id = ai.item_id
              AND c.note LIKE :mention
              AND c.created_by != :userId
              AND c.created_at >= :startDate
              AND c.active = 1
          )
          OR EXISTS (
            SELECT 1 FROM AMItemAMComment c
            WHERE c.item_id = ai.item_id
              AND c.note LIKE :mention
              AND c.created_by != :userId
              AND c.created_at >= :startDate
              AND c.active = 1
          )
          OR EXISTS (
            SELECT 1 FROM AMItemAMCheckerComment c
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

        totalCount = await this.amItemRepo
          .createQueryBuilder('ai')
          .innerJoin('ai.job', 'aj')
          .where(mentionWhere, mentionParams)
          .andWhere('ai.active = :active', { active: true })
          .andWhere('aj.active = :active', { active: true })
          .getCount();

        items = await this.amItemRepo
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
          item.headerChecklistStatus,
        ),
        daysAgo: this.calculateDaysAgo(item.updatedAt),
        statusColor: this.getUserItemStatusColor(item.headerChecklistStatus),
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
    const totalBranchesResult = await this.amJobRepo
      .createQueryBuilder('aj')
      .select('COUNT(DISTINCT aj.branchId)', 'count')
      .where('aj.active = :active', { active: true })
      .getRawOne<CountResult>();

    const totalBranches = parseInt(totalBranchesResult?.count || '0', 10);

    // 2. นับสาขาที่มีปัญหา (มี Items ที่ Failed หรือ Need Fix)
    const branchesWithIssuesResult = await this.amItemRepo
      .createQueryBuilder('ai')
      .select('COUNT(DISTINCT aj.branchId)', 'count')
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('ai.headerChecklistStatus IN (:...statuses)', {
        statuses: [3, 4],
      }) // Failed, Need Fix
      .getRawOne<CountResult>();

    const branchesWithIssues = parseInt(
      branchesWithIssuesResult?.count || '0',
      10,
    );

    // 3. สาขาปกติ = สาขาทั้งหมด - สาขาที่มีปัญหา
    const normalBranches = totalBranches - branchesWithIssues;

    // 4. คำนวณคะแนนเฉลี่ย (% ของ Items ที่ผ่าน)
    const scoreResult = await this.amItemRepo
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
    const branchesQuery = await this.amItemRepo
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
    const branchesWithIssuesQuery = await this.amItemRepo
      .createQueryBuilder('ai')
      .select('aj.branchId', 'branchId')
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('ai.headerChecklistStatus IN (:...statuses)', {
        statuses: [3, 4],
      })
      .groupBy('aj.branchId')
      .getRawMany<{ branchId: number }>();

    const problematicBranchIds = branchesWithIssuesQuery.map((b) => b.branchId);

    // 2. ดึงสาขาทั้งหมดที่ไม่มีปัญหา พร้อม jobNo ล่าสุด
    const queryBuilder = this.amJobRepo
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
        ? await this.amJobRepo
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

    // ความเสี่ยง = item ที่ itemStatus = 3 (ผิดปกติ) เทียบเป็น % จาก item ทั้งหมด
    // ใช้ Bayesian shrinkage ดึงสาขาที่ตรวจน้อยเข้าหาค่าเฉลี่ยรวมของบริษัท (RISK_SHRINKAGE_K)
    // กัน false-positive จากสาขาที่มีตัวอย่างน้อย (เช่น ตรวจ 3 รายการ พลาด 2 = 67% ทั้งที่ข้อมูลน้อยเกินจะสรุป)
    const result = await this.amItemRepo
      .createQueryBuilder('ai')
      .select([
        'aj.branchId as branchId',
        'aj.branchName as branchName',
        'COUNT(*) as totalCount',
        'COUNT(CASE WHEN ai.itemStatus = 3 THEN 1 END) as riskCount',
      ])
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('ai.itemStatus IS NOT NULL')
      .groupBy('aj.branchId')
      .addGroupBy('aj.branchName')
      .getRawMany<{
        branchId: number;
        branchName: string;
        totalCount: string;
        riskCount: string;
      }>();

    const rows = result.map((row) => ({
      branchId: row.branchId,
      branchName: row.branchName,
      total: parseInt(row.totalCount, 10),
      riskCount: parseInt(row.riskCount, 10),
    }));

    return this.rankBranchesByRisk(rows, 10).map((row, index) => ({
      branchId: row.branchId,
      branchName: row.branchName,
      score: row.riskPercent,
      issueCount: row.riskCount,
      totalCount: row.total,
      rank: index + 1,
    }));
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
          ...auditComments.map((c) => c.userId),
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

    auditComments.forEach((comment) => {
      const userData = comment.userId ? userMap.get(comment.userId) : null;
      activities.push({
        id: `audit-${comment.amCheckerDetailId}`,
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
        id: `checklist-${item.itemId}`,
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
    const tagData = await this.amItemRepo
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
    const commentData = await this.amCommentRepo
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

  async getAMChartData(dateRange: number): Promise<AMChartData[]> {
    const startDate = this.getStartDate(dateRange);

    const result = await this.amItemRepo
      .createQueryBuilder('ai')
      .select([
        "FORMAT(ai.updatedAt, 'yyyy-MM-dd') as date",
        'SUM(CASE WHEN ai.headerChecklistStatus = 2 THEN 1 ELSE 0 END) as passed',
        'SUM(CASE WHEN ai.headerChecklistStatus = 3 THEN 1 ELSE 0 END) as failed',
        'SUM(CASE WHEN ai.headerChecklistStatus = 4 THEN 1 ELSE 0 END) as needFix',
      ])
      .innerJoin('ai.job', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('ai.headerChecklistStatus IN (:...statuses)', {
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

  /**
   * Audit Chart - สถานะงาน (ต่อวัน)
   * 3 เส้น: กำลังดำเนินการ (2) / ปิดเคสแล้ว (4) / รอ AM ตรวจ (4 + AM null/0/1)
   */
  async getAuditChartData(dateRange: number): Promise<AuditChartData[]> {
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

  // น้ำหนักเสมือน "ของกลาง" ที่ถ่วงเข้าไปทุกสาขา (Bayesian shrinkage) — กัน false-positive จากสาขาตัวอย่างน้อย
  private readonly RISK_SHRINKAGE_K = 10;

  /**
   * สูตรความเสี่ยงกลาง ใช้ร่วมกันทุก dashboard (Manager/Audit/AM/AA):
   * risk% = item ที่ itemStatus=3 (ผิดปกติ) ÷ item ทั้งหมด ถ่วงเข้าหาค่าเฉลี่ยรวม
   * เรียง: risk% มาก่อน → เท่ากันดูจำนวนผิดจริง → เท่ากันดูจำนวนตรวจทั้งหมด → เท่ากันดูชื่อสาขา
   */
  private rankBranchesByRisk<
    T extends { branchId: number; branchName: string; total: number; riskCount: number },
  >(rows: T[], limit: number): (T & { riskPercent: number })[] {
    const companyTotal = rows.reduce((sum, r) => sum + r.total, 0);
    const companyRisk = rows.reduce((sum, r) => sum + r.riskCount, 0);
    const companyAvgRisk = companyTotal > 0 ? companyRisk / companyTotal : 0;
    const k = this.RISK_SHRINKAGE_K;

    return rows
      .map((row) => {
        const adjustedRisk =
          (row.riskCount + k * companyAvgRisk) / (row.total + k);
        return { ...row, riskPercent: Math.round(adjustedRisk * 100) };
      })
      .sort((a, b) => {
        if (b.riskPercent !== a.riskPercent) return b.riskPercent - a.riskPercent;
        if (b.riskCount !== a.riskCount) return b.riskCount - a.riskCount;
        if (b.total !== a.total) return b.total - a.total;
        return a.branchName.localeCompare(b.branchName);
      })
      .slice(0, limit);
  }

  private calculateDaysAgo(date: Date): number {
    const now = new Date();
    const updatedAt = new Date(date);
    const diffTime = Math.abs(now.getTime() - updatedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

  private getAuditItemStatusText(
    itemStatusEdit: number | null,
    amChecklistStatus: number | null,
  ): string {
    if (amChecklistStatus === 3) return 'AM: ไม่ผ่าน';
    if (amChecklistStatus === 4) return 'AM: ต้องแก้ไข';
    if (amChecklistStatus === 2) return 'AM: ผ่าน';

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
    return this.getAMChartData(dateRange);
  }
}
