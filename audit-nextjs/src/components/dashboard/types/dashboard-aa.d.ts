// types/dashboard-aa.ts

import type { PendingChecklistJob } from "@/components/dashboard/pending-checklist-widget";
import type {
  DashboardStats,
  ActionItemData,
  ActivityData,
  PaginatedActionItems,
  BranchIssue,
} from "@/components/dashboard/types/dashboard-am";

export interface AADashboardResponse {
  stats?: DashboardStats;
  actionItems?: ActionItemData[];
  recentActivities?: ActivityData[];
  branchIssues?: BranchIssue[];
  notCheckedItems?: PaginatedActionItems;
  activeItems?: PaginatedActionItems;
  pendingCloseCaseItems?: PaginatedActionItems;
  overdueItems?: PaginatedActionItems;
  pendingChecklist?: PendingChecklistJob[];
}
