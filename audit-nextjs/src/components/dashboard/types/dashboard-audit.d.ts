// types/dashboard-audit.ts

import type { PaginatedActionItems, ActivityData } from "./dashboard-common";

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
}