// app/home/aa-dashboard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Briefcase,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ActionItemsDialog } from "@/components/dashboard/action-items-dialog";
import { PendingChecklistWidget } from "@/components/dashboard/pending-checklist-widget";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AuditStatusChart } from "@/components/dashboard/audit-status-chart";
import { dashboardApi } from "@/lib/api/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AADashboardResponse } from "@/components/dashboard/types/dashboard-aa";

interface AAChartData {
  date: string;
  active: number;
  closed: number;
  waitingAM: number;
}

export function AADashboard() {
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7");
  const [chartTimeRange, setChartTimeRange] = useState("7");
  const [dashboardData, setDashboardData] = useState<AADashboardResponse | null>(
    null
  );
  const [chartData, setChartData] = useState<AAChartData[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dashboardApi.getAADashboard(dateRange);
      setDashboardData(data);
    } catch (error) {
      console.error("Failed to fetch AA dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const fetchChartData = useCallback(async () => {
    try {
      setChartLoading(true);
      const data = await dashboardApi.getAAChart(chartTimeRange);
      setChartData(data);
    } catch (error) {
      console.error("Failed to fetch AA chart:", error);
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

  const stats = dashboardData?.stats?.aa || {
    totalJobs: 0,
    activeJobs: 0,
    closedJobs: 0,
    pendingCloseCase: 0,
    overdueItems: 0,
  };

  // แยก Action Items ตามสถานะ
  const notCheckedItems = dashboardData?.notCheckedItems?.items || [];
  const activeItems = dashboardData?.activeItems?.items || [];
  const pendingCloseCaseItems = dashboardData?.pendingCloseCaseItems?.items || [];
  const overdueItems = dashboardData?.overdueItems?.items || [];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="AA Dashboard"
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

      {/* Chart */}
      {chartLoading ? (
        <Skeleton className="h-[350px] w-full" />
      ) : (
        <AuditStatusChart
          data={chartData}
          timeRange={chartTimeRange}
          onTimeRangeChange={setChartTimeRange}
          title="สถานะงาน AA"
          description="จำนวนงานต่อวัน (กำลังทำ / ปิดเคส / รอ Checker)"
          descriptionMobile="สถานะงานต่อวัน"
        />
      )}

      {/* Dialog Buttons - 4 ปุ่ม */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionItemsDialog
          title="รายการที่ยังไม่ได้ตรวจ"
          items={notCheckedItems}
          totalCount={dashboardData?.notCheckedItems?.totalCount || 0}
          triggerIcon={<FileQuestion className="h-4 w-4 mr-2" />}
          triggerClassName="w-full h-20 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700"
          basePath="/areamanage/edit_document"
          formType="AA"
        />

        <ActionItemsDialog
          title="เอกสารที่กำลังดำเนินการ"
          items={activeItems}
          totalCount={dashboardData?.activeItems?.totalCount || 0}
          triggerIcon={<Activity className="h-4 w-4 mr-2" />}
          triggerClassName="w-full h-20 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700"
          basePath="/areamanage/edit_document"
          formType="AA"
        />

        <ActionItemsDialog
          title="รายการที่รอปิดเคส"
          items={pendingCloseCaseItems}
          totalCount={dashboardData?.pendingCloseCaseItems?.totalCount || 0}
          triggerIcon={<Clock className="h-4 w-4 mr-2" />}
          triggerClassName="w-full h-20 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700"
          basePath="/areamanage/edit_document"
          formType="AA"
        />

        <ActionItemsDialog
          title="รายการค้างเกิน 7 วัน"
          items={overdueItems}
          totalCount={dashboardData?.overdueItems?.totalCount || 0}
          triggerIcon={<AlertTriangle className="h-4 w-4 mr-2" />}
          triggerClassName="w-full h-20 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700"
          basePath="/areamanage/edit_document"
          formType="AA"
        />
      </div>

      {/* สาขาที่มีปัญหา + รอ Checklist + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* สาขาที่มีปัญหา */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <CardTitle className="text-base font-semibold">
                สาขาที่มีปัญหามากที่สุด (Top 5)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.branchIssues?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  ไม่มีสาขาที่มีปัญหา
                </p>
              ) : (
                dashboardData?.branchIssues?.map((branch, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg text-red-600">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">
                          {branch.branchName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {branch.issueCount} จาก {branch.totalCount} รายการมีปัญหา
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive">{branch.failureRate}%</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* รอ Checklist */}
        <PendingChecklistWidget
          jobs={dashboardData?.pendingChecklist || []}
          basePath="/areamanage/edit_document"
          formType="AA"
        />

        {/* Recent Activities */}
        <RecentActivity
          activities={dashboardData?.recentActivities || []}
          maxItems={8}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
