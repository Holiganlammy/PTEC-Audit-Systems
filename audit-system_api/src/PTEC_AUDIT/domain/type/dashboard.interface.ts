// types/dashboard.ts

// ==========================================
// Common Types
// ==========================================

export type StatusColor = 'default' | 'secondary' | 'destructive' | 'outline';

export type ActivityType = 'comment' | 'approve' | 'create' | 'update';

// ==========================================
// Action Item
// ==========================================

export interface ActionItem {
  id: number;
  jobNo: string;
  branchName: string;
  status: string;
  daysAgo: number;
  statusColor: StatusColor;
}

export interface ItemList {
  items: ActionItem[];
  totalCount: number;
}

// ==========================================
// Activity
// ==========================================

export interface Activity {
  id: string;
  user: string;
  userCode: string;
  action: string;
  jobNo: string;
  timestamp: Date | string;
  type: ActivityType;
}

// ==========================================
// Branch Issue
// ==========================================

export interface BranchIssue {
  branchId: number;
  branchName: string;
  issueCount: number;
  failureRate: number;
}

// ==========================================
// Branch Ranking
// ==========================================

export interface BranchRanking {
  branchId: number;
  branchName: string;
  score: number;
  issueCount: number;
  rank: number;
}

// ==========================================
// Stats - AM Dashboard
// ==========================================

export interface AMStats {
  notChecked: number;
  pending: number;
  passed: number;
  failed: number;
  needFix: number;
  totalIssues: number;
}

// ==========================================
// Stats - Audit Dashboard
// ==========================================

export interface AuditStats {
  totalJobs: number;
  activeJobs: number;
  closedJobs: number;
  waitingAM: number;
  amRejected: number;
}

// ==========================================
// Stats - User Dashboard
// ==========================================

export interface UserStats {
  taggedMe: number;
  waitingMyComment: number;
  completed: number;
}

// ==========================================
// Stats - Manager Dashboard
// ==========================================

export interface ManagerStats {
  totalBranches: number;
  branchesWithIssues: number;
  normalBranches: number;
  averageScore: number;
}

// ==========================================
// Dashboard Response - AM
// ==========================================

export interface AMDashboardResponse {
  stats: {
    am: AMStats;
  };
  notCheckedItems: ItemList;
  failedItems: ItemList;
  needFixItems: ItemList;
  recentActivities: Activity[];
  branchIssues: BranchIssue[];
}

// ==========================================
// Dashboard Response - Audit
// ==========================================

export interface AuditDashboardResponse {
  stats: {
    audit: AuditStats;
  };
  notCheckedItems: ItemList;
  activeItems: ItemList;
  waitingAMItems: ItemList;
  amRejectedItems: ItemList;
  recentActivities: Activity[];
}

// ==========================================
// Dashboard Response - User
// ==========================================

export interface UserDashboardResponse {
  stats: {
    user: UserStats;
  };
  taggedItems: ItemList;
  pendingComments: ItemList;
  completedItems: ItemList;
  recentActivities: Activity[];
}

// ==========================================
// Dashboard Response - Manager
// ==========================================

export interface ManagerDashboardResponse {
  stats: {
    manager: ManagerStats;
  };
  actionItems: ActionItem[];
  recentActivities: Activity[];
  branchRankings: BranchRanking[];
}

// ==========================================
// API Response Wrapper
// ==========================================

export interface DashboardApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}
