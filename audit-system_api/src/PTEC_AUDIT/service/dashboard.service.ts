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
import { AAJobHeader } from '../../PTEC_AUDIT_AM_AA/domain/model/aa.jobs-header.entity';
import { AMItemAAComment } from '../../PTEC_AUDIT_AM_AA/domain/model/am-item-aa-comment.entity';
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
  rawRate: number; // % ที่นับจริงไม่ผ่าน shrinkage — ใช้เทียบกับ failureRate (ค่าปรับ) ตอน sample น้อย
  isLowSample: boolean; // totalCount < เกณฑ์ขั้นต่ำ → failureRate เป็นค่าปรับ ไม่ใช่ % ที่นับได้ตรงๆ
  items: ActionItem[]; // ตัวอย่างรายการที่ itemStatus=3 จริง ให้กดดูย้อนไปที่เอกสารได้
}

interface BranchRanking {
  branchId: number;
  branchName: string;
  score: number;
  rawRate: number;
  isLowSample: boolean;
  issueCount: number;
  totalCount: number;
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

interface PendingChecklistJob {
  jobId: number;
  jobNo: string;
  branchName: string;
  pendingCount: number;
  totalCount: number;
}

interface PendingChecklistResult {
  jobId: number;
  jobNo: string;
  branchName: string;
  pendingCount: string;
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

    @InjectRepository(AAJobHeader)
    private readonly aaJobRepo: Repository<AAJobHeader>,

    @InjectRepository(AMItemAAComment)
    private readonly aaCommentRepo: Repository<AMItemAAComment>,

    private readonly userRightService: UserRightService,
  ) {}

  // ==========================================
  // Dashboard Data Methods
  // ==========================================

  /**
   *  Get AM Dashboard Data
   */
  async getAMDashboardData(userId: number, dateRange: number, roleId?: number) {
    // ปกติเห็นเฉพาะ job ที่ตัวเองเป็น amUser หรือเป็นคนสร้าง (ไม่ขยายไปทั้งสาขา
    // เพราะ AM ที่รับผิดชอบสาขาเปลี่ยนคนได้เรื่อยๆ)
    // role 1,2,9 (Admin/Audit/SSD) และ 10 (Master AM) เห็นได้ไม่จำกัด — ทุกสาขาของ AM
    const isUnrestricted =
      roleId !== undefined && [1, 2, 9, 10].includes(roleId);
    const scopeUserId = isUnrestricted ? null : userId;

    const stats = await this.getAMDocStats(dateRange, scopeUserId);
    const recentActivities = await this.getAMRecentActivities(
      dateRange,
      scopeUserId,
    );
    const branchIssues = await this.getAMBranchIssues(dateRange, scopeUserId);

    const notCheckedItems = await this.getAMDocItemsByStatus(
      dateRange,
      'NOT_CHECKED',
      scopeUserId,
    );
    const activeItems = await this.getActiveAMJobs(dateRange, scopeUserId);
    const pendingCloseCaseItems = await this.getAMDocItemsByStatus(
      dateRange,
      'PENDING_CLOSE_CASE',
      scopeUserId,
    );
    const overdueItems = await this.getOverdueAMItems(scopeUserId);
    const pendingChecklist = await this.getAMPendingChecklist(scopeUserId);

    return {
      stats: { am: stats },
      notCheckedItems,
      activeItems,
      pendingCloseCaseItems,
      overdueItems,
      recentActivities,
      branchIssues,
      pendingChecklist,
    };
  }

  /**
   * รายการใบงาน AM ที่งานเสร็จแล้ว (item_status_edit = 4) แต่ยังไม่ผ่าน checklist
   * (header_checklist_status ยังว่าง/ยังไม่ทำ) — จัดอันดับตามจำนวนที่ค้างมากสุด
   */
  private async getAMPendingChecklist(
    userId: number | null,
  ): Promise<PendingChecklistJob[]> {
    // AMItem.job และ AMItem.aaJob ผูกกับคอลัมน์ job_id เดียวกัน (คนละตาราง) —
    // ต้องกันไม่ให้ item ฝั่ง AA (jobSource='AA') หลุดมานับปนกับ AM เพราะ job_id ชนกันได้
    const notAA = "(ai.jobSource IS NULL OR UPPER(ai.jobSource) <> 'AA')";
    const scopeUser =
      '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)';
    const pendingCase = `CASE WHEN (ai.headerChecklistStatus IS NULL OR ai.headerChecklistStatus = 0) THEN ai.itemId END`;

    const rows = await this.amItemRepo
      .createQueryBuilder('ai')
      .select('aj.jobId', 'jobId')
      .addSelect('aj.jobNo', 'jobNo')
      .addSelect('aj.branchName', 'branchName')
      .addSelect(`COUNT(DISTINCT ${pendingCase})`, 'pendingCount')
      .addSelect('COUNT(DISTINCT ai.itemId)', 'totalCount')
      .innerJoin('ai.job', 'aj')
      .where('ai.itemStatusEdit = :closedStatus', { closedStatus: 4 })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere(notAA)
      .andWhere(scopeUser, { userId })
      .groupBy('aj.jobId')
      .addGroupBy('aj.jobNo')
      .addGroupBy('aj.branchName')
      .having(`COUNT(DISTINCT ${pendingCase}) > 0`)
      .orderBy('pendingCount', 'DESC')
      .getRawMany<PendingChecklistResult>();

    return rows.map((row) => ({
      jobId: row.jobId,
      jobNo: row.jobNo,
      branchName: row.branchName,
      pendingCount: parseInt(row.pendingCount, 10),
      totalCount: parseInt(row.totalCount, 10),
    }));
  }

  /**
   *  Get AA Dashboard Data
   */
  async getAADashboardData(
    userId: number,
    roleId?: number,
    dateRange: number = 30,
  ) {
    // role 1,2,9 (Admin/Audit/SSD) และ 10 (Master Area) เห็นได้ไม่จำกัด ส่วน AA (role 8) เห็นเฉพาะ job ของตัวเอง
    const isUnrestricted =
      roleId !== undefined && [1, 2, 9, 10].includes(roleId);
    const scopeUserId = isUnrestricted ? null : userId;

    const stats = await this.getAADocStats(dateRange, scopeUserId);
    const recentActivities = await this.getAARecentActivities(
      dateRange,
      scopeUserId,
    );
    const branchIssues = await this.getAABranchIssues(dateRange, scopeUserId);

    const notCheckedItems = await this.getAADocItemsByStatus(
      dateRange,
      'NOT_CHECKED',
      scopeUserId,
    );
    const activeItems = await this.getActiveAAJobs(dateRange, scopeUserId);
    const pendingCloseCaseItems = await this.getAADocItemsByStatus(
      dateRange,
      'PENDING_CLOSE_CASE',
      scopeUserId,
    );
    const overdueItems = await this.getOverdueAAItems(scopeUserId);
    const pendingChecklist = await this.getAAPendingChecklist(scopeUserId);

    return {
      stats: { aa: stats },
      notCheckedItems,
      activeItems,
      pendingCloseCaseItems,
      overdueItems,
      recentActivities,
      branchIssues,
      pendingChecklist,
    };
  }

  /**
   * รายการใบงาน AA ที่งานเสร็จแล้ว (item_status_edit = 4) แต่ยังไม่ผ่าน checklist
   * (header_checklist_status ยังว่าง/ยังไม่ทำ) — จัดอันดับตามจำนวนที่ค้างมากสุด
   */
  private async getAAPendingChecklist(
    userId: number | null,
  ): Promise<PendingChecklistJob[]> {
    // AMItem.job และ AMItem.aaJob ผูกกับคอลัมน์ job_id เดียวกัน (คนละตาราง) —
    // ต้องกรองเฉพาะ item ฝั่ง AA จริงๆ ไม่งั้นจะไปปนกับ AM ที่ job_id ชนกันได้
    const isAA = "UPPER(ai.jobSource) = 'AA'";
    const scopeUser =
      '(:userId IS NULL OR aj.aaUserId = :userId OR aj.createdBy = :userId)';
    const pendingCase = `CASE WHEN (ai.headerChecklistStatus IS NULL OR ai.headerChecklistStatus = 0) THEN ai.itemId END`;

    const rows = await this.amItemRepo
      .createQueryBuilder('ai')
      .select('aj.jobId', 'jobId')
      .addSelect('aj.jobNo', 'jobNo')
      .addSelect('aj.branchName', 'branchName')
      .addSelect(`COUNT(DISTINCT ${pendingCase})`, 'pendingCount')
      .addSelect('COUNT(DISTINCT ai.itemId)', 'totalCount')
      .innerJoin('ai.aaJob', 'aj')
      .where('ai.itemStatusEdit = :closedStatus', { closedStatus: 4 })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere(isAA)
      .andWhere(scopeUser, { userId })
      .groupBy('aj.jobId')
      .addGroupBy('aj.jobNo')
      .addGroupBy('aj.branchName')
      .having(`COUNT(DISTINCT ${pendingCase}) > 0`)
      .orderBy('pendingCount', 'DESC')
      .getRawMany<PendingChecklistResult>();

    return rows.map((row) => ({
      jobId: row.jobId,
      jobNo: row.jobNo,
      branchName: row.branchName,
      pendingCount: parseInt(row.pendingCount, 10),
      totalCount: parseInt(row.totalCount, 10),
    }));
  }

  private async getAABranchIssues(
    dateRange: number,
    userId: number | null,
    limit = 5,
  ): Promise<BranchIssue[]> {
    const startDate = this.getStartDate(dateRange);
    const isAA = "UPPER(ai.jobSource) = 'AA'";

    // ความเสี่ยง = item ที่ itemStatus = 3 (ผิดปกติ) เทียบเป็น % จาก item ทั้งหมด (สูตรเดียวกับ Manager/Audit/AM)
    // กรองด้วย aj.auditDate (วันที่ตรวจของใบงาน) ไม่ใช่ ai.updatedAt (วันที่แก้ item ล่าสุด)
    // เพราะ item ที่ยังไม่มีใครแก้ไขหลังสร้าง (ปกติส่วนใหญ่ไม่ถูกแตะ) จะมี updatedAt เก่ากว่ารายการที่เพิ่งถูกมาร์คว่าผิดปกติ
    // ถ้ากรองด้วย updatedAt จะทำให้ item ปกติหลุดตัวหารไปทั้งที่ยังอยู่ในใบงานเดียวกัน ทำให้ % เพี้ยนสูงเกินจริง
    const result = await this.amItemRepo
      .createQueryBuilder('ai')
      .select('aj.branchId', 'branchId')
      .addSelect('aj.branchName', 'branchName')
      .addSelect('COUNT(*) as totalCount')
      .addSelect('COUNT(CASE WHEN ai.itemStatus = 3 THEN 1 END) as riskCount')
      .innerJoin('ai.aaJob', 'aj')
      .where('aj.auditDate >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere(isAA)
      .andWhere(
        '(:userId IS NULL OR aj.aaUserId = :userId OR aj.createdBy = :userId)',
        { userId },
      )
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

    const ranked = this.rankBranchesByRisk(rows, limit);

    // ดึงตัวอย่างรายการ "ผิดปกติ" แยกทีละสาขา กัน query รวมแล้วตัด take เดียวแย่ง slot กันข้ามสาขา
    const itemsByBranch = new Map<number, ActionItem[]>();
    await Promise.all(
      ranked.map(async (row) => {
        const riskItems = await this.amItemRepo
          .createQueryBuilder('ai')
          .leftJoinAndSelect('ai.aaJob', 'aj')
          .leftJoinAndSelect('ai.categoryItem', 'cat')
          .where('ai.itemStatus = :risk', { risk: 3 })
          .andWhere('aj.auditDate >= :startDate', { startDate })
          .andWhere('ai.active = :active', { active: true })
          .andWhere('aj.active = :active', { active: true })
          .andWhere(isAA)
          .andWhere('aj.branchId = :branchId', { branchId: row.branchId })
          .andWhere(
            '(:userId IS NULL OR aj.aaUserId = :userId OR aj.createdBy = :userId)',
            { userId },
          )
          .orderBy('ai.updatedAt', 'DESC')
          .take(5)
          .getMany();

        itemsByBranch.set(
          row.branchId,
          riskItems
            .filter((item) => item.aaJob)
            .map((item) => ({
              id: item.itemId,
              jobNo: item.aaJob.jobNo || '',
              branchName: item.aaJob.branchName || '',
              categoryName: item.categoryItem?.categoryName || null,
              categoryCode: item.categoryItem?.categoryCode ?? null,
              status: 'ผิดปกติ',
              daysAgo: this.calculateDaysAgo(item.updatedAt),
              statusColor: 'destructive',
            })),
        );
      }),
    );

    return ranked.map((row) => ({
      branchId: row.branchId,
      branchName: row.branchName,
      issueCount: row.riskCount,
      totalCount: row.total,
      failureRate: row.riskPercent,
      rawRate: row.rawPercent,
      isLowSample: row.isLowSample,
      items: itemsByBranch.get(row.branchId) ?? [],
    }));
  }

  private async getAADocStats(
    dateRange: number,
    userId: number | null,
  ): Promise<AuditStats> {
    const startDate = this.getStartDate(dateRange);
    const isAA = "UPPER(ai.jobSource) = 'AA'";
    const scopeUser =
      '(:userId IS NULL OR aj.aaUserId = :userId OR aj.createdBy = :userId)';

    const result = await this.amItemRepo
      .createQueryBuilder('ai')
      .select([
        'COUNT(CASE WHEN ai.itemStatusEdit = 4 THEN 1 END) AS closedJobs',
        'COUNT(CASE WHEN ai.itemStatusEdit IS NULL OR ai.itemStatusEdit = 2 THEN 1 END) AS pendingCloseCase',
      ])
      .innerJoin('ai.aaJob', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere(isAA)
      .andWhere(scopeUser, { userId })
      .getRawOne<AuditStatsResult>();

    const jobResult = await this.aaJobRepo
      .createQueryBuilder('aj')
      .select([
        'COUNT(*) AS totalJobs',
        'COUNT(CASE WHEN aj.status IS NULL OR aj.status <> 2 THEN 1 END) AS activeJobs',
      ])
      .where('aj.updatedAt >= :startDate', { startDate })
      .andWhere('aj.active = :active', { active: true })
      .andWhere(
        '(:userId IS NULL OR aj.aaUserId = :userId OR aj.createdBy = :userId)',
        { userId },
      )
      .getRawOne<{ totalJobs: string; activeJobs: string }>();

    const overdueThreshold = new Date();
    overdueThreshold.setDate(overdueThreshold.getDate() - 7);
    const overdueItems = await this.amItemRepo
      .createQueryBuilder('ai')
      .innerJoin('ai.aaJob', 'aj')
      .where('(ai.itemStatusEdit IS NULL OR ai.itemStatusEdit <> 4)')
      .andWhere('ai.updatedAt <= :overdueThreshold', { overdueThreshold })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere(isAA)
      .andWhere(scopeUser, { userId })
      .getCount();

    return {
      totalJobs: parseInt(jobResult?.totalJobs || '0', 10),
      activeJobs: parseInt(jobResult?.activeJobs || '0', 10),
      closedJobs: parseInt(result?.closedJobs || '0', 10),
      pendingCloseCase: parseInt(result?.pendingCloseCase || '0', 10),
      overdueItems,
    };
  }

  private async getAADocItemsByStatus(
    dateRange: number,
    statusType: 'NOT_CHECKED' | 'PENDING_CLOSE_CASE',
    userId: number | null,
  ): Promise<ItemList> {
    const startDate = this.getStartDate(dateRange);
    const isAA = "UPPER(ai.jobSource) = 'AA'";
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
      .innerJoin('ai.aaJob', 'aj')
      .where(whereClause)
      .andWhere('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere(isAA)
      .andWhere(
        '(:userId IS NULL OR aj.aaUserId = :userId OR aj.createdBy = :userId)',
        { userId },
      )
      .getCount();

    const items = await this.amItemRepo
      .createQueryBuilder('ai')
      .leftJoinAndSelect('ai.aaJob', 'aj')
      .leftJoinAndSelect('ai.categoryItem', 'cat')
      .where(whereClause)
      .andWhere('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere(isAA)
      .andWhere(
        '(:userId IS NULL OR aj.aaUserId = :userId OR aj.createdBy = :userId)',
        { userId },
      )
      .orderBy('ai.updatedAt', 'DESC')
      .take(50)
      .getMany();

    return {
      items: items.map((item) => ({
        id: item.itemId,
        jobNo: item.aaJob?.jobNo || '',
        branchName: item.aaJob?.branchName || '',
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

  private async getActiveAAJobs(
    dateRange: number,
    userId: number | null,
  ): Promise<ItemList> {
    const startDate = this.getStartDate(dateRange);
    const whereClause = '(aj.status IS NULL OR aj.status <> 2)';
    const scopeUser =
      '(:userId IS NULL OR aj.aaUserId = :userId OR aj.createdBy = :userId)';

    const totalCount = await this.aaJobRepo
      .createQueryBuilder('aj')
      .where(whereClause)
      .andWhere('aj.updatedAt >= :startDate', { startDate })
      .andWhere('aj.active = :active', { active: true })
      .andWhere(scopeUser, { userId })
      .getCount();

    const jobs = await this.aaJobRepo
      .createQueryBuilder('aj')
      .where(whereClause)
      .andWhere('aj.updatedAt >= :startDate', { startDate })
      .andWhere('aj.active = :active', { active: true })
      .andWhere(scopeUser, { userId })
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

  private async getOverdueAAItems(userId: number | null): Promise<ItemList> {
    const overdueThreshold = new Date();
    overdueThreshold.setDate(overdueThreshold.getDate() - 7);
    const isAA = "UPPER(ai.jobSource) = 'AA'";
    const whereClause = '(ai.itemStatusEdit IS NULL OR ai.itemStatusEdit <> 4)';
    const scopeUser =
      '(:userId IS NULL OR aj.aaUserId = :userId OR aj.createdBy = :userId)';

    const totalCount = await this.amItemRepo
      .createQueryBuilder('ai')
      .innerJoin('ai.aaJob', 'aj')
      .where(whereClause)
      .andWhere('ai.updatedAt <= :overdueThreshold', { overdueThreshold })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere(isAA)
      .andWhere(scopeUser, { userId })
      .getCount();

    const items = await this.amItemRepo
      .createQueryBuilder('ai')
      .leftJoinAndSelect('ai.aaJob', 'aj')
      .leftJoinAndSelect('ai.categoryItem', 'cat')
      .where(whereClause)
      .andWhere('ai.updatedAt <= :overdueThreshold', { overdueThreshold })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere(isAA)
      .andWhere(scopeUser, { userId })
      .orderBy('ai.updatedAt', 'ASC')
      .take(50)
      .getMany();

    return {
      items: items.map((item) => ({
        id: item.itemId,
        jobNo: item.aaJob?.jobNo || '',
        branchName: item.aaJob?.branchName || '',
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

  private async getAARecentActivities(
    dateRange: number,
    userId: number | null,
  ): Promise<Activity[]> {
    const startDate = this.getStartDate(dateRange);
    const activities: Activity[] = [];
    const scopeUser =
      '(:userId IS NULL OR aj.aaUserId = :userId OR aj.createdBy = :userId)';

    const [aaComments, otherComments, tagEvents, checklistUpdates] =
      await Promise.all([
        this.aaCommentRepo
          .createQueryBuilder('c')
          .leftJoinAndSelect('c.item', 'ai')
          .leftJoinAndSelect('ai.aaJob', 'aj')
          .where('c.createdAt >= :startDate', { startDate })
          .andWhere('c.active = :active', { active: true })
          .andWhere(scopeUser, { userId })
          .orderBy('c.createdAt', 'DESC')
          .take(5)
          .getMany(),
        this.amOtherCommentRepo
          .createQueryBuilder('c')
          .leftJoinAndSelect('c.item', 'ai')
          .leftJoinAndSelect('ai.aaJob', 'aj')
          .where('c.createdAt >= :startDate', { startDate })
          .andWhere('c.active = :active', { active: true })
          .andWhere(scopeUser, { userId })
          .orderBy('c.createdAt', 'DESC')
          .take(5)
          .getMany(),
        this.amTagRepo
          .createQueryBuilder('t')
          .leftJoinAndSelect('t.item', 'ai')
          .leftJoinAndSelect('ai.aaJob', 'aj')
          .where('t.createdAt >= :startDate', { startDate })
          .andWhere('t.active = :active', { active: true })
          .andWhere(scopeUser, { userId })
          .orderBy('t.createdAt', 'DESC')
          .take(5)
          .getMany(),
        this.amItemRepo
          .createQueryBuilder('ai')
          .leftJoinAndSelect('ai.aaJob', 'aj')
          .where('ai.headerChecklistAt >= :startDate', { startDate })
          .andWhere('ai.active = :active', { active: true })
          .andWhere(scopeUser, { userId })
          .orderBy('ai.headerChecklistAt', 'DESC')
          .take(5)
          .getMany(),
      ]);

    const uniqueUserIds = [
      ...new Set(
        [
          ...aaComments.map((c) => c.userId),
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

    aaComments.forEach((comment) => {
      const userData = comment.userId ? userMap.get(comment.userId) : null;
      activities.push({
        id: `aa-${comment.aaDetailId}`,
        user: userData?.userCode || 'Unknown',
        userCode: userData?.userCode || '',
        action: 'Comment ใน AA Unit',
        jobNo: comment.item?.aaJob?.jobNo || '',
        timestamp: new Date(comment.createdAt),
        type: 'comment',
      });
    });

    otherComments.forEach((comment) => {
      const userData = comment.userId ? userMap.get(comment.userId) : null;
      activities.push({
        id: `aa-other-${comment.otherDetailId}`,
        user: userData?.userCode || 'Unknown',
        userCode: userData?.userCode || '',
        action: 'Comment ใน หน่วยงานที่เกี่ยวข้อง',
        jobNo: comment.item?.aaJob?.jobNo || '',
        timestamp: new Date(comment.createdAt),
        type: 'comment',
      });
    });

    tagEvents.forEach((tag) => {
      const userData = tag.createdBy ? userMap.get(tag.createdBy) : null;
      activities.push({
        id: `aa-tag-${tag.taggedUserId}`,
        user: userData?.userCode || 'Unknown',
        userCode: userData?.userCode || '',
        action: 'แท็กผู้ใช้ในรายการ',
        jobNo: tag.item?.aaJob?.jobNo || '',
        timestamp: new Date(tag.createdAt),
        type: 'create',
      });
    });

    checklistUpdates.forEach((item) => {
      if (!item.headerChecklistAt) return;
      const userData = item.headerChecklistBy
        ? userMap.get(item.headerChecklistBy)
        : null;
      activities.push({
        id: `aa-checklist-${item.itemId}`,
        user: userData?.userCode || 'Unknown',
        userCode: userData?.userCode || '',
        action: 'อัพเดท Checklist',
        jobNo: item.aaJob?.jobNo || '',
        timestamp: new Date(item.headerChecklistAt),
        type: 'update',
      });
    });

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 8);
  }

  /**
   *  Get Audit Dashboard Data
   */
  async getAuditDashboardData(userId: string, dateRange: number) {
    const stats = await this.getAuditStats(dateRange);
    const recentActivities = await this.getRecentActivities(dateRange);
    const branchIssues = await this.getAuditBranchIssues(dateRange);

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
    const pendingChecklist = await this.getAuditPendingChecklist();

    return {
      stats: { audit: stats },
      notCheckedItems,
      activeItems,
      pendingCloseCaseItems,
      overdueItems,
      recentActivities,
      branchIssues,
      pendingChecklist,
    };
  }

  /**
   * รายการใบงาน Audit ที่งานเสร็จแล้ว (item_status_edit = 4) แต่ยังไม่ผ่าน checklist
   * (am_checklist_status ยังว่าง/ยังไม่ทำ) — จัดอันดับตามจำนวนที่ค้างมากสุด
   */
  private async getAuditPendingChecklist(): Promise<PendingChecklistJob[]> {
    const pendingCase = `CASE WHEN (ai.amChecklistStatus IS NULL OR ai.amChecklistStatus = 0) THEN ai.itemId END`;

    const rows = await this.auditItemRepo
      .createQueryBuilder('ai')
      .select('aj.jobId', 'jobId')
      .addSelect('aj.jobNo', 'jobNo')
      .addSelect('aj.branchName', 'branchName')
      .addSelect(`COUNT(DISTINCT ${pendingCase})`, 'pendingCount')
      .addSelect('COUNT(DISTINCT ai.itemId)', 'totalCount')
      .innerJoin('ai.job', 'aj')
      .where('ai.itemStatusEdit = :closedStatus', { closedStatus: 4 })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .groupBy('aj.jobId')
      .addGroupBy('aj.jobNo')
      .addGroupBy('aj.branchName')
      .having(`COUNT(DISTINCT ${pendingCase}) > 0`)
      .orderBy('pendingCount', 'DESC')
      .getRawMany<PendingChecklistResult>();

    return rows.map((row) => ({
      jobId: row.jobId,
      jobNo: row.jobNo,
      branchName: row.branchName,
      pendingCount: parseInt(row.pendingCount, 10),
      totalCount: parseInt(row.totalCount, 10),
    }));
  }

  /**
   * สาขาเสี่ยงสุดฝั่ง Audit — item ที่ itemStatus = 3 (ผิดปกติ) เทียบเป็น %
   * สูตรเดียวกับ Manager/AM/AA
   */
  private async getAuditBranchIssues(
    dateRange: number,
    limit = 5,
  ): Promise<BranchIssue[]> {
    const startDate = this.getStartDate(dateRange);

    // กรองด้วย aj.auditDate (วันที่ตรวจของใบงาน) ไม่ใช่ ai.updatedAt (วันที่แก้ item ล่าสุด)
    // เพราะ item ปกติที่ไม่มีใครแตะหลังสร้างจะมี updatedAt เก่ากว่ารายการที่เพิ่งถูกมาร์คว่าผิดปกติ —
    // ถ้ากรองด้วย updatedAt รายการปกติจะหลุดตัวหารไปทั้งที่ยังอยู่ในใบงานเดียวกัน ทำให้ % เพี้ยนสูงเกินจริง
    const result = await this.auditItemRepo
      .createQueryBuilder('ai')
      .select('aj.branchId', 'branchId')
      .addSelect('aj.branchName', 'branchName')
      .addSelect('COUNT(*) as totalCount')
      .addSelect('COUNT(CASE WHEN ai.itemStatus = 3 THEN 1 END) as riskCount')
      .innerJoin('ai.job', 'aj')
      .where('aj.auditDate >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
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

    const ranked = this.rankBranchesByRisk(rows, limit);

    // ดึงตัวอย่างรายการ "ผิดปกติ" แยกทีละสาขา (ไม่ query รวมกันแล้วตัด take เดียว)
    // เพราะถ้า query รวมแล้วเรียง updatedAt ทั้งหมดก่อนตัด อาจมีสาขาที่กิจกรรมเก่ากว่าโดนสาขาอื่นแย่ง slot ไป
    // ทำให้จำนวนรายการที่โชว์ใน modal น้อยกว่าที่นับจริงใน issueCount (บั๊กที่เจอจริง)
    const itemsByBranch = new Map<number, ActionItem[]>();
    await Promise.all(
      ranked.map(async (row) => {
        const riskItems = await this.auditItemRepo
          .createQueryBuilder('ai')
          .leftJoinAndSelect('ai.job', 'aj')
          .leftJoinAndSelect('ai.categoryItem', 'cat')
          .where('ai.itemStatus = :risk', { risk: 3 })
          .andWhere('aj.auditDate >= :startDate', { startDate })
          .andWhere('ai.active = :active', { active: true })
          .andWhere('aj.active = :active', { active: true })
          .andWhere('aj.branchId = :branchId', { branchId: row.branchId })
          .orderBy('ai.updatedAt', 'DESC')
          .take(5)
          .getMany();

        itemsByBranch.set(
          row.branchId,
          riskItems
            .filter((item) => item.job)
            .map((item) => ({
              id: item.itemId,
              jobNo: item.job.jobNo || '',
              branchName: item.job.branchName || '',
              categoryName: item.categoryItem?.categoryName || null,
              categoryCode: item.categoryItem?.categoryCode ?? null,
              status: 'ผิดปกติ',
              daysAgo: this.calculateDaysAgo(item.updatedAt),
              statusColor: 'destructive',
            })),
        );
      }),
    );

    return ranked.map((row) => ({
      branchId: row.branchId,
      branchName: row.branchName,
      issueCount: row.riskCount,
      totalCount: row.total,
      failureRate: row.riskPercent,
      rawRate: row.rawPercent,
      isLowSample: row.isLowSample,
      items: itemsByBranch.get(row.branchId) ?? [],
    }));
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

  /**
   * การ์ด "สาขาความเสี่ยงสูงสุด" มีตัวกรองช่วงวันที่เป็นของตัวเอง แยกจาก KPI card อื่นๆ ในหน้าเดียวกัน
   * ใช้สูตรเดียวกับ dashboard หลัก แต่ดึง Top 10 เสมอ
   */
  async getBranchRiskRanking(
    moduleType: 'audit' | 'am' | 'aa',
    dateRange: number,
    userId: number | null,
    roleId?: number,
  ): Promise<BranchIssue[]> {
    const isUnrestricted =
      roleId !== undefined && [1, 2, 9, 10].includes(roleId);
    const scopeUserId = isUnrestricted ? null : userId;
    const limit = 10;

    switch (moduleType) {
      case 'am':
        return this.getAMBranchIssues(dateRange, scopeUserId, limit);
      case 'aa':
        return this.getAABranchIssues(dateRange, scopeUserId, limit);
      case 'audit':
      default:
        return this.getAuditBranchIssues(dateRange, limit);
    }
  }

  // ==========================================
  // AM Stats & Items
  // ==========================================

  private async getAMBranchIssues(
    dateRange: number,
    userId: number | null,
    limit = 5,
  ): Promise<BranchIssue[]> {
    const startDate = this.getStartDate(dateRange);

    // ความเสี่ยง = item ที่ itemStatus = 3 (ผิดปกติ) เทียบเป็น % จาก item ทั้งหมด (สูตรเดียวกับ Manager/Audit/AA)
    // กรอง jobSource กัน item ฝั่ง AA หลุดมานับปนกับ AM เพราะ job_id ชนกันได้ (เหมือน getAMPendingChecklist)
    const notAA = "(ai.jobSource IS NULL OR UPPER(ai.jobSource) <> 'AA')";

    // กรองด้วย aj.auditDate (วันที่ตรวจของใบงาน) ไม่ใช่ ai.updatedAt (วันที่แก้ item ล่าสุด)
    // เพราะ item ปกติที่ไม่มีใครแตะหลังสร้างจะมี updatedAt เก่ากว่ารายการที่เพิ่งถูกมาร์คว่าผิดปกติ —
    // ถ้ากรองด้วย updatedAt รายการปกติจะหลุดตัวหารไปทั้งที่ยังอยู่ในใบงานเดียวกัน ทำให้ % เพี้ยนสูงเกินจริง
    const result = await this.amItemRepo
      .createQueryBuilder('ai')
      .select('aj.branchId', 'branchId')
      .addSelect('aj.branchName', 'branchName')
      .addSelect('COUNT(*) as totalCount')
      .addSelect('COUNT(CASE WHEN ai.itemStatus = 3 THEN 1 END) as riskCount')
      .innerJoin('ai.job', 'aj')
      .where('aj.auditDate >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere(notAA)
      .andWhere(
        '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)',
        { userId },
      )
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

    const ranked = this.rankBranchesByRisk(rows, limit);

    // ดึงตัวอย่างรายการ "ผิดปกติ" แยกทีละสาขา กัน query รวมแล้วตัด take เดียวแย่ง slot กันข้ามสาขา
    const itemsByBranch = new Map<number, ActionItem[]>();
    await Promise.all(
      ranked.map(async (row) => {
        const riskItems = await this.amItemRepo
          .createQueryBuilder('ai')
          .leftJoinAndSelect('ai.job', 'aj')
          .leftJoinAndSelect('ai.categoryItem', 'cat')
          .where('ai.itemStatus = :risk', { risk: 3 })
          .andWhere('aj.auditDate >= :startDate', { startDate })
          .andWhere('ai.active = :active', { active: true })
          .andWhere('aj.active = :active', { active: true })
          .andWhere(notAA)
          .andWhere('aj.branchId = :branchId', { branchId: row.branchId })
          .andWhere(
            '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)',
            { userId },
          )
          .orderBy('ai.updatedAt', 'DESC')
          .take(5)
          .getMany();

        itemsByBranch.set(
          row.branchId,
          riskItems
            .filter((item) => item.job)
            .map((item) => ({
              id: item.itemId,
              jobNo: item.job.jobNo || '',
              branchName: item.job.branchName || '',
              categoryName: item.categoryItem?.categoryName || null,
              categoryCode: item.categoryItem?.categoryCode ?? null,
              status: 'ผิดปกติ',
              daysAgo: this.calculateDaysAgo(item.updatedAt),
              statusColor: 'destructive',
            })),
        );
      }),
    );

    return ranked.map((row) => ({
      branchId: row.branchId,
      branchName: row.branchName,
      issueCount: row.riskCount,
      totalCount: row.total,
      failureRate: row.riskPercent,
      rawRate: row.rawPercent,
      isLowSample: row.isLowSample,
      items: itemsByBranch.get(row.branchId) ?? [],
    }));
  }

  private async getAMDocStats(
    dateRange: number,
    userId: number | null,
  ): Promise<AuditStats> {
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
      .andWhere(
        '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)',
        { userId },
      )
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
      .andWhere(
        '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)',
        { userId },
      )
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
      .andWhere(
        '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)',
        { userId },
      )
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
    userId: number | null,
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
      .andWhere(
        '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)',
        { userId },
      )
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
      .andWhere(
        '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)',
        { userId },
      )
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

  private async getActiveAMJobs(
    dateRange: number,
    userId: number | null,
  ): Promise<ItemList> {
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
      .andWhere(
        '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)',
        { userId },
      )
      .getCount();

    const jobs = await this.amJobRepo
      .createQueryBuilder('aj')
      .where(whereClause)
      .andWhere('aj.updatedAt >= :startDate', { startDate })
      .andWhere('aj.active = :active', { active: true })
      .andWhere('aj.positionType IN (:...positionTypes)', {
        positionTypes: ['AM', 'AA'],
      })
      .andWhere(
        '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)',
        { userId },
      )
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

  private async getOverdueAMItems(userId: number | null): Promise<ItemList> {
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
      .andWhere(
        '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)',
        { userId },
      )
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
      .andWhere(
        '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)',
        { userId },
      )
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

    // ความเสี่ยง = item ที่ itemStatus = 3 (ผิดปกติ) เทียบเป็น % จาก item ทั้งหมด
    // ใช้ Bayesian shrinkage ดึงสาขาที่ตรวจน้อยเข้าหาค่าเฉลี่ยรวมของบริษัท (RISK_SHRINKAGE_K)
    // กัน false-positive จากสาขาที่มีตัวอย่างน้อย (เช่น ตรวจ 3 รายการ พลาด 2 = 67% ทั้งที่ข้อมูลน้อยเกินจะสรุป)
    // กรองด้วย aj.auditDate (วันที่ตรวจของใบงาน) ไม่ใช่ ai.updatedAt (วันที่แก้ item ล่าสุด) —
    // ไม่งั้น item ปกติที่ไม่มีใครแตะหลังสร้างจะหลุดตัวหารไปทั้งที่ยังอยู่ในใบงานเดียวกัน ทำให้ % เพี้ยนสูงเกินจริง
    const result = await this.auditItemRepo
      .createQueryBuilder('ai')
      .select([
        'aj.branchId as branchId',
        'aj.branchName as branchName',
        'COUNT(*) as totalCount',
        'COUNT(CASE WHEN ai.itemStatus = 3 THEN 1 END) as riskCount',
      ])
      .innerJoin('ai.job', 'aj')
      .where('aj.auditDate >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
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
      rawRate: row.rawPercent,
      isLowSample: row.isLowSample,
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

  private async getAMRecentActivities(
    dateRange: number,
    userId: number | null,
  ): Promise<Activity[]> {
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
        .andWhere(
          '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)',
          { userId },
        )
        .orderBy('c.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.amAmCommentRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.item', 'ai')
        .leftJoinAndSelect('ai.job', 'aj')
        .where('c.createdAt >= :startDate', { startDate })
        .andWhere('c.active = :active', { active: true })
        .andWhere(
          '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)',
          { userId },
        )
        .orderBy('c.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.amOtherCommentRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.item', 'ai')
        .leftJoinAndSelect('ai.job', 'aj')
        .where('c.createdAt >= :startDate', { startDate })
        .andWhere('c.active = :active', { active: true })
        .andWhere(
          '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)',
          { userId },
        )
        .orderBy('c.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.amTagRepo
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.item', 'ai')
        .leftJoinAndSelect('ai.job', 'aj')
        .where('t.createdAt >= :startDate', { startDate })
        .andWhere('t.active = :active', { active: true })
        .andWhere(
          '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)',
          { userId },
        )
        .orderBy('t.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.amItemRepo
        .createQueryBuilder('ai')
        .leftJoinAndSelect('ai.job', 'aj')
        .where('ai.headerChecklistAt >= :startDate', { startDate })
        .andWhere('ai.active = :active', { active: true })
        .andWhere(
          '(:userId IS NULL OR aj.amUserId = :userId OR aj.createdBy = :userId)',
          { userId },
        )
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

  async getAAChartData(dateRange: number): Promise<AuditChartData[]> {
    const startDate = this.getStartDate(dateRange);
    const isAA = "UPPER(ai.jobSource) = 'AA'";

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
      .innerJoin('ai.aaJob', 'aj')
      .where('ai.updatedAt >= :startDate', { startDate })
      .andWhere('ai.active = :active', { active: true })
      .andWhere('aj.active = :active', { active: true })
      .andWhere(isAA)
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

  // น้ำหนักเสมือน "ของกลาง" ที่ถ่วงเข้าไปทุกสาขา (Bayesian shrinkage)
  // กัน false-positive จากสาขาที่มีตัวอย่างน้อย (เช่น ตรวจ 3 รายการ พลาด 2 = 67% ทั้งที่ข้อมูลน้อยเกินจะสรุป)
  private readonly RISK_SHRINKAGE_K = 10;

  // สาขาที่ตรวจน้อยกว่านี้ถือว่า "ข้อมูลยังน้อย" — % ที่โชว์เป็นค่าปรับ (shrunk) ไม่ใช่ค่านับจริง
  // ต้องบอก frontend ให้ทำเครื่องหมายกำกับ ป้องกันความสับสนเวลา % สูง/ต่ำผิดจากจำนวนรายการที่เห็น
  private readonly LOW_SAMPLE_THRESHOLD = 5;

  /**
   * สูตรความเสี่ยงกลาง ใช้ร่วมกันทุก dashboard (Manager/Audit/AM/AA):
   * risk% = item ที่ itemStatus=3 (ผิดปกติ) ÷ item ทั้งหมด ถ่วงเข้าหาค่าเฉลี่ยรวม
   * เรียง: risk% มาก่อน → เท่ากันดูจำนวนผิดจริง → เท่ากันดูจำนวนตรวจทั้งหมด → เท่ากันดูชื่อสาขา
   */
  private rankBranchesByRisk<
    T extends { branchId: number; branchName: string; total: number; riskCount: number },
  >(
    rows: T[],
    limit: number,
  ): (T & { riskPercent: number; rawPercent: number; isLowSample: boolean })[] {
    const companyTotal = rows.reduce((sum, r) => sum + r.total, 0);
    const companyRisk = rows.reduce((sum, r) => sum + r.riskCount, 0);
    const companyAvgRisk = companyTotal > 0 ? companyRisk / companyTotal : 0;
    const k = this.RISK_SHRINKAGE_K;

    return rows
      .map((row) => {
        const adjustedRisk =
          (row.riskCount + k * companyAvgRisk) / (row.total + k);
        const rawPercent =
          row.total > 0 ? Math.round((row.riskCount / row.total) * 100) : 0;
        return {
          ...row,
          riskPercent: Math.round(adjustedRisk * 100),
          rawPercent,
          isLowSample: row.total < this.LOW_SAMPLE_THRESHOLD,
        };
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
