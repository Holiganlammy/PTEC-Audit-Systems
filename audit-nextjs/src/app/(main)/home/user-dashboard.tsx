// app/home/user-dashboard.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Tag,
  MessageSquare,
  AtSign,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ActionItemsDialog } from "@/components/dashboard/action-items-dialog";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { UserActivityChart } from "@/components/dashboard/user-activity-chart";
import { dashboardApi } from "@/lib/api/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserDashboardResponse } from "@/components/dashboard/types/dashboard-user";

interface UserChartData {
  date: string;
  total: number;
}

export function UserDashboard() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7");
  const [chartTimeRange, setChartTimeRange] = useState("7");
  const [dashboardData, setDashboardData] = useState<UserDashboardResponse | null>(
    null
  );
  const [chartData, setChartData] = useState<UserChartData[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const userId = String(session?.user?.UserID ?? "");
      const data = await dashboardApi.getUserDashboard(userId, dateRange);
      setDashboardData(data);
    } catch (error) {
      console.error("Failed to fetch User dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, session?.user?.UserID]);

  const fetchChartData = useCallback(async () => {
    try {
      setChartLoading(true);
      const userId = String(session?.user?.UserID ?? "");
      const data = await dashboardApi.getUserChart(userId, chartTimeRange);
      setChartData(data);
    } catch (error) {
      console.error("Failed to fetch User chart:", error);
    } finally {
      setChartLoading(false);
    }
  }, [chartTimeRange, session?.user?.UserID]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const stats = dashboardData?.stats?.user || {
    taggedMe: 0,
    myComments: 0,
    mentioned: 0,
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Dashboard"
        notificationCount={stats.mentioned}
        onRefresh={() => {
          fetchData();
          fetchChartData();
        }}
        onDateRangeChange={setDateRange}
        dateRange={dateRange}
        showFilters
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KPICard
          title="Tag ใน Item"
          value={stats.taggedMe}
          icon={Tag}
          description="Tagged in Items"
          iconClassName="text-blue-600 dark:text-blue-400"
        />
        <KPICard
          title="Comment ของฉัน"
          value={stats.myComments}
          icon={MessageSquare}
          description="My Comments"
          iconClassName="text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Chart - วางไว้เหนือ Dialog Buttons */}
      {chartLoading ? (
        <Skeleton className="h-[350px] w-full" />
      ) : (
        <UserActivityChart
          data={chartData}
          timeRange={chartTimeRange}
          onTimeRangeChange={setChartTimeRange}
        />
      )}

      {/* Dialog Buttons - 3 ปุ่ม */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionItemsDialog
          title="Tag ใน Item"
          items={dashboardData?.taggedItems?.items || []}
          totalCount={dashboardData?.taggedItems?.totalCount || 0}
          triggerIcon={<Tag className="h-4 w-4 mr-2" />}
          triggerClassName="w-full h-20 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700"
          titleHeader="รายการที่ถูก Tag ใน Item"
        />

        <ActionItemsDialog
          title="Comment ของฉัน"
          items={dashboardData?.myComments?.items || []}
          totalCount={dashboardData?.myComments?.totalCount || 0}
          triggerIcon={<MessageSquare className="h-4 w-4 mr-2" />}
          triggerClassName="w-full h-20 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700"
          titleHeader="รายการ Comment ของฉัน"
        />

        <ActionItemsDialog
          title="Mention (@) ฉัน"
          items={dashboardData?.mentioned?.items || []}
          totalCount={dashboardData?.mentioned?.totalCount || 0}
          triggerIcon={<AtSign className="h-4 w-4 mr-2" />}
          triggerClassName="w-full h-20 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700"
          titleHeader="รายการ Mention (@) ฉัน"
        />
      </div>

      {/* Recent Activities */}
      {/* <div className="grid grid-cols-1 gap-6">
        <RecentActivity
          activities={(dashboardData?.recentActivities || []).map((activity) => ({
            ...activity,
            timestamp: typeof activity.timestamp === 'string' ? new Date(activity.timestamp) : activity.timestamp,
          }))}
          maxItems={10}
        />
      </div> */}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-[350px] w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}