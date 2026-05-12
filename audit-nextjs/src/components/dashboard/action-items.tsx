// components/dashboard/action-items.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, CheckCircle2, ListTodo } from "lucide-react";
import Link from "next/link";

interface ActionItem {
  id: number;
  jobNo: string;
  branchName: string;
  status: string;
  daysAgo: number;
  statusColor: "default" | "secondary" | "destructive" | "outline";
}

interface ActionItemsProps {
  items: ActionItem[];
  title: string;
  maxItems?: number;
  viewAllLink?: string;
}

export function ActionItems({
  items,
  title,
  maxItems = 5,
  viewAllLink,
}: ActionItemsProps) {
  const displayedItems = items.slice(0, maxItems);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </div>
        {viewAllLink && items.length > maxItems && (
          <Link href={viewAllLink}>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              ดูทั้งหมด
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayedItems.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
              <p className="text-sm text-muted-foreground">ไม่มีงานที่ต้องดำเนินการ</p>
            </div>
          ) : (
            displayedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{item.jobNo}</span>
                    <Badge variant={item.statusColor} className="text-xs">
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.branchName}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{item.daysAgo} วัน</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}