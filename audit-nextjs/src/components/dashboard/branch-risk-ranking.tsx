// components/dashboard/branch-risk-ranking.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Info, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { dashboardApi } from "@/lib/api/dashboard";

interface BranchRiskItemDetail {
  id: number;
  jobNo: string;
  branchName: string;
  categoryName: string | null;
  status: string;
  daysAgo: number;
}

interface BranchRiskItem {
  branchId: number;
  branchName: string;
  issueCount: number;
  totalCount: number;
  failureRate: number;
  rawRate: number;
  isLowSample: boolean;
  items: BranchRiskItemDetail[];
}

interface BranchRiskRankingProps {
  module: "audit" | "am" | "aa";
  title?: string;
  /** path ของหน้าเอกสารเพื่อกดดูรายการจริง เช่น /audit/edit_document */
  basePath?: string;
  formType?: string;
}

function riskVariant(score: number): "destructive" | "default" | "secondary" {
  if (score >= 60) return "destructive";
  if (score >= 30) return "default";
  return "secondary";
}

/**
 * การ์ดอันดับสาขาเสี่ยงสุด — ใช้ร่วมกันทุก dashboard (Audit/AM/AA)
 * มีตัวกรองช่วงวันที่เป็นของตัวเอง แยกจาก KPI card อื่นในหน้าเดียวกัน
 * risk% มาจาก itemStatus=3 (ผิดปกติ) ถ่วง Bayesian shrinkage ฝั่ง backend แล้ว
 * กดแต่ละสาขาดูรายการเอกสารจริงที่ถูกนับได้ เพื่อตรวจสอบที่มาของตัวเลข
 */
export function BranchRiskRanking({
  module,
  title = "สาขาความเสี่ยงสูงสุด (Top 10)",
  basePath = "/audit/edit_document",
  formType,
}: BranchRiskRankingProps) {
  const [dateRange, setDateRange] = useState("30");
  const [branches, setBranches] = useState<BranchRiskItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [openBranchId, setOpenBranchId] = useState<number | null>(null);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dashboardApi.getBranchRisk(module, dateRange);
      setBranches(data);
    } catch (error) {
      console.error("Failed to fetch branch risk ranking:", error);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [module, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleItemClick = (itemId: number, jobNo: string) => {
    setOpenBranchId(null);
    const params = new URLSearchParams({ jobNo, highlightItemId: String(itemId) });
    if (formType) params.set("formType", formType);
    router.push(`${basePath}?${params.toString()}`);
  };

  const openBranch = branches?.find((b) => b.branchId === openBranchId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs leading-relaxed">
                  คำนวณจาก: (จำนวนรายการที่ตรวจพบผิดปกติ ÷ รายการที่ตรวจทั้งหมด) ×
                  100% ของแต่ละสาขา โดยถ่วงน้ำหนักสาขาที่ตรวจตัวอย่างน้อยเข้าหาค่าเฉลี่ยรวม
                  กันตัวเลขเพี้ยนจากฐานข้อมูลน้อยเกินไป — สาขาที่ตัวเลขมี &quot;~&quot; นำหน้า
                  หรือมี badge &quot;ข้อมูลน้อย&quot; หมายถึง % ถูกปรับแล้วเพราะข้อมูลยังน้อยเกินจะสรุป
                  กดแต่ละสาขาเพื่อดูรายการเอกสารจริงที่ถูกนับ
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="เลือกช่วงเวลา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 วันล่าสุด</SelectItem>
              <SelectItem value="30">30 วันล่าสุด</SelectItem>
              <SelectItem value="90">3 เดือนล่าสุด</SelectItem>
              <SelectItem value="0">ทั้งหมด (ไม่จำกัดวัน)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : !branches || branches.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            ไม่มีข้อมูลความเสี่ยงของสาขาในช่วงเวลานี้
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {branches.map((branch, index) => (
              <button
                key={branch.branchId}
                type="button"
                onClick={() => setOpenBranchId(branch.branchId)}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 hover:border-accent-foreground/20 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`shrink-0 flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                      index < 3
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm truncate">{branch.branchName}</p>
                      {branch.isLowSample && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-medium px-1.5 py-0.5">
                                ข้อมูลน้อย
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs leading-relaxed">
                              ตรวจแค่ {branch.totalCount} รายการ ยังสรุปแน่ชัดไม่ได้ — ตัวเลข ~
                              {branch.failureRate}% ถูกปรับเข้าใกล้ค่าเฉลี่ยของทุกสาขาแล้ว
                              (ค่าจริงจากข้อมูลที่มีคือ {branch.rawRate}%)
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {branch.issueCount}/{branch.totalCount} รายการผิดปกติ
                    </p>
                  </div>
                </div>
                <Badge variant={riskVariant(branch.failureRate)} className="shrink-0">
                  {branch.isLowSample ? `~${branch.failureRate}%` : `${branch.failureRate}%`}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialog รายการเอกสารของสาขาที่กด */}
      <Dialog open={openBranchId !== null} onOpenChange={(open) => !open && setOpenBranchId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              รายการผิดปกติ — {openBranch?.branchName}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[55vh] pr-4">
            <div className="space-y-2">
              {!openBranch || openBranch.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  ไม่มีตัวอย่างรายการให้แสดง
                </p>
              ) : (
                openBranch.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item.id, item.jobNo)}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors group"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {item.categoryName ?? item.branchName}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.jobNo}</p>
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
    </Card>
  );
}
