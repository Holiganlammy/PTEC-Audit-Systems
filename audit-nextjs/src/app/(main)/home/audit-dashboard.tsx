// app/home/audit-dashboard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Briefcase,
  Activity,
  Clock,
  CheckCircle2,
  FileQuestion,
  AlertTriangle,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ActionItemsDialog } from "@/components/dashboard/action-items-dialog";
import { PendingChecklistWidget } from "@/components/dashboard/pending-checklist-widget";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AuditStatusChart } from "@/components/dashboard/audit-status-chart";
import { dashboardApi } from "@/lib/api/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditDashboardResponse } from "@/components/dashboard/types/dashboard-audit";

interface AuditChartData {
  date: string;
  active: number;
  closed: number;
  waitingAM: number;
}

export function AuditDashboard() {
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7");
  const [chartTimeRange, setChartTimeRange] = useState("7");
  const [dashboardData, setDashboardData] = useState<AuditDashboardResponse | null>(
    null
  );
  const [chartData, setChartData] = useState<AuditChartData[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dashboardApi.getAuditDashboard(dateRange);
      setDashboardData(data);
    } catch (error) {
      console.error("Failed to fetch Audit dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const fetchChartData = useCallback(async () => {
    try {
      setChartLoading(true);
      const data = await dashboardApi.getAuditChart(chartTimeRange);
      setChartData(data);
    } catch (error) {
      console.error("Failed to fetch Audit chart:", error);
    } finally {
      setChartLoading(false);
    }
  }, [chartTimeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const stats = dashboardData?.stats?.audit || {
    totalJobs: 0,
    activeJobs: 0,
    closedJobs: 0,
    pendingCloseCase: 0,
    overdueItems: 0,
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        notificationCount={stats.pendingCloseCase}
        onRefresh={() => {
          fetchData();
          fetchChartData();
        }}
        onDateRangeChange={setDateRange}
        dateRange={dateRange}
        showFilters
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="งานทั้งหมด"
          value={stats.totalJobs}
          icon={Briefcase}
          description="Total Jobs"
          iconClassName="text-blue-600 dark:text-blue-400"
        />
        <KPICard
          title="เอกสารที่กำลังดำเนินการ"
          value={stats.activeJobs}
          icon={Activity}
          description="Active Documents"
          iconClassName="text-orange-600 dark:text-orange-400"
        />
        <KPICard
          title="รายการที่ปิดเคสแล้ว"
          value={stats.closedJobs}
          icon={CheckCircle2}
          description="Closed"
          iconClassName="text-green-600 dark:text-green-400"
        />
        <KPICard
          title="รายการที่รอปิดเคส"
          value={stats.pendingCloseCase}
          icon={Clock}
          description="Pending Items"
          iconClassName="text-yellow-600 dark:text-yellow-400"
        />
        <KPICard
          title="ค้างเกิน 7 วัน"
          value={stats.overdueItems}
          icon={AlertTriangle}
          description="Overdue (7+ days)"
          iconClassName="text-red-600 dark:text-red-400"
        />
      </div>

      {/* Chart - วางเหนือ Dialog Buttons */}
      {chartLoading ? (
        <Skeleton className="h-[350px] w-full" />
      ) : (
        <AuditStatusChart
          data={chartData}
          timeRange={chartTimeRange}
          onTimeRangeChange={setChartTimeRange}
        />
      )}

      {/* Dialog Buttons - 4 ปุ่ม */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionItemsDialog
          title="รายการที่ยังไม่ได้ตรวจ"
          items={dashboardData?.notCheckedItems?.items || []}
          totalCount={dashboardData?.notCheckedItems?.totalCount || 0}
          triggerIcon={<FileQuestion className="h-4 w-4 mr-2" />}
          triggerClassName="w-full h-20 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700"
        />

        <ActionItemsDialog
          title="เอกสารที่กำลังดำเนินการ"
          items={dashboardData?.activeItems?.items || []}
          totalCount={dashboardData?.activeItems?.totalCount || 0}
          triggerIcon={<Activity className="h-4 w-4 mr-2" />}
          triggerClassName="w-full h-20 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700"
        />

        <ActionItemsDialog
          title="รายการที่รอปิดเคส"
          items={dashboardData?.pendingCloseCaseItems?.items || []}
          totalCount={dashboardData?.pendingCloseCaseItems?.totalCount || 0}
          triggerIcon={<Clock className="h-4 w-4 mr-2" />}
          triggerClassName="w-full h-20 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700"
        />

        <ActionItemsDialog
          title="รายการค้างเกิน 7 วัน"
          items={dashboardData?.overdueItems?.items || []}
          totalCount={dashboardData?.overdueItems?.totalCount || 0}
          triggerIcon={<AlertTriangle className="h-4 w-4 mr-2" />}
          triggerClassName="w-full h-20 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700"
        />

      </div>

      {/* รอ Checklist + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PendingChecklistWidget
          jobs={dashboardData?.pendingChecklist || []}
          basePath="/audit/edit_document"
        />

        <RecentActivity
          activities={
            dashboardData?.recentActivities?.map((activity) => ({
              ...activity,
              timestamp:
                activity.timestamp instanceof Date
                  ? activity.timestamp
                  : new Date(activity.timestamp),
            })) || []
          }
          maxItems={10}
        />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-[350px] w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}