// Version: 1.0.0 | Date: 2025-04-07 18:15:00 | Updated: Export to Excel Component with XLSX Library and Enhanced Features

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface AuditList {
  jobId: number;
  jobNo: string;
  branchId: number;
  branchName: string;
  auditDate: string;
  status: number;
  statusInfo?: {
    auditStatusId: number;
    statusName: string;
  };
  auditor?: {
    userCode: string;
    fullname: string;
    email: string;
  };
  districtManager?: {
    userCode: string;
    fullname: string;
    email: string;
  };
  branchManager?: {
    userCode: string;
    fullname: string;
    email: string;
  };
  createdByUser?: {
    userCode: string;
    fullname: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

interface ExportToExcelProps {
  data: AuditList[];
  selectedRows: Record<string, boolean>;
  onExportComplete?: () => void;
  disabled?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
}

export default function ExportToExcel({
  data,
  selectedRows,
  onExportComplete,
  disabled = false,
  size = "lg",
  variant = "outline",
}: ExportToExcelProps) {
  const [isExporting, setIsExporting] = useState(false);

  // Count selected rows
  const selectedCount = Object.values(selectedRows).filter(Boolean).length;
  const canExport = selectedCount > 0 && !disabled;

  const handleExport = () => {
    const selectedJobIds = Object.keys(selectedRows).filter((key) => selectedRows[key]);
    
    if (selectedJobIds.length === 0) {
      toast.error("กรุณาเลือกรายการที่ต้องการ Export");
      return;
    }

    setIsExporting(true);

    try {
      // Filter selected jobs
      const selectedJobs = data.filter((job) => 
        selectedJobIds.includes(job.jobId.toString())
      );

      // Prepare data for Excel
      const excelData = selectedJobs.map((job, index) => ({
        "ลำดับ": index + 1,
        "Job No": job.jobNo || "-",
        "สาขา": job.branchName || "-",
        "วันที่ตรวจสอบ": job.auditDate 
          ? format(new Date(job.auditDate), "dd/MM/yyyy", { locale: th })
          : "-",
        "สถานะ": job.statusInfo?.statusName || 
          (job.status === 2 ? "ดำเนินการเสร็จสิ้น" : "อยู่ระหว่างดำเนินการ"),
        "Auditor (รหัส)": job.auditor?.userCode || "-",
        "Auditor (ชื่อ)": job.auditor?.fullname || "-",
        "ผู้จัดการเขต (รหัส)": job.districtManager?.userCode || "-",
        "ผู้จัดการเขต (ชื่อ)": job.districtManager?.fullname || "-",
        "ผู้จัดการสาขา (รหัส)": job.branchManager?.userCode || "-",
        "ผู้จัดการสาขา (ชื่อ)": job.branchManager?.fullname || "-",
        "ผู้ทำรายการ (รหัส)": job.createdByUser?.userCode || "-",
        "ผู้ทำรายการ (ชื่อ)": job.createdByUser?.fullname || "-",
        "วันที่สร้าง": job.createdAt
          ? format(new Date(job.createdAt), "dd/MM/yyyy HH:mm", { locale: th })
          : "-",
        "วันที่แก้ไขล่าสุด": job.updatedAt
          ? format(new Date(job.updatedAt), "dd/MM/yyyy HH:mm", { locale: th })
          : "-",
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Jobs");

      // Set column widths
      const columnWidths = [
        { wch: 8 },  // ลำดับ
        { wch: 20 }, // Job No
        { wch: 30 }, // สาขา
        { wch: 15 }, // วันที่ตรวจสอบ
        { wch: 25 }, // สถานะ
        { wch: 15 }, // Auditor (รหัส)
        { wch: 25 }, // Auditor (ชื่อ)
        { wch: 18 }, // ผู้จัดการเขต (รหัส)
        { wch: 25 }, // ผู้จัดการเขต (ชื่อ)
        { wch: 18 }, // ผู้จัดการสาขา (รหัส)
        { wch: 25 }, // ผู้จัดการสาขา (ชื่อ)
        { wch: 18 }, // ผู้ทำรายการ (รหัส)
        { wch: 25 }, // ผู้ทำรายการ (ชื่อ)
        { wch: 20 }, // วันที่สร้าง
        { wch: 20 }, // วันที่แก้ไขล่าสุด
      ];
      worksheet['!cols'] = columnWidths;

      // Style header row
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddress]) continue;
        
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4472C4" } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }

      // Generate filename with timestamp
      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      const filename = `Audit_Jobs_Export_${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(workbook, filename);

      toast.success(`Export สำเร็จ ${selectedJobs.length} รายการ`, {
        description: `ไฟล์: ${filename}`,
      });

      // Callback after export
      if (onExportComplete) {
        onExportComplete();
      }
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("ไม่สามารถ Export ได้", {
        description: "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant={variant}
              size={size}
              onClick={handleExport}
              disabled={!canExport || isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  กำลัง Export...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-5 w-5" />
                  Export to Excel
                  {selectedCount > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="ml-2 bg-primary text-primary-foreground"
                    >
                      {selectedCount}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </span>
        </TooltipTrigger>
        {!canExport && !disabled && (
          <TooltipContent>
            <p>กรุณาเลือกรายการที่ต้องการ Export ก่อน</p>
          </TooltipContent>
        )}
        {disabled && (
          <TooltipContent>
            <p>ไม่สามารถ Export ได้ในขณะนี้</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}