// Version: 4.0.0 | Date: 2025-04-08 15:15:00 | Updated: ใช้ exceljs พร้อม styling เต็มรูปแบบ

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface ExportAuditDetailToExcelProps {
  jobData?: AuditJobData;
  auditItems: AuditItem[];
  disabled?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "link"
    | "destructive"
    | "secondary";
}

function getStatusText(status?: number) {
  switch (status) {
    case 1:
      return "ปกติ";
    case 2:
      return "อยู่ระหว่างดำเนินการ";
    case 3:
      return "ผิดปกติ";
    case 4:
      return "ปิดเคส";
    default:
      return "ไม่ทราบ";
  }
}

function stringifyComments(comments?: AuditComment[]) {
  if (!comments || comments.length === 0) return "-";
  return comments
    .map((c) => `${c.author}\n- ${c.text}`)
    .join("\n\n");
}

export default function ExportAuditDetailToExcel({
  jobData,
  auditItems,
  disabled = false,
  size = "default",
  variant = "outline",
}: ExportAuditDetailToExcelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canExport = !!jobData && auditItems.length > 0 && !disabled;

  const handleExport = async () => {
    if (!jobData || auditItems.length === 0) {
      toast.error("ไม่มีข้อมูลให้ Export");
      return;
    }

    setIsExporting(true);

    try {
      const auditDateText = jobData.auditDate
        ? format(new Date(jobData.auditDate), "dd MMMM yyyy", { locale: th })
        : "";
      
      const auditDateShort = jobData.auditDate
        ? format(new Date(jobData.auditDate), "dd/MM/yyyy", { locale: th })
        : "-";

      // ==================== Create Workbook & Worksheet ====================
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("รายงานการตรวจสอบ");

      // ==================== Define Styles ====================
      const COLORS = {
        primary: "1E40AF",      // Navy Blue
        primaryLight: "E0E7FF", // Light Blue
        labelBg: "F1F5F9",      // Light Gray
        border: "CBD5E1",       // Slate
        text: "0F172A",         // Dark
        white: "FFFFFF",
      };

      const headerStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, size: 14, color: { argb: `FF${COLORS.primary}` } },
        alignment: { horizontal: "center", vertical: "middle" },
      };

      const subHeaderStyle: Partial<ExcelJS.Style> = {
        font: { size: 10, color: { argb: "FF475569" } },
        alignment: { horizontal: "center", vertical: "middle" },
      };

      const sectionTitleStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, size: 12, color: { argb: `FF${COLORS.primary}` } },
        alignment: { horizontal: "center", vertical: "middle" },
      };

      const labelStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, size: 9 },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${COLORS.labelBg}` },
        },
        alignment: { horizontal: "left", vertical: "top" },
        border: {
          top: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          bottom: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          left: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          right: { style: "thin", color: { argb: `FF${COLORS.border}` } },
        },
      };

      const valueStyle: Partial<ExcelJS.Style> = {
        font: { size: 9 },
        alignment: { horizontal: "left", vertical: "top", wrapText: true },
        border: {
          top: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          bottom: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          left: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          right: { style: "thin", color: { argb: `FF${COLORS.border}` } },
        },
      };

      const tableHeaderStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, size: 9, color: { argb: `FF${COLORS.white}` } },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${COLORS.primary}` },
        },
        alignment: { horizontal: "center", vertical: "middle", wrapText: true },
        border: {
          top: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          bottom: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          left: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          right: { style: "thin", color: { argb: `FF${COLORS.border}` } },
        },
      };

      const tableDataStyle: Partial<ExcelJS.Style> = {
        font: { size: 8 },
        alignment: { horizontal: "left", vertical: "top", wrapText: true },
        border: {
          top: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          bottom: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          left: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          right: { style: "thin", color: { argb: `FF${COLORS.border}` } },
        },
      };

      const topicStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, size: 8 },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${COLORS.labelBg}` },
        },
        alignment: { horizontal: "left", vertical: "top", wrapText: true },
        border: {
          top: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          bottom: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          left: { style: "thin", color: { argb: `FF${COLORS.border}` } },
          right: { style: "thin", color: { argb: `FF${COLORS.border}` } },
        },
      };

      // ==================== Set Column Widths ====================
      worksheet.columns = [
        { key: "A", width: 24 },  // หัวข้อ
        { key: "B", width: 14 },  // สถานะ
        { key: "C", width: 40 },  // Audit Comment
        { key: "D", width: 30 },  // AM Details
        { key: "E", width: 30 },  // Other Details
      ];

      let currentRow = 1;

      // ==================== HEADER ====================
      // Row 1: รายงานการตรวจสอบ
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const headerCell = worksheet.getCell(`A${currentRow}`);
      headerCell.value = "รายงานการตรวจสอบ";
      headerCell.style = headerStyle;
      currentRow++;

      // Row 2: สาขา - วันที่ | เลขที่
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const subHeaderCell = worksheet.getCell(`A${currentRow}`);
      subHeaderCell.value = `${jobData.branchName || ''} - ${auditDateText} | เลขที่: ${jobData.jobNo || ""}`;
      subHeaderCell.style = subHeaderStyle;
      currentRow++;

      currentRow++; // blank row

      // ==================== ข้อมูลการตรวจสอบ ====================
      const jobInfo = [
        ["สาขา", jobData.branchName || "-"],
        ["ที่อยู่", jobData.address || "-"],
        ["PM Code", jobData.pmCode || "-"],
        ["วันที่ตรวจสอบ", auditDateShort],
        ["ผู้ตรวจสอบ", jobData.auditor?.fullname || "-"],
        ["ผู้จัดการเขต", jobData.districtManager?.fullname || "-"],
        ["ผู้จัดการสาขา", jobData.branchManager?.fullname || "-"],
        ["ผู้ทำรายการ", jobData.createdByUser?.fullname || "-"],
      ];

      jobInfo.forEach(([label, value]) => {
        const labelCell = worksheet.getCell(`A${currentRow}`);
        labelCell.value = label;
        labelCell.style = labelStyle;

        worksheet.mergeCells(`B${currentRow}:E${currentRow}`);
        const valueCell = worksheet.getCell(`B${currentRow}`);
        valueCell.value = value;
        valueCell.style = valueStyle;

        currentRow++;
      });

      currentRow++; // blank row

      // ==================== สรุปผลการตรวจ ====================
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const sectionCell = worksheet.getCell(`A${currentRow}`);
      sectionCell.value = "สรุปผลการตรวจ";
      sectionCell.style = sectionTitleStyle;
      currentRow++;

      currentRow++; // blank row

      // ==================== Table Header Row 1 ====================
      // ผลการตรวจ audit | สถานีน้ำมัน ... | วันที่
      const headerRow1Cell1 = worksheet.getCell(`A${currentRow}`);
      headerRow1Cell1.value = "ผลการตรวจ audit";
      headerRow1Cell1.style = tableHeaderStyle;

      worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
      const headerRow1Cell2 = worksheet.getCell(`B${currentRow}`);
      headerRow1Cell2.value = `สถานีน้ำมัน ${jobData.branchName || ''}`;
      headerRow1Cell2.style = {
        ...tableHeaderStyle,
        font: { bold: true, size: 10, color: { argb: `FF${COLORS.white}` } },
      };

      const headerRow1Cell3 = worksheet.getCell(`E${currentRow}`);
      headerRow1Cell3.value = auditDateText;
      headerRow1Cell3.style = tableHeaderStyle;
      currentRow++;

      // ==================== Table Header Row 2 ====================
      const headers = ["หัวข้อ", "สถานะที่ตรวจพบ", "สิ่งที่ตรวจพบ\n(Audit Comment)", "รายละเอียดจาก\n(AM Comment)", "รายละเอียดจากผู้อื่น\n(Other Comment)"];
      headers.forEach((header, idx) => {
        const cell = worksheet.getCell(`${String.fromCharCode(65 + idx)}${currentRow}`);
        cell.value = header;
        cell.style = tableHeaderStyle;
      });
      currentRow++;

      // ==================== Data Rows ====================
      auditItems.forEach((item) => {
        const rowCells = [
          item.category_name || "ไม่ระบุ",
          getStatusText(item.item_status),
          stringifyComments(item.note_1),
          stringifyComments(item.note_2),
          stringifyComments(item.note_3),
        ];

        rowCells.forEach((value, idx) => {
          const cell = worksheet.getCell(`${String.fromCharCode(65 + idx)}${currentRow}`);
          cell.value = value;
          cell.style = idx === 0 ? topicStyle : idx === 1 ? {
            ...tableDataStyle,
            alignment: { horizontal: "center", vertical: "top", wrapText: true }
          } : tableDataStyle;
        });

        currentRow++;
      });

      currentRow += 2; // blank rows

      // ==================== Signature Section ====================
      const sigRow = currentRow;
      
      // Signature lines
      const sig1Cell = worksheet.getCell(`B${sigRow}`);
      sig1Cell.value = "____________________";
      sig1Cell.alignment = { horizontal: "center" };

      const sig2Cell = worksheet.getCell(`D${sigRow}`);
      sig2Cell.value = "____________________";
      sig2Cell.alignment = { horizontal: "center" };
      currentRow++;

      // Names
      const name1Cell = worksheet.getCell(`B${currentRow}`);
      name1Cell.value = jobData.auditor?.fullname || "-";
      name1Cell.alignment = { horizontal: "center" };

      const name2Cell = worksheet.getCell(`D${currentRow}`);
      name2Cell.value = jobData.branchManager?.fullname || "-";
      name2Cell.alignment = { horizontal: "center" };
      currentRow++;

      // Titles
      const title1Cell = worksheet.getCell(`B${currentRow}`);
      title1Cell.value = "Audit";
      title1Cell.font = { bold: true };
      title1Cell.alignment = { horizontal: "center" };

      const title2Cell = worksheet.getCell(`D${currentRow}`);
      title2Cell.value = "ผู้จัดการสถานีบริการ";
      title2Cell.font = { bold: true };
      title2Cell.alignment = { horizontal: "center" };

      // ==================== Generate & Download ====================
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      const safeJobNo = String(jobData.jobNo || "AUDIT").replace(/[\\/:*?\"<>|]/g, "-");
      const branchLabel = jobData.branchId ? `_Branch${jobData.branchId}` : "";
      const filename = `Audit_Report_${safeJobNo}${branchLabel}_${timestamp}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Export Excel สำเร็จ", { description: `ไฟล์: ${filename}` });
    } catch (error) {
      console.error("Error exporting audit detail to Excel:", error);
      toast.error("ไม่สามารถ Export Excel ได้", { description: getErrorMessage(error, "กรุณาลองใหม่อีกครั้ง") });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการ Export Excel</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการ Export รายงานการตรวจสอบ
              {jobData?.branchName ? ` "${jobData.branchName}"` : ""} เป็นไฟล์ Excel ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isExporting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลัง Export...
                </>
              ) : (
                "ดาวน์โหลด"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant={variant}
                size={size}
                onClick={() => setConfirmOpen(true)}
                disabled={!canExport || isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลัง Export...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export Excel
                  </>
                )}
              </Button>
            </span>
          </TooltipTrigger>
          {!canExport && !disabled && (
            <TooltipContent>
              <p>ไม่มีข้อมูลให้ Export</p>
            </TooltipContent>
          )}
          {disabled && (
            <TooltipContent>
              <p>ไม่สามารถ Export ได้ในขณะนี้</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </>
  );
}