// types/dashboard-audit.ts

import type { PaginatedActionItems, ActivityData } from "./dashboard-common";
import type { PendingChecklistJob } from "@/components/dashboard/pending-checklist-widget";
import type { BranchIssue } from "@/components/dashboard/types/dashboard-am";

export interface AuditStats {
  totalJobs: number;
  activeJobs: number;
  closedJobs: number;
  pendingCloseCase: number;
  overdueItems: number;
}

export interface AuditDashboardResponse {
  stats: {
    audit: AuditStats;
  };
  notCheckedItems: PaginatedActionItems;
  activeItems: PaginatedActionItems;
  pendingCloseCaseItems: PaginatedActionItems;
  overdueItems: PaginatedActionItems;
  recentActivities: ActivityData[];
  pendingChecklist?: PendingChecklistJob[];
  branchIssues?: BranchIssue[];
}