// app/home/manager-dashboard.tsx - Complete with Dialog Buttons
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
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

interface ManagerStats {
  totalBranches: number;
  branchesWithIssues: number;
  normalBranches: number;
  averageScore: number;
}

interface BranchRanking {
  branchId: number;
  branchName: string;
  score: number;
  issueCount: number;
  totalCount: number;
  rank: number;
}

interface ActionItem {
  id: number;
  jobNo: string;
  branchName: string;
  categoryName: string;
  categoryCode: string | null;
  status: string;
  daysAgo: number;
  statusColor: "default" | "secondary" | "destructive" | "outline";
}

interface ItemList {
  items: ActionItem[];
  totalCount: number;
}

interface ManagerDashboardResponse {
  stats: {
    manager: ManagerStats;
  };
  recentActivities: Array<{
    id: string;
    user: string;
    userCode: string;
    action: string;
    jobNo: string;
    timestamp: Date;
    type: "comment" | "approve" | "create" | "update";
  }>;
  branchRankings: BranchRanking[];
  branchesWithIssues: ItemList;
  normalBranches: ItemList;
}

interface AMChartData {
  date: string;
  passed: number;
  failed: number;
  needFix: number;
}

export function ManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7");
  const [chartTimeRange, setChartTimeRange] = useState("7");
  const [dashboardData, setDashboardData] = useState<ManagerDashboardResponse | null>(
    null
  );
  const [chartData, setChartData] = useState<AMChartData[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dashboardApi.getManagerDashboard(dateRange);
      setDashboardData(data);
    } catch (error) {
      console.error("Failed to fetch Manager dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const fetchChartData = useCallback(async () => {
    try {
      setChartLoading(true);
      const data = await dashboardApi.getManagerChart(chartTimeRange);
      setChartData(data);
    } catch (error) {
      console.error("Failed to fetch Manager chart:", error);
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

  const stats = dashboardData?.stats?.manager || {
    totalBranches: 0,
    branchesWithIssues: 0,
    normalBranches: 0,
    averageScore: 0,
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        notificationCount={stats.branchesWithIssues}
        onRefresh={() => {
          fetchData();
          fetchChartData();
        }}
        onDateRangeChange={setDateRange}
        dateRange={dateRange}
        showFilters
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="สาขาทั้งหมด"
          value={stats.totalBranches}
          icon={Building2}
          description="Total Branches"
          iconClassName="text-blue-600 dark:text-blue-400"
        />
        <KPICard
          title="สาขาที่มีปัญหา"
          value={stats.branchesWithIssues}
          icon={TrendingDown}
          description="Branches with Issues"
          iconClassName="text-red-600 dark:text-red-400"
        />
        <KPICard
          title="สาขาปกติ"
          value={stats.normalBranches}
          icon={TrendingUp}
          description="Normal Branches"
          iconClassName="text-green-600 dark:text-green-400"
        />
        <KPICard
          title="คะแนนเฉลี่ย"
          value={stats.averageScore}
          icon={BarChart3}
          description="Average Score"
          iconClassName="text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Chart - สถานะการตรวจทั้งหมด */}
      {chartLoading ? (
        <Skeleton className="h-[350px] w-full" />
      ) : (
        <AMInspectionChart
          data={chartData}
          timeRange={chartTimeRange}
          onTimeRangeChange={setChartTimeRange}
        />
      )}

      {/* Dialog Buttons - 2 ปุ่ม */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionItemsDialog
          title="สาขาที่มีปัญหา"
          items={dashboardData?.branchesWithIssues?.items || []}
          totalCount={dashboardData?.branchesWithIssues?.totalCount || 0}
          triggerIcon={<AlertTriangle className="h-4 w-4" />}
          triggerLabel="ดูรายชื่อสาขาที่มีปัญหา"
          triggerClassName="w-full h-20 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700"
        />

        <ActionItemsDialog
          title="สาขาปกติ"
          items={dashboardData?.normalBranches?.items || []}
          totalCount={dashboardData?.normalBranches?.totalCount || 0}
          triggerIcon={<CheckCircle2 className="h-4 w-4" />}
          triggerLabel="ดูรายชื่อสาขาปกติ"
          triggerClassName="w-full h-20 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700"
        />
      </div>

      {/* Branch Rankings + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Branch Rankings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <CardTitle className="text-base font-semibold">
                อันดับสาขาความเสี่ยงสูงสุด (Top 10)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.branchRankings?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  ไม่มีข้อมูลอันดับสาขา
                </p>
              ) : (
                dashboardData?.branchRankings?.map((branch) => (
                  <div
                    key={branch.branchId}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-bold text-lg ${
                          branch.rank <= 3
                            ? "text-red-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {branch.rank}
                      </span>
                      <div>
                        <p className="font-medium text-sm">
                          {branch.branchName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {branch.issueCount} รายการมีปัญหา จาก{" "}
                          {branch.totalCount} รายการที่ตรวจ
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        branch.score >= 60
                          ? "destructive"
                          : branch.score >= 30
                          ? "default"
                          : "secondary"
                      }
                    >
                      เสี่ยง {branch.score}% ({branch.issueCount}/
                      {branch.totalCount})
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <RecentActivity
          activities={dashboardData?.recentActivities || []}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-[350px] w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
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