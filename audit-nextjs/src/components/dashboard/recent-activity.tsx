// components/dashboard/recent-activity.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { MessageSquare, CheckCircle2, PlusCircle, Edit3, FileText } from "lucide-react";

interface Activity {
  id: string;
  user: string;
  userCode: string;
  action: string;
  jobNo: string;
  timestamp: Date;
  type: "comment" | "approve" | "create" | "update";
}

interface RecentActivityProps {
  activities: Activity[];
  maxItems?: number;
}

const activityConfig: Record<
  Activity["type"],
  { icon: typeof MessageSquare; color: string }
> = {
  comment: { icon: MessageSquare, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  approve: { icon: CheckCircle2, color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  create: { icon: PlusCircle, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  update: { icon: Edit3, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
};

export function RecentActivity({ activities, maxItems = 5 }: RecentActivityProps) {
  const displayedActivities = activities.slice(0, maxItems);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <CardTitle className="text-base font-semibold">กิจกรรมล่าสุด</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayedActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              ยังไม่มีกิจกรรม
            </p>
          ) : (
            displayedActivities.map((activity) => {
              const config = activityConfig[activity.type];
              const Icon = config.icon;
              
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <Avatar className={`h-8 w-8 ${config.color}`}>
                    <AvatarFallback className={config.color}>
                      <Icon className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user}</span>{" "}
                      <span className="text-muted-foreground">{activity.action}</span>{" "}
                      <span className="font-medium">{activity.jobNo}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.timestamp, {
                        addSuffix: true,
                        locale: th,
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}