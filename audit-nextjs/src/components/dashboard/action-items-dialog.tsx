// components/dashboard/action-items-dialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";

interface ActionItem {
  id: number;
  jobNo: string;
  branchName: string;
  categoryCode: string | null;
  categoryName: string | null;
  status: string;
  daysAgo: number;
  statusColor: "default" | "secondary" | "destructive" | "outline";
}

interface ActionItemsDialogProps {
  title: string;
  items: ActionItem[];
  totalCount: number;
  triggerIcon?: React.ReactNode;
  triggerLabel?: string;
  triggerClassName?: string;
  titleHeader?: string;
  basePath?: string;
  formType?: string;
}

export function ActionItemsDialog({
  title,
  items,
  totalCount,
  triggerIcon,
  triggerLabel,
  triggerClassName,
  titleHeader,
  basePath = "/audit/edit_document",
  formType,
}: ActionItemsDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleItemClick = (itemId: number, jobNo: string) => {
    setOpen(false);
    const params = new URLSearchParams({ jobNo, highlightItemId: String(itemId) });
    if (formType) params.set("formType", formType);
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName}>
          <span className="flex flex-col items-center gap-1 w-full">
            {titleHeader && <p>{titleHeader}</p>}
            <span className="flex items-center gap-1.5">
              {triggerIcon}
              <span className="font-semibold text-[11px] sm:text-xs md:text-sm leading-tight">{triggerLabel ?? title}</span>
            </span>
            <span className="text-[10px] sm:text-xs font-normal opacity-75">ดูทั้งหมด ({totalCount})</span>
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                ไม่มีรายการ
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item.id, item.jobNo)}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors group"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.categoryName ?? item.branchName}</span>
                      <Badge variant={item.statusColor} className="text-xs">
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.jobNo}
                      <span className="ml-2 text-muted-foreground/70">· {item.branchName}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{item.daysAgo} วัน</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}