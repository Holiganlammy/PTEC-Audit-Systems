// components/dashboard/audit-status-chart.tsx
"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

interface AuditChartData {
  date: string;
  active: number;
  closed: number;
  waitingAM: number;
}

interface AuditStatusChartProps {
  data: AuditChartData[];
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
}

const chartConfig = {
  active: {
    label: "กำลังดำเนินการ",
    color: "hsl(var(--chart-3))", // ส้ม
  },
  closed: {
    label: "ปิดเคสแล้ว",
    color: "hsl(var(--chart-2))", // เขียว
  },
  waitingAM: {
    label: "รอ AM ตรวจ",
    color: "hsl(var(--chart-4))", // เหลือง
  },
} satisfies ChartConfig;

export function AuditStatusChart({
  data,
  timeRange,
  onTimeRangeChange,
}: AuditStatusChartProps) {
  const isMobile = useIsMobile();

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>สถานะงาน Audit</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            จำนวนงานต่อวัน (กำลังทำ / ปิดเคส / รอ AM)
          </span>
          <span className="@[540px]/card:hidden">สถานะงานต่อวัน</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={onTimeRangeChange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90">90 วัน</ToggleGroupItem>
            <ToggleGroupItem value="30">30 วัน</ToggleGroupItem>
            <ToggleGroupItem value="7">7 วัน</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger
              className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="7 วัน" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90" className="rounded-lg">
                90 วัน
              </SelectItem>
              <SelectItem value="30" className="rounded-lg">
                30 วัน
              </SelectItem>
              <SelectItem value="7" className="rounded-lg">
                7 วัน
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillActive" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-active)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-active)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillClosed" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-closed)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-closed)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillWaitingAM" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-waitingAM)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-waitingAM)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("th-TH", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="waitingAM"
              type="natural"
              fill="url(#fillWaitingAM)"
              stroke="var(--color-waitingAM)"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              dataKey="closed"
              type="natural"
              fill="url(#fillClosed)"
              stroke="var(--color-closed)"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              dataKey="active"
              type="natural"
              fill="url(#fillActive)"
              stroke="var(--color-active)"
              strokeWidth={2}
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}