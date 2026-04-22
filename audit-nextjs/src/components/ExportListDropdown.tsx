"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, FileText, FileSpreadsheet, Loader2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { loadSarabunFont } from "@/lib/font/THSarabunPSK";

interface AuditList {
  jobId: number;
  jobNo: string;
  branchId: number;
  branchName: string;
  auditDate: string;
  status: number;
  statusInfo?: { auditStatusId: number; statusName: string };
  auditor?: { userCode: string; fullname: string; email: string };
  districtManager?: { userCode: string; fullname: string; email: string };
  branchManager?: { userCode: string; fullname: string; email: string };
  createdByUser?: { userCode: string; fullname: string; email: string };
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

interface ExportListDropdownProps {
  data: AuditList[];
  selectedRows?: Record<string, boolean>;
  onExportComplete?: () => void;
  disabled?: boolean;
}

function getStatusText(status: number): string {
  return { 1: "อยู่ระหว่างดำเนินการ", 2: "ดำเนินการเสร็จสิ้น" }[status] || "-";
}

export default function ExportListDropdown({
  data,
  selectedRows = {},
  onExportComplete,
  disabled = false,
}: ExportListDropdownProps) {
  const selectedIds = Object.keys(selectedRows).filter((k) => selectedRows[k]);
  const selectedCount = selectedIds.length;

  const getExportData = () =>
    selectedCount > 0
      ? data.filter((job) => selectedIds.includes(job.jobId.toString()))
      : data;

  const canExport = selectedCount > 0 && !disabled;

  // ── PDF state ──────────────────────────────────────────────────
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; filename: string } | null>(null);

  useEffect(() => {
    return () => { if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url); };
  }, [pdfPreview?.url]);

  // ── Excel state ────────────────────────────────────────────────
  const [isExcelExporting, setIsExcelExporting] = useState(false);
  const [isExcelConfirmOpen, setIsExcelConfirmOpen] = useState(false);

  const isAnyExporting = isPdfExporting || isExcelExporting;

  // ── PDF export ─────────────────────────────────────────────────
  const handlePdfExport = async () => {
    const exportData = getExportData();
    if (exportData.length === 0) { toast.error("ไม่มีข้อมูลให้ Export"); return; }
    setIsPdfExporting(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      await loadSarabunFont(doc);

      const PDF_COLORS = {
        primary: { r: 30, g: 64, b: 175 },
        text: { r: 15, g: 23, b: 42 },
        muted: { r: 71, g: 85, b: 105 },
        border: [203, 213, 225] as [number, number, number],
        rowAlt: [248, 250, 252] as [number, number, number],
        statusInProgress: [254, 243, 199] as [number, number, number],
        statusCompleted: [209, 250, 229] as [number, number, number],
      };

      let yPos = 15;

      doc.setFontSize(18);
      doc.setFont("Sarabun", "bold");
      doc.setTextColor(PDF_COLORS.primary.r, PDF_COLORS.primary.g, PDF_COLORS.primary.b);
      doc.text("รายการงานตรวจสอบ (Audit Jobs List)", 148.5, yPos, { align: "center" });
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont("Sarabun", "normal");
      doc.setTextColor(PDF_COLORS.muted.r, PDF_COLORS.muted.g, PDF_COLORS.muted.b);
      const exportDate = format(new Date(), "dd MMMM yyyy HH:mm", { locale: th });
      const exportText = selectedCount > 0
        ? `Export ${exportData.length} รายการที่เลือก | ${exportDate}`
        : `Export ทั้งหมด ${exportData.length} รายการ | ${exportDate}`;
      doc.text(exportText, 148.5, yPos, { align: "center" });
      yPos += 10;

      const tableData = exportData.map((job, i) => [
        (i + 1).toString(),
        job.jobNo || "-",
        job.branchName || "-",
        job.auditDate ? format(new Date(job.auditDate), "dd/MM/yyyy", { locale: th }) : "-",
        getStatusText(job.status),
        job.auditor?.fullname || "-",
        job.districtManager?.fullname || "-",
        job.branchManager?.fullname || "-",
        job.createdByUser?.fullname || "-",
        job.createdAt ? format(new Date(job.createdAt), "dd/MM/yyyy", { locale: th }) : "-",
      ]);

      interface JsPDFWithAutoTable extends jsPDF { lastAutoTable: { finalY: number } }

      autoTable(doc, {
        startY: yPos,
        head: [["#", "Job No", "สาขา", "วันที่ตรวจ", "สถานะ", "Auditor", "ผู้จัดการเขต", "ผู้จัดการสาขา", "ผู้สร้าง", "วันที่สร้าง"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [PDF_COLORS.primary.r, PDF_COLORS.primary.g, PDF_COLORS.primary.b], textColor: [255, 255, 255], fontStyle: "bold", font: "Sarabun", fontSize: 9, halign: "center", valign: "middle", lineColor: PDF_COLORS.border, lineWidth: 0.1, cellPadding: 2 },
        bodyStyles: { font: "Sarabun", fontSize: 8, cellPadding: 2, valign: "middle", textColor: [PDF_COLORS.text.r, PDF_COLORS.text.g, PDF_COLORS.text.b], lineColor: PDF_COLORS.border, lineWidth: 0.1 },
        alternateRowStyles: { fillColor: PDF_COLORS.rowAlt },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 28, halign: "left" },
          2: { cellWidth: 35, halign: "left" },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 30, halign: "center" },
          5: { cellWidth: 35, halign: "left" },
          6: { cellWidth: 35, halign: "left" },
          7: { cellWidth: 35, halign: "left" },
          8: { cellWidth: 30, halign: "left" },
          9: { cellWidth: 20, halign: "center" },
        },
        margin: { left: 10, right: 10 },
        didParseCell: (d) => {
          if (d.section === "body" && d.column.index === 4) {
            const job = exportData[d.row.index];
            if (job?.status === 2) { d.cell.styles.fillColor = PDF_COLORS.statusCompleted; d.cell.styles.textColor = [6, 78, 59]; d.cell.styles.fontStyle = "bold"; }
            else if (job?.status === 1) { d.cell.styles.fillColor = PDF_COLORS.statusInProgress; d.cell.styles.textColor = [120, 53, 15]; d.cell.styles.fontStyle = "bold"; }
          }
        },
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setFont("Sarabun", "normal");
        doc.setTextColor(PDF_COLORS.muted.r, PDF_COLORS.muted.g, PDF_COLORS.muted.b);
        const footerDate = format(new Date(), "dd/MM/yyyy HH:mm", { locale: th });
        doc.text(`พิมพ์เมื่อ: ${footerDate}`, 10, 200);
        doc.text(`หน้า ${i} / ${pageCount}`, 148.5, 200, { align: "center" });
        doc.text("PTEC Audit System", 287, 200, { align: "right" });
      }

      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      const filename = `Audit_Jobs_List_${timestamp}.pdf`;
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfPreview({ url, filename });
      setIsPdfPreviewOpen(true);
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถ Export PDF ได้", { description: "กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handlePdfDownload = () => {
    if (!pdfPreview) return;
    const link = document.createElement("a");
    link.href = pdfPreview.url; link.download = pdfPreview.filename;
    document.body.appendChild(link); link.click(); link.remove();
    toast.success("Export PDF สำเร็จ", { description: selectedCount > 0 ? `Export ${getExportData().length} รายการที่เลือก` : `Export ทั้งหมด ${getExportData().length} รายการ` });
    onExportComplete?.();
    setIsPdfPreviewOpen(false); setPdfPreview(null);
  };

  // ── Excel export ───────────────────────────────────────────────
  const handleExcelExport = async () => {
    const exportData = getExportData();
    if (exportData.length === 0) { toast.error("ไม่มีข้อมูลให้ Export"); return; }
    setIsExcelExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Audit Jobs List");

      const COLORS = { headerBg: "1E40AF", headerText: "FFFFFF", labelBg: "F1F5F9", border: "CBD5E1", evenRow: "F8FAFC", oddRow: "FFFFFF", statusInProgress: "FEF3C7", statusCompleted: "D1FAE5" };

      worksheet.columns = [
        { key: "no", width: 6 }, { key: "jobNo", width: 20 }, { key: "branch", width: 25 },
        { key: "auditDate", width: 15 }, { key: "status", width: 20 }, { key: "auditor", width: 25 },
        { key: "districtManager", width: 25 }, { key: "branchManager", width: 25 },
        { key: "createdBy", width: 25 }, { key: "createdAt", width: 18 },
      ];

      const headerRow = worksheet.addRow(["#", "Job No", "Branch", "Audit Date", "Status", "Auditor", "District Manager", "Branch Manager", "Created By", "Created At"]);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, size: 11, color: { argb: `FF${COLORS.headerText}` } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLORS.headerBg}` } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { top: { style: "thin", color: { argb: `FF${COLORS.border}` } }, bottom: { style: "thin", color: { argb: `FF${COLORS.border}` } }, left: { style: "thin", color: { argb: `FF${COLORS.border}` } }, right: { style: "thin", color: { argb: `FF${COLORS.border}` } } };
      });
      headerRow.height = 25;

      exportData.forEach((job, index) => {
        const isEven = index % 2 === 0;
        const row = worksheet.addRow([
          index + 1, job.jobNo || "-", job.branchName || "-",
          job.auditDate ? format(new Date(job.auditDate), "dd/MM/yyyy", { locale: th }) : "-",
          getStatusText(job.status),
          job.auditor?.fullname || "-", job.districtManager?.fullname || "-",
          job.branchManager?.fullname || "-", job.createdByUser?.fullname || "-",
          job.createdAt ? format(new Date(job.createdAt), "dd/MM/yyyy HH:mm", { locale: th }) : "-",
        ]);
        row.eachCell((cell, colNumber) => {
          cell.font = { size: 10 };
          cell.alignment = { horizontal: colNumber === 1 ? "center" : "left", vertical: "middle" };
          if (colNumber === 5) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${job.status === 2 ? COLORS.statusCompleted : COLORS.statusInProgress}` } };
            cell.font = { size: 10, bold: true };
          } else {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${isEven ? COLORS.evenRow : COLORS.oddRow}` } };
          }
          cell.border = { top: { style: "thin", color: { argb: `FF${COLORS.border}` } }, bottom: { style: "thin", color: { argb: `FF${COLORS.border}` } }, left: { style: "thin", color: { argb: `FF${COLORS.border}` } }, right: { style: "thin", color: { argb: `FF${COLORS.border}` } } };
        });
        row.height = 20;
      });

      worksheet.views = [{ state: "frozen", ySplit: 1 }];
      worksheet.autoFilter = { from: "A1", to: "J1" };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      const filename = `Audit_Jobs_List_${timestamp}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = filename;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); window.URL.revokeObjectURL(url);
      toast.success("Export Excel สำเร็จ", { description: selectedCount > 0 ? `Export ${exportData.length} รายการที่เลือก` : `Export ทั้งหมด ${exportData.length} รายการ` });
      onExportComplete?.();
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถ Export Excel ได้", { description: "กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setIsExcelExporting(false);
      setIsExcelConfirmOpen(false);
    }
  };

  return (
    <>
      {/* PDF Preview Dialog */}
      <Dialog open={isPdfPreviewOpen} onOpenChange={(open) => { setIsPdfPreviewOpen(open); if (!open) setPdfPreview(null); }}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>ตัวอย่าง PDF</DialogTitle>
            <DialogDescription>{pdfPreview?.filename ? `ไฟล์: ${pdfPreview.filename}` : ""}</DialogDescription>
          </DialogHeader>
          <div className="w-full">
            {pdfPreview?.url
              ? <iframe title="PDF Preview" src={pdfPreview.url} className="h-[70vh] w-full rounded-md border" />
              : <div className="text-muted-foreground text-sm">กำลังเตรียมไฟล์ตัวอย่าง…</div>
            }
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">ปิด</Button></DialogClose>
            <Button onClick={handlePdfDownload} disabled={!pdfPreview?.url}>ดาวน์โหลด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel Confirm Dialog */}
      <AlertDialog open={isExcelConfirmOpen} onOpenChange={setIsExcelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการ Export Excel</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCount > 0
                ? `ต้องการ Export ${selectedCount} รายการที่เลือก เป็นไฟล์ Excel ใช่หรือไม่?`
                : `ต้องการ Export ทั้งหมด ${data.length} รายการ เป็นไฟล์ Excel ใช่หรือไม่?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isExcelExporting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcelExport} disabled={isExcelExporting}>
              {isExcelExporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลัง Export...</> : "ดาวน์โหลด"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dropdown Trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="lg" variant="outline" disabled={!canExport || isAnyExporting}>
            {isAnyExporting ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" />กำลัง Export...</>
            ) : (
              <>
                <FileDown className="mr-2 h-5 w-5" />
                Export
                {selectedCount > 0 && <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground">{selectedCount}</Badge>}
                <ChevronDown className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handlePdfExport} disabled={isPdfExporting}>
            <FileText className="mr-2 h-4 w-4 text-red-500" />
            PDF (ดูตัวอย่างก่อน)
            <Badge variant="secondary" className="ml-auto">{selectedCount}</Badge>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsExcelConfirmOpen(true)} disabled={isExcelExporting}>
            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
            Excel (ดาวน์โหลด)
            <Badge variant="secondary" className="ml-auto">{selectedCount}</Badge>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
