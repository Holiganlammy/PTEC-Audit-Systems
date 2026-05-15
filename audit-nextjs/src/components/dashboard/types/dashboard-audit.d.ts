// types/dashboard-audit.ts

import type { PaginatedActionItems, ActivityData } from "./dashboard-common";

export interface AuditStats {
  totalJobs: number;
  activeJobs: number;
  closedJobs: number;
  waitingAM: number;
  amRejected: number;
}

export interface AuditDashboardResponse {
  stats: {
    audit: AuditStats;
  };
  notCheckedItems: PaginatedActionItems;
  activeItems: PaginatedActionItems;
  waitingAMItems: PaginatedActionItems;
  amRejectedItems: PaginatedActionItems;
  recentActivities: ActivityData[];
}