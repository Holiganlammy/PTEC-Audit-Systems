// Version: 13.0.0 | Date: 2025-04-08 02:00:00 | Updated: ตารางแนวตั้ง 1 Item = 1 Row

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { loadSarabunFont } from "@/lib/font/THSarabunPSK";

interface ExportAuditDetailToPDFProps {
  jobData?: AuditJobData;
  auditItems: AuditItem[];
  disabled?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
}

export default function ExportAuditDetailToPDF({
  jobData,
  auditItems,
  disabled = false,
  size = "default",
  variant = "outline",
}: ExportAuditDetailToPDFProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<
    | {
        url: string;
        filename: string;
      }
    | null
  >(null);

  const canExport = jobData && auditItems.length > 0 && !disabled;

  useEffect(() => {
    return () => {
      if (pdfPreview?.url) {
        URL.revokeObjectURL(pdfPreview.url);
      }
    };
  }, [pdfPreview?.url]);

  const handleDownload = () => {
    if (!pdfPreview) return;
    const link = document.createElement("a");
    link.href = pdfPreview.url;
    link.download = pdfPreview.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExport = async () => {
    if (!jobData || auditItems.length === 0) {
      toast.error("ไม่มีข้อมูลให้ Export");
      return;
    }

    setIsExporting(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const PDF_COLORS = {
        primary: { r: 30, g: 64, b: 175 },
        text: { r: 15, g: 23, b: 42 },
        muted: { r: 71, g: 85, b: 105 },
        border: [203, 213, 225] as [number, number, number],
        labelBg: [241, 245, 249] as [number, number, number],
        rowAlt: [248, 250, 252] as [number, number, number],
      };

      await loadSarabunFont(doc);

      let yPos = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont('Sarabun', 'bold');
      doc.setTextColor(PDF_COLORS.primary.r, PDF_COLORS.primary.g, PDF_COLORS.primary.b);
      doc.text("รายงานการตรวจสอบ", 105, yPos, { align: "center" });
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont('Sarabun', 'normal');
      doc.setTextColor(PDF_COLORS.muted.r, PDF_COLORS.muted.g, PDF_COLORS.muted.b);
      const auditDate = jobData.auditDate 
        ? format(new Date(jobData.auditDate), "dd MMMM yyyy", { locale: th })
        : "";
      doc.text(`${jobData.branchName || ''} - ${auditDate} | เลขที่: ${jobData.jobNo || ""}`, 105, yPos, { align: "center" });
      yPos += 8;

      // ข้อมูลการตรวจสอบ
      const jobInfoRows = [
        ["สาขา", jobData.branchName || "-"],
        ["ที่อยู่", jobData.address || "-"],
        ["PM Code", jobData.pmCode || "-"],
        ["วันที่ตรวจสอบ", jobData.auditDate ? format(new Date(jobData.auditDate), "dd/MM/yyyy HH:mm", { locale: th }) : "-"],
        ["ผู้ตรวจสอบ", jobData.auditor?.fullname || "-"],
        ["ผู้จัดการเขต", jobData.districtManager?.fullname || "-"],
        ["ผู้จัดการสาขา", jobData.branchManager?.fullname || "-"],
        ["ผู้ทำรายการ", jobData.createdByUser?.fullname || "-"],
        ["หมายเหตุเพิ่มเติม", jobData.additionalNotes || "-"],
      ];

      autoTable(doc, {
        startY: yPos,
        body: jobInfoRows,
        theme: 'grid',
        styles: {
          font: 'Sarabun',
          fontSize: 9,
          cellPadding: 1.5,
          textColor: [PDF_COLORS.text.r, PDF_COLORS.text.g, PDF_COLORS.text.b],
          lineColor: PDF_COLORS.border,
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold', fillColor: PDF_COLORS.labelBg },
          1: { cellWidth: 140 },
        },
        margin: { left: 15, right: 15 },
      });

      interface JsPDFWithAutoTable extends jsPDF {
        lastAutoTable: { finalY: number };
      }
      yPos = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 10;

      // สรุปผลการตรวจ
      doc.setFontSize(14);
      doc.setFont('Sarabun', 'bold');
      doc.setTextColor(PDF_COLORS.primary.r, PDF_COLORS.primary.g, PDF_COLORS.primary.b);
      doc.text("สรุปผลการตรวจ", 105, yPos, { align: "center" });
      yPos += 7;

      // ตาราง: 1 Item = 1 Row
      // Columns: Topic | Status | Audit Comment | AM Details | Other Details
      const tableData: Array<Array<string>> = [];

      const getStatusText = (status?: number) => {
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
      };

      auditItems.forEach((item) => {
        // สร้าง comment strings
        const auditComments = item.note_1 && item.note_1.length > 0
          ? item.note_1.map(c => `${c.author}\n- ${c.text}`).join('\n\n')
          : "-";

        const amComments = item.note_2 && item.note_2.length > 0
          ? item.note_2.map(c => `${c.author}\n- ${c.text}`).join('\n\n')
          : "-";

        const otherComments = item.note_3 && item.note_3.length > 0
          ? item.note_3.map(c => `${c.author}\n- ${c.text}`).join('\n\n')
          : "-";

        tableData.push([
          item.category_name || "ไม่ระบุ",
          getStatusText(item.item_status),
          auditComments,
          amComments,
          otherComments,
        ]);
      });

      // Header Info Row
      const headerInfoRow = [
        { 
          content: 'ผลการตรวจ audit', 
          colSpan: 1,
          styles: { fontStyle: 'bold' as const, halign: 'left' as const }
        },
        { 
          content: `สถานีน้ำมัน ${jobData.branchName || ''}`, 
          colSpan: 3,
          styles: { fontStyle: 'bold' as const, fontSize: 10, halign: 'center' as const }
        },
        { 
          content: jobData.auditDate ? format(new Date(jobData.auditDate), "dd MMMM yyyy", { locale: th }) : "", 
          colSpan: 1,
          styles: { fontStyle: 'bold' as const, halign: 'right' as const }
        },
      ];

      autoTable(doc, {
        startY: yPos,
        head: [
          headerInfoRow,
          ["หัวข้อ", "สถานะที่ตรวจพบ", "สิ่งที่ตรวจพบ\n(Audit Comment)", "รายละเอียดจาก\n(AM Comment)", "รายละเอียดจากผู้อื่น\n(Other Comment)"]
        ],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [PDF_COLORS.primary.r, PDF_COLORS.primary.g, PDF_COLORS.primary.b],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          font: 'Sarabun',
          fontSize: 9,
          halign: 'center',
          valign: 'middle',
          lineColor: PDF_COLORS.border,
          lineWidth: 0.1,
          cellPadding: 2,
        },
        bodyStyles: {
          font: 'Sarabun',
          fontSize: 8,
          cellPadding: 3,
          valign: 'top',
          textColor: [PDF_COLORS.text.r, PDF_COLORS.text.g, PDF_COLORS.text.b],
          lineColor: PDF_COLORS.border,
          lineWidth: 0.1,
        },
        columnStyles: {
          // A4 width 210mm - margins (15+15) = 180mm
          0: {
            cellWidth: 32,
            fontStyle: 'bold',
            fillColor: PDF_COLORS.labelBg,
            halign: 'left',
            overflow: 'linebreak',
          },
          1: { cellWidth: 18, halign: 'center', overflow: 'linebreak' },
          2: { cellWidth: 50, halign: 'left', overflow: 'linebreak' },
          3: { cellWidth: 40, halign: 'left', overflow: 'linebreak' },
          4: { cellWidth: 40, halign: 'left', overflow: 'linebreak' },
        },
        margin: { left: 15, right: 15 },
      });

      yPos = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 5;

      // Signature Section
      if (yPos > 258) {
        doc.addPage();
        yPos = 20;
      }
      yPos += 10;

      // ============================================================
      // [OPTION A] ชื่ออยู่ใต้เส้น (สำหรับพิมพ์แล้วเซ็นเอง)
      // ============================================================
      // const sigLineY = yPos + 8;
      // const sigNameY = sigLineY + 6;
      // const sigTitleY = sigNameY + 5;
      //
      // doc.setDrawColor(100, 100, 100);
      // doc.setLineWidth(0.3);
      //
      // // Left: ผู้ตรวจสอบ (auditor)
      // const leftCenterX = 52.5;
      // doc.line(20, sigLineY, 85, sigLineY);
      // doc.setFontSize(9);
      // doc.setFont('Sarabun', 'normal');
      // doc.setTextColor(PDF_COLORS.text.r, PDF_COLORS.text.g, PDF_COLORS.text.b);
      // doc.text(jobData.auditor?.fullname || "-", leftCenterX, sigNameY, { align: 'center' });
      // doc.setFont('Sarabun', 'bold');
      // doc.text("Audit", leftCenterX, sigTitleY, { align: 'center' });
      //
      // // Right: ผู้จัดการสถานีบริการ (branchManager)
      // const rightCenterX = 157.5;
      // doc.line(125, sigLineY, 190, sigLineY);
      // doc.setFont('Sarabun', 'normal');
      // doc.text(jobData.branchManager?.fullname || "-", rightCenterX, sigNameY, { align: 'center' });
      // doc.setFont('Sarabun', 'bold');
      // doc.text("ผู้จัดการสถานีบริการ", rightCenterX, sigTitleY, { align: 'center' });
      //
      // yPos = sigTitleY + 10;

      // ============================================================
      // [OPTION B] เส้นว่างไว้เซ็น + ชื่อ + ตำแหน่งอยู่ใต้เส้นด้วยกัน ← ACTIVE
      // ============================================================
      const sigLineY = yPos + 8;
      const sigNameY = sigLineY + 6;
      const sigTitleY = sigNameY + 5;

      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.3);
      doc.setFontSize(9);
      doc.setTextColor(PDF_COLORS.text.r, PDF_COLORS.text.g, PDF_COLORS.text.b);

      // Left: ผู้ตรวจสอบ (auditor) — ชื่ออยู่บนเส้น (เซ็นแล้ว)
      const leftCenterX = 52.5;
      doc.setFont('Sarabun', 'normal');
      doc.text(jobData.auditor?.fullname || "-", leftCenterX, sigLineY - 1, { align: 'center' });
      doc.line(20, sigLineY, 85, sigLineY);
      doc.setFont('Sarabun', 'bold');
      doc.text("Audit", leftCenterX, sigTitleY, { align: 'center' });

      // Right: ผู้จัดการสถานีบริการ (branchManager) — เส้นว่างไว้เซ็น
      const rightCenterX = 157.5;
      doc.line(125, sigLineY, 190, sigLineY);
      doc.setFont('Sarabun', 'normal');
      doc.text(jobData.branchManager?.fullname || "-", rightCenterX, sigNameY, { align: 'center' });
      doc.setFont('Sarabun', 'bold');
      doc.text("ผู้จัดการสถานีบริการ", rightCenterX, sigTitleY, { align: 'center' });

      yPos = sigTitleY + 10;

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('Sarabun', 'normal');
        doc.setTextColor(PDF_COLORS.muted.r, PDF_COLORS.muted.g, PDF_COLORS.muted.b);
        
        const exportDate = format(new Date(), "dd/MM/yyyy HH:mm", { locale: th });
        doc.text(`สร้างเมื่อ: ${exportDate}`, 15, 287);
        doc.text(`หน้า ${i} / ${pageCount}`, 105, 287, { align: 'center' });
        
        doc.setTextColor(PDF_COLORS.text.r, PDF_COLORS.text.g, PDF_COLORS.text.b);
      }

      // Save
      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      const filename = `Audit_Report_${jobData.jobNo}_${timestamp}.pdf`;

      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfPreview({ url, filename });
      setIsPreviewOpen(true);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast.error("ไม่สามารถ Export PDF ได้", {
        description: "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังสร้างตัวอย่าง...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export to PDF
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

      <Dialog
        open={isPreviewOpen}
        onOpenChange={(open) => {
          setIsPreviewOpen(open);
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
              <iframe
                title="PDF Preview"
                src={pdfPreview.url}
                className="h-[70vh] w-full rounded-md border"
              />
            ) : (
              <div className="text-muted-foreground text-sm">กำลังเตรียมไฟล์ตัวอย่าง…</div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">ปิด</Button>
            </DialogClose>
            <Button onClick={handleDownload} disabled={!pdfPreview?.url}>
              ดาวน์โหลด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}