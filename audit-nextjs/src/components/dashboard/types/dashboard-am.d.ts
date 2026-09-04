// types/dashboard.ts

import type { PendingChecklistJob } from "@/components/dashboard/pending-checklist-widget";
import type { ActionItemData } from "@/components/dashboard/types/dashboard-common";

export interface DashboardKPI {
  title: string;
  value: string | number;
  icon: string;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
}

export interface DashboardStats {
  // AM Stats
  am?: {
    totalJobs: number;
    activeJobs: number;
    closedJobs: number;
    pendingCloseCase: number;
    overdueItems: number;
  };

  // AA Stats
  aa?: {
    totalJobs: number;
    activeJobs: number;
    closedJobs: number;
    pendingCloseCase: number;
    overdueItems: number;
  };

  // Audit Stats
  audit?: {
    totalJobs: number;
    activeJobs: number;
    waitingAM: number;
    issueJobs: number;
    closedJobs: number;
  };

  // User Stats
  user?: {
    taggedMe: number;
    waitingMyComment: number;
    completed: number;
  };

  // Manager Stats
  manager?: {
    totalBranches: number;
    branchesWithIssues: number;
    normalBranches: number;
    averageScore: number;
  };
}

export interface BranchRanking {
  branchId: number;
  branchName: string;
  score: number;
  issueCount: number;
  rank: number;
}

export interface ActionItemData {
  id: number;
  jobNo: string;
  branchName: string;
  status: string;
  daysAgo: number;
  statusColor: "default" | "secondary" | "destructive" | "outline";
  categoryCode: string | null;
  categoryName: string | null;
}

export interface ActivityData {
  id: string;
  user: string;
  userCode: string;
  action: string;
  jobNo: string;
  timestamp: Date;
  type: "comment" | "approve" | "create" | "update";
}

export interface PaginatedActionItems {
  items: ActionItemData[];
  totalCount: number;
}

export interface BranchIssue {
  branchId: number;
  branchName: string;
  issueCount: number;
  totalCount: number;
  failureRate: number;
  items: ActionItemData[]; // ตัวอย่างรายการที่ผิดปกติจริง กดดูย้อนไปที่เอกสารได้
}

export interface DashboardResponse {
  stats: DashboardStats;
  actionItems: ActionItemData[];
  recentActivities: ActivityData[];
  branchRankings?: BranchRanking[];
  branchIssues?: BranchIssue[];
  notCheckedItems?: PaginatedActionItems;
  activeItems?: PaginatedActionItems;
  pendingCloseCaseItems?: PaginatedActionItems;
  overdueItems?: PaginatedActionItems;
  pendingChecklist?: PendingChecklistJob[];
}