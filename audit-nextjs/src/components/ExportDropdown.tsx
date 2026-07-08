"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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

interface ExportDropdownProps {
  jobData?: AuditJobData;
  auditItems: AuditItem[];
  selectedItems?: AuditItem[];
  disabled?: boolean;
  formType?: "AM" | "AA" | "Audit";
}

function getStatusText(status?: number) {
  switch (status) {
    case 1: return "ปกติ";
    case 2: return "อยู่ระหว่างดำเนินการ";
    case 3: return "ผิดปกติ";
    case 4: return "ปิดเคส";
    default: return "ไม่ทราบ";
  }
}

function stringifyComments(comments?: AuditComment[]) {
  if (!comments || comments.length === 0) return "-";
  return comments.map((c) => `${c.author}\n- ${c.text}`).join("\n\n");
}

export default function ExportDropdown({
  jobData,
  auditItems,
  selectedItems,
  disabled = false,
  formType = "Audit",
}: ExportDropdownProps) {
  const itemsToExport = selectedItems && selectedItems.length > 0 ? selectedItems : auditItems;
  const canExport = !!jobData && auditItems.length > 0 && !disabled;

  const isAMorAA = formType === "AM" || formType === "AA";
  const reportTitle = formType === "AM" ? "รายงาน Area Manager" : formType === "AA" ? "รายงาน Area Assistant" : "รายงานการตรวจสอบ";
  const filePrefix = formType === "AM" ? "AM" : formType === "AA" ? "AA" : "Audit";
  const tableHeaderLabel = formType === "AM" ? "ผลการตรวจ AM" : formType === "AA" ? "ผลการตรวจ AA" : "ผลการตรวจ audit";
  const commentColHeaders =
    formType === "AM"
      ? ["หัวข้อ", "สถานะที่ตรวจพบ", "หน่วยงานตรวจสอบ\n(AM Checker)", "หน่วยงาน RM", "หน่วยงานอื่นๆ"]
      : formType === "AA"
      ? ["หัวข้อ", "สถานะที่ตรวจพบ", "หน่วยงานตรวจสอบ AA", "หน่วยงาน AM", "หน่วยงานอื่นๆ"]
      : ["หัวข้อ", "สถานะที่ตรวจพบ", "สิ่งที่ตรวจพบ\n(Audit Comment)", "รายละเอียดจาก\n(AM Comment)", "รายละเอียดจากผู้อื่น\n(Other Comment)"];

  // ── PDF state ──────────────────────────────────────────────────
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; filename: string } | null>(null);

  useEffect(() => {
    return () => {
      if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url);
    };
  }, [pdfPreview?.url]);

  // ── Excel state ────────────────────────────────────────────────
  const [isExcelExporting, setIsExcelExporting] = useState(false);
  const [isExcelConfirmOpen, setIsExcelConfirmOpen] = useState(false);

  // ── PDF export ─────────────────────────────────────────────────
  const handlePdfExport = async () => {
    if (!jobData || itemsToExport.length === 0) {
      toast.error("ไม่มีข้อมูลให้ Export");
      return;
    }
    setIsPdfExporting(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const PDF_COLORS = {
        primary: { r: 30, g: 64, b: 175 },
        text: { r: 15, g: 23, b: 42 },
        muted: { r: 71, g: 85, b: 105 },
        border: [203, 213, 225] as [number, number, number],
        labelBg: [241, 245, 249] as [number, number, number],
      };

      await loadSarabunFont(doc);
      let yPos = 20;

      doc.setFontSize(18);
      doc.setFont("Sarabun", "bold");
      doc.setTextColor(PDF_COLORS.primary.r, PDF_COLORS.primary.g, PDF_COLORS.primary.b);
      doc.text(reportTitle, 105, yPos, { align: "center" });
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont("Sarabun", "normal");
      doc.setTextColor(PDF_COLORS.muted.r, PDF_COLORS.muted.g, PDF_COLORS.muted.b);
      const auditDate = jobData.auditDate
        ? format(new Date(jobData.auditDate), "dd MMMM yyyy", { locale: th })
        : "";
      doc.text(
        `${jobData.branchName || ""} - ${auditDate} | เลขที่: ${jobData.jobNo || ""}`,
        105, yPos, { align: "center" }
      );
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        body: [
          ["สาขา", jobData.branchName || "-"],
          ["ที่อยู่", jobData.address || "-"],
          ["PM Code", jobData.pmCode || "-"],
          ["วันที่ตรวจสอบ", jobData.auditDate ? format(new Date(jobData.auditDate), "dd/MM/yyyy", { locale: th }) : "-"],
          ...(isAMorAA
            ? [
                ["ผู้สร้างเอกสาร", jobData.createdByUser?.fullname || "-"],
                ["ผู้จัดการเขต", jobData.districtManager?.fullname || "-"],
                ["ผู้จัดการสาขา", jobData.branchManager?.fullname || "-"],
                ["หมายเหตุเพิ่มเติม", jobData.additionalNotes || "-"],
              ]
            : [
                ["ผู้ตรวจสอบ", jobData.auditor?.fullname || "-"],
                ["ผู้จัดการเขต", jobData.districtManager?.fullname || "-"],
                ["ผู้จัดการสาขา", jobData.branchManager?.fullname || "-"],
                ["ผู้ทำรายการ", jobData.createdByUser?.fullname || "-"],
                ["หมายเหตุเพิ่มเติม", jobData.additionalNotes || "-"],
              ]),
        ],
        theme: "grid",
        styles: { font: "Sarabun", fontSize: 9, cellPadding: 1.5, textColor: [PDF_COLORS.text.r, PDF_COLORS.text.g, PDF_COLORS.text.b], lineColor: PDF_COLORS.border, lineWidth: 0.1 },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: "bold", fillColor: PDF_COLORS.labelBg },
          1: { cellWidth: 140 },
        },
        margin: { left: 15, right: 15 },
      });

      interface JsPDFWithAutoTable extends jsPDF { lastAutoTable: { finalY: number } }
      yPos = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 10;

      doc.setFontSize(14);
      doc.setFont("Sarabun", "bold");
      doc.setTextColor(PDF_COLORS.primary.r, PDF_COLORS.primary.g, PDF_COLORS.primary.b);
      doc.text("สรุปผลการตรวจ", 105, yPos, { align: "center" });
      yPos += 7;

      const tableData = itemsToExport.map((item) => [
        item.category_name || "ไม่ระบุ",
        getStatusText(item.item_status),
        item.note_1?.length ? item.note_1.map((c) => `${c.author}\n- ${c.text}`).join("\n\n") : "-",
        item.note_2?.length ? item.note_2.map((c) => `${c.author}\n- ${c.text}`).join("\n\n") : "-",
        item.note_3?.length ? item.note_3.map((c) => `${c.author}\n- ${c.text}`).join("\n\n") : "-",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [
          [
            { content: tableHeaderLabel, colSpan: 1, styles: { fontStyle: "bold" as const, halign: "left" as const } },
            { content: `สถานีน้ำมัน ${jobData.branchName || ""}`, colSpan: 3, styles: { fontStyle: "bold" as const, fontSize: 10, halign: "center" as const } },
            { content: jobData.auditDate ? format(new Date(jobData.auditDate), "dd MMMM yyyy", { locale: th }) : "", colSpan: 1, styles: { fontStyle: "bold" as const, halign: "right" as const } },
          ],
          commentColHeaders,
        ],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [PDF_COLORS.primary.r, PDF_COLORS.primary.g, PDF_COLORS.primary.b], textColor: [255, 255, 255], fontStyle: "bold", font: "Sarabun", fontSize: 9, halign: "center", valign: "middle", lineColor: PDF_COLORS.border, lineWidth: 0.1, cellPadding: 2 },
        bodyStyles: { font: "Sarabun", fontSize: 8, cellPadding: 3, valign: "top", textColor: [PDF_COLORS.text.r, PDF_COLORS.text.g, PDF_COLORS.text.b], lineColor: PDF_COLORS.border, lineWidth: 0.1 },
        columnStyles: {
          0: { cellWidth: 32, fontStyle: "bold", fillColor: PDF_COLORS.labelBg, halign: "left", overflow: "linebreak" },
          1: { cellWidth: 18, halign: "center", overflow: "linebreak" },
          2: { cellWidth: 50, halign: "left", overflow: "linebreak" },
          3: { cellWidth: 40, halign: "left", overflow: "linebreak" },
          4: { cellWidth: 40, halign: "left", overflow: "linebreak" },
        },
        margin: { left: 15, right: 15 },
        rowPageBreak: "avoid",
      });

      doc.setPage(doc.getNumberOfPages());
      yPos = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 5;
      if (yPos > 258) { doc.addPage(); yPos = 20; }
      yPos += 10;

      // [OPTION A] ชื่ออยู่ใต้เส้น (พิมพ์แล้วเซ็นเอง)
      // const sigLineY = yPos + 8; const sigNameY = sigLineY + 6; const sigTitleY = sigNameY + 5;
      // doc.setDrawColor(100,100,100); doc.setLineWidth(0.3);
      // doc.line(20, sigLineY, 85, sigLineY); doc.setFontSize(9); doc.setFont('Sarabun','normal');
      // doc.setTextColor(PDF_COLORS.text.r,PDF_COLORS.text.g,PDF_COLORS.text.b);
      // doc.text(jobData.auditor?.fullname||"-", 52.5, sigNameY,{align:'center'}); doc.setFont('Sarabun','bold'); doc.text("Audit",52.5,sigTitleY,{align:'center'});
      // doc.line(125,sigLineY,190,sigLineY); doc.setFont('Sarabun','normal');
      // doc.text(jobData.branchManager?.fullname||"-",157.5,sigNameY,{align:'center'}); doc.setFont('Sarabun','bold'); doc.text("ผู้จัดการสถานีบริการ",157.5,sigTitleY,{align:'center'});
      // yPos = sigTitleY + 10;

      // [OPTION B] เส้นว่างไว้เซ็น + ชื่อ + ตำแหน่งอยู่ใต้เส้นด้วยกัน ← ACTIVE
      const sigLineY = yPos + 8;
      const sigNameY = sigLineY + 6;
      const sigTitleY = sigNameY;
      doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.3); doc.setFontSize(9);
      doc.setTextColor(PDF_COLORS.text.r, PDF_COLORS.text.g, PDF_COLORS.text.b);
      const leftSignerName = isAMorAA ? (jobData.createdByUser?.fullname || "-") : (jobData.auditor?.fullname || "-");
      const leftSignerTitle = formType === "AM" ? "Area Manager" : formType === "AA" ? "Area Assistant" : "Audit";
      // Left signer
      doc.setFont("Sarabun", "normal"); doc.text(leftSignerName, 52.5, sigLineY - 1, { align: "center" });
      doc.line(20, sigLineY, 85, sigLineY);
      doc.setFont("Sarabun", "bold"); doc.text(leftSignerTitle, 52.5, sigTitleY, { align: "center" });
      // Right: Branch Manager
      doc.line(125, sigLineY, 190, sigLineY);
      doc.setFont("Sarabun", "normal"); doc.text(jobData.branchManager?.fullname || "-", 157.5, sigNameY, { align: "center" });
      doc.setFont("Sarabun", "bold"); doc.text("ผู้จัดการสถานีบริการ", 157.5, sigNameY + 5, { align: "center" });
      yPos = sigTitleY + 10;

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setFont("Sarabun", "normal");
        doc.setTextColor(PDF_COLORS.muted.r, PDF_COLORS.muted.g, PDF_COLORS.muted.b);
        const exportDate = format(new Date(), "dd/MM/yyyy HH:mm", { locale: th });
        doc.text(`สร้างเมื่อ: ${exportDate}`, 15, 287);
        doc.text(`หน้า ${i} / ${pageCount}`, 105, 287, { align: "center" });
      }

      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      const safeJobNo = String(jobData.jobNo || "AUDIT").replace(/[\\/:*?"<>|]/g, "-");
      const branchLabel = jobData.branchId ? `_Branch${jobData.branchId}` : "";
      const filename = `${filePrefix}_Report_${safeJobNo}${branchLabel}_${timestamp}.pdf`;
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfPreview({ url, filename });
      setIsPdfPreviewOpen(true);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast.error("ไม่สามารถ Export PDF ได้", { description: "กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handlePdfDownload = () => {
    if (!pdfPreview) return;
    const link = document.createElement("a");
    link.href = pdfPreview.url;
    link.download = pdfPreview.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // ── Excel export ───────────────────────────────────────────────
  const handleExcelExport = async () => {
    if (!jobData || itemsToExport.length === 0) {
      toast.error("ไม่มีข้อมูลให้ Export");
      return;
    }
    setIsExcelExporting(true);
    try {
      const auditDateText = jobData.auditDate
        ? format(new Date(jobData.auditDate), "dd MMMM yyyy", { locale: th })
        : "";
      const auditDateShort = jobData.auditDate
        ? format(new Date(jobData.auditDate), "dd/MM/yyyy", { locale: th })
        : "-";

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("รายงานการตรวจสอบ");

      const COLORS = { primary: "1E40AF", primaryLight: "E0E7FF", labelBg: "F1F5F9", border: "CBD5E1", text: "0F172A", white: "FFFFFF" };

      const headerStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 14, color: { argb: `FF${COLORS.primary}` } }, alignment: { horizontal: "center", vertical: "middle" } };
      const subHeaderStyle: Partial<ExcelJS.Style> = { font: { size: 10, color: { argb: "FF475569" } }, alignment: { horizontal: "center", vertical: "middle" } };
      const sectionTitleStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 12, color: { argb: `FF${COLORS.primary}` } }, alignment: { horizontal: "center", vertical: "middle" } };
      const labelStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 9 }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLORS.labelBg}` } }, alignment: { horizontal: "left", vertical: "top" }, border: { top: { style: "thin", color: { argb: `FF${COLORS.border}` } }, bottom: { style: "thin", color: { argb: `FF${COLORS.border}` } }, left: { style: "thin", color: { argb: `FF${COLORS.border}` } }, right: { style: "thin", color: { argb: `FF${COLORS.border}` } } } };
      const valueStyle: Partial<ExcelJS.Style> = { font: { size: 9 }, alignment: { horizontal: "left", vertical: "top", wrapText: true }, border: { top: { style: "thin", color: { argb: `FF${COLORS.border}` } }, bottom: { style: "thin", color: { argb: `FF${COLORS.border}` } }, left: { style: "thin", color: { argb: `FF${COLORS.border}` } }, right: { style: "thin", color: { argb: `FF${COLORS.border}` } } } };
      const tableHeaderStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 9, color: { argb: `FF${COLORS.white}` } }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLORS.primary}` } }, alignment: { horizontal: "center", vertical: "middle", wrapText: true }, border: { top: { style: "thin", color: { argb: `FF${COLORS.border}` } }, bottom: { style: "thin", color: { argb: `FF${COLORS.border}` } }, left: { style: "thin", color: { argb: `FF${COLORS.border}` } }, right: { style: "thin", color: { argb: `FF${COLORS.border}` } } } };
      const tableDataStyle: Partial<ExcelJS.Style> = { font: { size: 8 }, alignment: { horizontal: "left", vertical: "top", wrapText: true }, border: { top: { style: "thin", color: { argb: `FF${COLORS.border}` } }, bottom: { style: "thin", color: { argb: `FF${COLORS.border}` } }, left: { style: "thin", color: { argb: `FF${COLORS.border}` } }, right: { style: "thin", color: { argb: `FF${COLORS.border}` } } } };
      const topicStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 8 }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLORS.labelBg}` } }, alignment: { horizontal: "left", vertical: "top", wrapText: true }, border: { top: { style: "thin", color: { argb: `FF${COLORS.border}` } }, bottom: { style: "thin", color: { argb: `FF${COLORS.border}` } }, left: { style: "thin", color: { argb: `FF${COLORS.border}` } }, right: { style: "thin", color: { argb: `FF${COLORS.border}` } } } };

      worksheet.columns = [{ key: "A", width: 24 }, { key: "B", width: 14 }, { key: "C", width: 40 }, { key: "D", width: 30 }, { key: "E", width: 30 }];

      let currentRow = 1;

      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      Object.assign(worksheet.getCell(`A${currentRow}`), { value: reportTitle, style: headerStyle });
      currentRow++;

      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      Object.assign(worksheet.getCell(`A${currentRow}`), { value: `${jobData.branchName || ""} - ${auditDateText} | เลขที่: ${jobData.jobNo || ""}`, style: subHeaderStyle });
      currentRow += 2;

      const jobInfo = [
        ["สาขา", jobData.branchName || "-"],
        ["ที่อยู่", jobData.address || "-"],
        ["PM Code", jobData.pmCode || "-"],
        ["วันที่ตรวจสอบ", auditDateShort],
        ...(isAMorAA
          ? [
              ["ผู้สร้างเอกสาร", jobData.createdByUser?.fullname || "-"],
              ["ผู้จัดการเขต", jobData.districtManager?.fullname || "-"],
              ["ผู้จัดการสาขา", jobData.branchManager?.fullname || "-"],
              ["หมายเหตุเพิ่มเติม", jobData.additionalNotes || "-"],
            ]
          : [
              ["ผู้ตรวจสอบ", jobData.auditor?.fullname || "-"],
              ["ผู้จัดการเขต", jobData.districtManager?.fullname || "-"],
              ["ผู้จัดการสาขา", jobData.branchManager?.fullname || "-"],
              ["ผู้ทำรายการ", jobData.createdByUser?.fullname || "-"],
              ["หมายเหตุเพิ่มเติม", jobData.additionalNotes || "-"],
            ]),
      ];
      jobInfo.forEach(([label, value]) => {
        Object.assign(worksheet.getCell(`A${currentRow}`), { value: label, style: labelStyle });
        worksheet.mergeCells(`B${currentRow}:E${currentRow}`);
        Object.assign(worksheet.getCell(`B${currentRow}`), { value, style: valueStyle });
        currentRow++;
      });
      currentRow++;

      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      Object.assign(worksheet.getCell(`A${currentRow}`), { value: "สรุปผลการตรวจ", style: sectionTitleStyle });
      currentRow += 2;

      Object.assign(worksheet.getCell(`A${currentRow}`), { value: tableHeaderLabel, style: tableHeaderStyle });
      worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
      Object.assign(worksheet.getCell(`B${currentRow}`), { value: `สถานีน้ำมัน ${jobData.branchName || ""}`, style: { ...tableHeaderStyle, font: { bold: true, size: 10, color: { argb: `FF${COLORS.white}` } } } });
      Object.assign(worksheet.getCell(`E${currentRow}`), { value: auditDateText, style: tableHeaderStyle });
      currentRow++;

      commentColHeaders.forEach((header, idx) => {
        Object.assign(worksheet.getCell(`${String.fromCharCode(65 + idx)}${currentRow}`), { value: header, style: tableHeaderStyle });
      });
      currentRow++;

      itemsToExport.forEach((item) => {
        const rowData = [item.category_name || "ไม่ระบุ", getStatusText(item.item_status), stringifyComments(item.note_1), stringifyComments(item.note_2), stringifyComments(item.note_3)];
        rowData.forEach((value, idx) => {
          Object.assign(worksheet.getCell(`${String.fromCharCode(65 + idx)}${currentRow}`), {
            value,
            style: idx === 0 ? topicStyle : idx === 1 ? { ...tableDataStyle, alignment: { horizontal: "center", vertical: "top", wrapText: true } } : tableDataStyle,
          });
        });
        currentRow++;
      });
      currentRow += 2;

      Object.assign(worksheet.getCell(`B${currentRow}`), { value: "____________________", alignment: { horizontal: "center" } });
      Object.assign(worksheet.getCell(`D${currentRow}`), { value: "____________________", alignment: { horizontal: "center" } });
      currentRow++;
      Object.assign(worksheet.getCell(`B${currentRow}`), { value: isAMorAA ? (jobData.createdByUser?.fullname || "-") : (jobData.auditor?.fullname || "-"), alignment: { horizontal: "center" } });
      Object.assign(worksheet.getCell(`D${currentRow}`), { value: jobData.branchManager?.fullname || "-", alignment: { horizontal: "center" } });
      currentRow++;
      Object.assign(worksheet.getCell(`B${currentRow}`), { value: formType === "AM" ? "Area Manager" : formType === "AA" ? "Area Assistant" : "Audit", font: { bold: true }, alignment: { horizontal: "center" } });
      Object.assign(worksheet.getCell(`D${currentRow}`), { value: "ผู้จัดการสถานีบริการ", font: { bold: true }, alignment: { horizontal: "center" } });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      const safeJobNo = String(jobData.jobNo || "AUDIT").replace(/[\\/:*?"<>|]/g, "-");
      const branchLabel = jobData.branchId ? `_Branch${jobData.branchId}` : "";
      const filename = `${filePrefix}_Report_${safeJobNo}${branchLabel}_${timestamp}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = filename;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Export Excel สำเร็จ", { description: `ไฟล์: ${filename}` });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("ไม่สามารถ Export Excel ได้", { description: "กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setIsExcelExporting(false);
      setIsExcelConfirmOpen(false);
    }
  };

  const isAnyExporting = isPdfExporting || isExcelExporting;

  return (
    <>
      {/* PDF Preview Dialog */}
      <Dialog
        open={isPdfPreviewOpen}
        onOpenChange={(open) => {
          setIsPdfPreviewOpen(open);
          if (!open) setPdfPreview(null);
        }}
      >
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>ตัวอย่าง PDF</DialogTitle>
            <DialogDescription>
              {pdfPreview?.filename ? `ไฟล์: ${pdfPreview.filename}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="w-full">
            {pdfPreview?.url ? (
              <iframe title="PDF Preview" src={pdfPreview.url} className="h-[70vh] w-full rounded-md border" />
            ) : (
              <div className="text-muted-foreground text-sm">กำลังเตรียมไฟล์ตัวอย่าง…</div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">ปิด</Button>
            </DialogClose>
            <Button onClick={handlePdfDownload} disabled={!pdfPreview?.url}>
              ดาวน์โหลด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel Confirm Dialog */}
      <AlertDialog open={isExcelConfirmOpen} onOpenChange={setIsExcelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการ Export Excel</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการ Export{selectedItems && selectedItems.length > 0 ? ` ${selectedItems.length} รายการที่เลือกจาก` : " รายงานการตรวจสอบ"}
              {jobData?.branchName ? ` "${jobData.branchName}"` : ""} เป็นไฟล์ Excel ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isExcelExporting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcelExport} disabled={isExcelExporting}>
              {isExcelExporting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลัง Export...</>
              ) : (
                "ดาวน์โหลด"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dropdown Trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={!canExport || isAnyExporting}>
            {isAnyExporting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลัง Export...</>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Export
                {selectedItems && selectedItems.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium min-w-[18px] h-[18px] px-1">
                    {selectedItems.length}
                  </span>
                )}
                <ChevronDown className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {selectedItems && selectedItems.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Export {selectedItems.length} รายการที่เลือก
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handlePdfExport} disabled={isPdfExporting}>
            <FileText className="mr-2 h-4 w-4 text-red-500" />
            PDF (ดูตัวอย่างก่อน)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsExcelConfirmOpen(true)} disabled={isExcelExporting}>
            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
            Excel (ดาวน์โหลด)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
