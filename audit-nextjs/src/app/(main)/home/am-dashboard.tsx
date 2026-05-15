// app/home/am-dashboard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  FileQuestion,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ActionItemsDialog } from "@/components/dashboard/action-items-dialog";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AMInspectionChart } from "@/components/dashboard/am-inspection-chart";
import { dashboardApi } from "@/lib/api/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DashboardResponse } from "@/components/dashboard/types/dashboard-am";

interface AMChartData {
  date: string;
  passed: number;
  failed: number;
  needFix: number;
}

export function AMDashboard() {
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7");
  const [chartTimeRange, setChartTimeRange] = useState("7");
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(
    null
  );
  const [chartData, setChartData] = useState<AMChartData[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dashboardApi.getAMDashboard(dateRange);
      setDashboardData(data);
    } catch (error) {
      console.error("Failed to fetch AM dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const fetchChartData = useCallback(async () => {
    try {
      setChartLoading(true);
      const data = await dashboardApi.getAMChart(chartTimeRange);
      setChartData(data);
    } catch (error) {
      console.error("Failed to fetch AM chart:", error);
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

  const stats = dashboardData?.stats?.am || {
    notChecked: 0,
    pending: 0,
    passed: 0,
    failed: 0,
    needFix: 0,
    totalIssues: 0,
  };

  // แยก Action Items ตามสถานะ
  const notCheckedItems =
    dashboardData?.notCheckedItems?.items || [];
  const failedItems =
    dashboardData?.failedItems?.items || [];
  const needFixItems =
    dashboardData?.needFixItems?.items || [];

  return (
    <div className="space-y-6">
      <DashboardHeader
        notificationCount={stats.totalIssues}
        onRefresh={() => {
          fetchData();
          fetchChartData();
        }}
        onDateRangeChange={setDateRange}
        dateRange={dateRange}
        showFilters
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <KPICard
          title="ยังไม่ได้ตรวจ"
          value={stats.notChecked}
          icon={FileQuestion}
          description="Not Checked"
          iconClassName="text-gray-600 dark:text-gray-400"
        />
        <KPICard
          title="รอตรวจสอบ"
          value={stats.pending}
          icon={Clock}
          description="Pending"
          iconClassName="text-yellow-600 dark:text-yellow-400"
        />
        <KPICard
          title="ผ่าน"
          value={stats.passed}
          icon={CheckCircle2}
          description="Pass"
          iconClassName="text-green-600 dark:text-green-400"
        />
        <KPICard
          title="ไม่ผ่าน"
          value={stats.failed}
          icon={XCircle}
          description="Fail"
          iconClassName="text-red-600 dark:text-red-400"
        />
        <KPICard
          title="ต้องแก้ไข"
          value={stats.needFix}
          icon={AlertCircle}
          description="Fix Required"
          iconClassName="text-orange-600 dark:text-orange-400"
        />
        <KPICard
          title="รวมปัญหา"
          value={stats.totalIssues}
          icon={AlertTriangle}
          description="Total Issues"
          iconClassName="text-red-600 dark:text-red-400"
        />
      </div>

      {/* Chart - วางเหนือ Dialog Buttons */}
      {chartLoading ? (
        <Skeleton className="h-[350px] w-full" />
      ) : (
        <AMInspectionChart
          data={chartData}
          timeRange={chartTimeRange}
          onTimeRangeChange={setChartTimeRange}
        />
      )}

      {/* Dialog Buttons - 3 ปุ่ม */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionItemsDialog
          title="รายการที่ยังไม่ได้ตรวจ"
          items={notCheckedItems}
          totalCount={dashboardData?.notCheckedItems?.totalCount || 0}
          triggerIcon={<FileQuestion className="h-4 w-4" />}
          triggerLabel="เอกสารที่ยังไม่ได้ตรวจ"
          triggerClassName="w-full h-20 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700"
        />
        
        <ActionItemsDialog
          title="รายการที่ไม่ผ่าน"
          items={failedItems}
          totalCount={dashboardData?.failedItems?.totalCount || 0}
          triggerIcon={<XCircle className="h-4 w-4" />}
          triggerLabel="เอกสารที่มีรายการไม่ผ่าน"
          triggerClassName="w-full h-20 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700"
        />
        
        <ActionItemsDialog
          title="รายการที่ต้องแก้ไข"
          items={needFixItems}
          totalCount={dashboardData?.needFixItems?.totalCount || 0}
          triggerIcon={<AlertCircle className="h-4 w-4" />}
          triggerLabel="เอกสารที่มีรายการต้องแก้ไข"
          triggerClassName="w-full h-20 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700"
        />
      </div>

      {/* สาขาที่มีปัญหา + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                          {branch.issueCount} รายการมีปัญหา
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-[350px] w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
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