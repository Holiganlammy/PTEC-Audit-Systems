// components/dashboard/dashboard-header.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
import { Bell, Download, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
  title?: string;
  notificationCount?: number;
  onRefresh?: () => void;
  onExport?: () => void;
  onSearch?: (query: string) => void;
  onDateRangeChange?: (range: string) => void;
  dateRange?: string;
  showFilters?: boolean;
}

export function DashboardHeader({
  title,
  // notificationCount = 0,
  onRefresh,
  onExport,
  onSearch,
  onDateRangeChange,
  dateRange = "7",
  showFilters = true,
}: DashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <div className="space-y-4">
      {/* Title Row */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        
        <div className="flex items-center gap-2">
          {/* Notifications */}
          {/* <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {notificationCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-2">
                <p className="text-sm font-semibold mb-2">การแจ้งเตือน</p>
                {notificationCount === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    ไม่มีการแจ้งเตือนใหม่
                  </p>
                ) : (
                  <div className="space-y-2">
                    <DropdownMenuItem>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm">@You ใน AUD-001</p>
                        <p className="text-xs text-muted-foreground">5 นาทีที่แล้ว</p>
                      </div>
                    </DropdownMenuItem>
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu> */}

          {/* Export */}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}

          {/* Refresh */}
          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Filters Row */}
      {showFilters && (
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหางาน / สาขา / หมายเลข..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Date Range */}
          <Select onValueChange={onDateRangeChange} value={dateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="ช่วงเวลา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 วันที่แล้ว</SelectItem>
              <SelectItem value="30">30 วันที่แล้ว</SelectItem>
              <SelectItem value="90">3 เดือนที่แล้ว</SelectItem>
              <SelectItem value="all">ทั้งหมด</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}