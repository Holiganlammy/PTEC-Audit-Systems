// types/dashboard-aa.ts

import type { PendingChecklistJob } from "@/components/dashboard/pending-checklist-widget";

export interface AADashboardResponse {
  pendingChecklist?: PendingChecklistJob[];
}
