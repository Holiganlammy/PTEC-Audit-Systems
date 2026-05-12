// components/dashboard/quick-actions.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface QuickAction {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  iconClassName?: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <Link key={index} href={action.href}>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "rounded-lg p-2",
                    action.iconClassName || "bg-primary/10"
                  )}>
                    <Icon className={cn(
                      "h-5 w-5",
                      action.iconClassName ? "text-foreground" : "text-primary"
                    )} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-sm">{action.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}