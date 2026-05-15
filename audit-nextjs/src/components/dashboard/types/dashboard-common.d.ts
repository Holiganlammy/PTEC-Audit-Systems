// types/dashboard-common.ts

export type StatusColor = "default" | "secondary" | "destructive" | "outline";

export type ActivityType = "comment" | "approve" | "create" | "update";

export interface ActionItemData {
  id: number;
  jobNo: string;
  branchName: string;
  categoryCode: string | null;
  categoryName: string | null;
  status: string;
  daysAgo: number;
  statusColor: StatusColor;
}

export interface PaginatedActionItems {
  items: ActionItemData[];
  totalCount: number;
}

export interface ActivityData {
  id: string;
  user: string;
  userCode: string;
  action: string;
  jobNo: string;
  timestamp: Date | string;
  type: ActivityType;
}

export interface BranchIssue {
  branchId: number;
  branchName: string;
  issueCount: number;
  failureRate: number;
}

export interface BranchRanking {
  branchId: number;
  branchName: string;
  score: number;
  issueCount: number;
  rank: number;
}

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