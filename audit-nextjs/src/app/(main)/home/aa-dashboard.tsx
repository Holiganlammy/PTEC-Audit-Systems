// app/home/aa-dashboard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { PendingChecklistWidget } from "@/components/dashboard/pending-checklist-widget";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { dashboardApi } from "@/lib/api/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import type { AADashboardResponse } from "@/components/dashboard/types/dashboard-aa";

export function AADashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<AADashboardResponse | null>(
    null
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dashboardApi.getAADashboard();
      setDashboardData(data);
    } catch (error) {
      console.error("Failed to fetch AA dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="AA Dashboard"
        onRefresh={fetchData}
        showFilters={false}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PendingChecklistWidget
          jobs={dashboardData?.pendingChecklist || []}
          basePath="/areamanage/edit_document"
          formType="AA"
        />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
