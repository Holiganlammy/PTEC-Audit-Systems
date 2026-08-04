// components/dashboard/pending-checklist-widget.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardCheck, ExternalLink } from "lucide-react";

export interface PendingChecklistJob {
  jobId: number;
  jobNo: string;
  branchName: string;
  pendingCount: number;
  totalCount: number;
}

interface PendingChecklistWidgetProps {
  jobs: PendingChecklistJob[];
  basePath: string;
  formType?: string;
  /** จำนวนแถวที่โชว์แบบย่อในการ์ด ก่อนกด "ดูทั้งหมด" */
  previewCount?: number;
}

function JobRow({
  job,
  basePath,
  formType,
  onNavigate,
}: {
  job: PendingChecklistJob;
  basePath: string;
  formType?: string;
  onNavigate?: () => void;
}) {
  const params = new URLSearchParams({ jobNo: job.jobNo });
  if (formType) params.set("formType", formType);

  return (
    <Link
      href={`${basePath}?${params.toString()}`}
      onClick={onNavigate}
      className="flex items-center justify-between gap-3 p-2.5 rounded-md border bg-card hover:bg-accent/50 transition-colors group"
    >
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{job.jobNo}</p>
        <p className="text-xs text-muted-foreground truncate">
          {job.branchName}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Badge variant="secondary" className="text-xs whitespace-nowrap">
          เช็คแล้ว {job.totalCount - job.pendingCount}/{job.totalCount}
        </Badge>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

/**
 * Widget ขนาดกะทัดรัดแสดงใบงานที่รอ checklist — โชว์ preview สั้นๆ ในการ์ด
 * และมีปุ่ม "ดูทั้งหมด" เปิด dialog แสดงครบทุกใบที่ยังไม่ได้ checklist
 */
export function PendingChecklistWidget({
  jobs,
  basePath,
  formType,
  previewCount = 8,
}: PendingChecklistWidgetProps) {
  const [open, setOpen] = useState(false);
  const previewJobs = jobs.slice(0, previewCount);
  const totalPendingItems = jobs.reduce((sum, j) => sum + j.pendingCount, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-sm font-semibold">
              ใบงานที่รอ Checklist
            </CardTitle>
          </div>
          {jobs.length > 0 && (
            <Badge variant="outline" className="text-purple-600 border-purple-300">
              {jobs.length} ใบ / {totalPendingItems} รายการ
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            ไม่มีใบงานที่รอ Checklist
          </p>
        ) : (
          <>
            {previewJobs.map((job) => (
              <JobRow key={job.jobId} job={job} basePath={basePath} formType={formType} />
            ))}
            {jobs.length > previewCount && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => setOpen(true)}
              >
                ดูทั้งหมด ({jobs.length})
              </Button>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              ใบงานที่รอ Checklist ทั้งหมด ({jobs.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-2">
              {jobs.map((job) => (
                <JobRow
                  key={job.jobId}
                  job={job}
                  basePath={basePath}
                  formType={formType}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
