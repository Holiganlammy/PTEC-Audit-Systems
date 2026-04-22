// Version: 2.0.0 | Date: 2025-04-08 15:45:00 | Updated: ใช้ exceljs พร้อม styling สวยงาม + รองรับ Export ทั้งหมด

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
import ExcelJS from "exceljs";
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
  selectedRows?: Record<string, boolean>;
  onExportComplete?: () => void;
  disabled?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
}

function getStatusText(status: number): string {
  const statusMap: Record<number, string> = {
    1: "อยู่ระหว่างดำเนินการ",
    2: "ดำเนินการเสร็จสิ้น",
  };
  return statusMap[status] || "-";
}

export default function ExportToExcel({
  data,
  selectedRows = {},
  onExportComplete,
  disabled = false,
  size = "lg",
  variant = "outline",
}: ExportToExcelProps) {
  const [isExporting, setIsExporting] = useState(false);

  // Get selected or all data
  const getExportData = () => {
    const selectedIds = Object.keys(selectedRows).filter((key) => selectedRows[key]);
    
    if (selectedIds.length > 0) {
      return data.filter((job) => selectedIds.includes(job.jobId.toString()));
    }
    
    return data;
  };

  const handleExport = async () => {
    const exportData = getExportData();
    
    if (exportData.length === 0) {
      toast.error("ไม่มีข้อมูลให้ Export");
      return;
    }

    setIsExporting(true);

    try {
      // ==================== Create Workbook & Worksheet ====================
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Audit Jobs List");

      // ==================== Define Colors ====================
      const COLORS = {
        headerBg: "1E40AF",      // Navy Blue
        headerText: "FFFFFF",    // White
        labelBg: "F1F5F9",       // Light Gray
        border: "CBD5E1",        // Slate
        evenRow: "F8FAFC",       // Very Light Gray
        oddRow: "FFFFFF",        // White
        statusInProgress: "FEF3C7", // Yellow
        statusCompleted: "D1FAE5",  // Green
      };

      // ==================== Define Column Structure ====================
      worksheet.columns = [
        { key: "no", width: 6 },           // #
        { key: "jobNo", width: 20 },       // Job No
        { key: "branch", width: 25 },      // Branch
        { key: "auditDate", width: 15 },   // Audit Date
        { key: "status", width: 20 },      // Status
        { key: "auditor", width: 25 },     // Auditor
        { key: "districtManager", width: 25 }, // District Manager
        { key: "branchManager", width: 25 },   // Branch Manager
        { key: "createdBy", width: 25 },   // Created By
        { key: "createdAt", width: 18 },   // Created At
      ];

      // ==================== Header Row ====================
      const headerRow = worksheet.addRow([
        "#",
        "Job No",
        "Branch",
        "Audit Date",
        "Status",
        "Auditor",
        "District Manager",
        "Branch Manager",
        "Created By",
        "Created At",
      ]);

      // Style header row
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, size: 11, color: { argb: `FF${COLORS.headerText}` } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${COLORS.headerBg}` },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          bottom: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          left: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          right: { style: "thin", color: { argb: `FF${COLORS.border}` } },
        };
      });

      headerRow.height = 25;

      // ==================== Data Rows ====================
      exportData.forEach((job, index) => {
        const rowNumber = index + 1;
        const isEvenRow = index % 2 === 0;

        const row = worksheet.addRow([
          rowNumber,
          job.jobNo || "-",
          job.branchName || "-",
          job.auditDate ? format(new Date(job.auditDate), "dd/MM/yyyy", { locale: th }) : "-",
          getStatusText(job.status),
          job.auditor?.fullname || "-",
          job.districtManager?.fullname || "-",
          job.branchManager?.fullname || "-",
          job.createdByUser?.fullname || "-",
          job.createdAt ? format(new Date(job.createdAt), "dd/MM/yyyy HH:mm", { locale: th }) : "-",
        ]);

        // Style data rows
        row.eachCell((cell, colNumber) => {
          // Font
          cell.font = { size: 10 };

          // Alignment
          if (colNumber === 1) {
            // # column - center
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else {
            // Others - left
            cell.alignment = { horizontal: "left", vertical: "middle" };
          }

          // Background color
          if (colNumber === 5) {
            // Status column - special colors
            const statusBgColor = job.status === 2 ? COLORS.statusCompleted : COLORS.statusInProgress;
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: `FF${statusBgColor}` },
            };
            cell.font = { ...cell.font, bold: true };
          } else {
            // Alternating row colors
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: `FF${isEvenRow ? COLORS.evenRow : COLORS.oddRow}` },
            };
          }

          // Border
          cell.border = {
            top: { style: "thin", color: { argb: `FF${COLORS.border}` } },
            bottom: { style: "thin", color: { argb: `FF${COLORS.border}` } },
            left: { style: "thin", color: { argb: `FF${COLORS.border}` } },
            right: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          };
        });

        row.height = 20;
      });

      // ==================== Freeze Header Row ====================
      worksheet.views = [
        { state: "frozen", ySplit: 1 }
      ];

      // ==================== Auto-filter ====================
      worksheet.autoFilter = {
        from: "A1",
        to: `J1`,
      };

      // ==================== Generate & Download ====================
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      const filename = `Audit_Jobs_List_${timestamp}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      const selectedCount = Object.keys(selectedRows).filter((key) => selectedRows[key]).length;
      const exportedCount = exportData.length;

      toast.success("Export Excel สำเร็จ", {
        description: selectedCount > 0
          ? `Export ${exportedCount} รายการที่เลือก`
          : `Export ทั้งหมด ${exportedCount} รายการ`,
      });

      // Call onExportComplete callback
      if (onExportComplete) {
        onExportComplete();
      }
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("ไม่สามารถ Export Excel ได้", {
        description: "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const selectedCount = Object.keys(selectedRows).filter((key) => selectedRows[key]).length;
  const hasSelection = selectedCount > 0;
  const canExport = data.length > 0 && !disabled;

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
                  {hasSelection && (
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
        <TooltipContent>
          <p>
            {hasSelection
              ? `Export ${selectedCount} รายการที่เลือก`
              : `Export ทั้งหมด ${data.length} รายการ`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}