// Version: 1.0.0 | Date: 2025-04-08 16:00:00 | Updated: Export Audit Jobs List to PDF ด้วย jsPDF

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { getErrorMessage } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

interface ExportToPDFProps {
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

export default function ExportToPDF({
  data,
  selectedRows = {},
  onExportComplete,
  disabled = false,
  size = "lg",
  variant = "outline",
}: ExportToPDFProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{
    url: string;
    filename: string;
  } | null>(null);

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
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      await loadSarabunFont(doc);

      const PDF_COLORS = {
        primary: { r: 30, g: 64, b: 175 },
        text: { r: 15, g: 23, b: 42 },
        muted: { r: 71, g: 85, b: 105 },
        border: [203, 213, 225] as [number, number, number],
        labelBg: [241, 245, 249] as [number, number, number],
        rowAlt: [248, 250, 252] as [number, number, number],
        statusInProgress: [254, 243, 199] as [number, number, number], // Yellow
        statusCompleted: [209, 250, 229] as [number, number, number],  // Green
      };

      let yPos = 15;

      // ==================== HEADER ====================
      doc.setFontSize(18);
      doc.setFont('Sarabun', 'bold');
      doc.setTextColor(PDF_COLORS.primary.r, PDF_COLORS.primary.g, PDF_COLORS.primary.b);
      doc.text("รายการงานตรวจสอบ (Audit Jobs List)", 148.5, yPos, { align: "center" });
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont('Sarabun', 'normal');
      doc.setTextColor(PDF_COLORS.muted.r, PDF_COLORS.muted.g, PDF_COLORS.muted.b);
      const exportDate = format(new Date(), "dd MMMM yyyy HH:mm", { locale: th });
      const selectedCount = Object.keys(selectedRows).filter((key) => selectedRows[key]).length;
      const exportText = selectedCount > 0 
        ? `Export ${selectedCount} รายการที่เลือก | ${exportDate}`
        : `Export ทั้งหมด ${exportData.length} รายการ | ${exportDate}`;
      doc.text(exportText, 148.5, yPos, { align: "center" });
      yPos += 10;

      // ==================== TABLE DATA ====================
      const tableData = exportData.map((job, index) => [
        (index + 1).toString(),
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

      interface JsPDFWithAutoTable extends jsPDF {
        lastAutoTable: { finalY: number };
      }

      autoTable(doc, {
        startY: yPos,
        head: [[
          "#",
          "Job No",
          "สาขา",
          "วันที่ตรวจ",
          "สถานะ",
          "Auditor",
          "ผู้จัดการเขต",
          "ผู้จัดการสาขา",
          "ผู้สร้าง",
          "วันที่สร้าง"
        ]],
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
          cellPadding: 2,
          valign: 'middle',
          textColor: [PDF_COLORS.text.r, PDF_COLORS.text.g, PDF_COLORS.text.b],
          lineColor: PDF_COLORS.border,
          lineWidth: 0.1,
        },
        alternateRowStyles: {
          fillColor: PDF_COLORS.rowAlt,
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },   // #
          1: { cellWidth: 28, halign: 'left' },     // Job No
          2: { cellWidth: 35, halign: 'left' },     // สาขา
          3: { cellWidth: 20, halign: 'center' },   // วันที่ตรวจ
          4: { cellWidth: 30, halign: 'center' },   // สถานะ
          5: { cellWidth: 35, halign: 'left' },     // Auditor
          6: { cellWidth: 35, halign: 'left' },     // ผู้จัดการเขต
          7: { cellWidth: 35, halign: 'left' },     // ผู้จัดการสาขา
          8: { cellWidth: 30, halign: 'left' },     // ผู้สร้าง
          9: { cellWidth: 20, halign: 'center' },   // วันที่สร้าง
        },
        margin: { left: 10, right: 10 },
        didParseCell: (data) => {
          // Color status column
          if (data.section === 'body' && data.column.index === 4) {
            const rowIndex = data.row.index;
            const job = exportData[rowIndex];
            if (job) {
              if (job.status === 2) {
                // เสร็จสิ้น - Green
                data.cell.styles.fillColor = PDF_COLORS.statusCompleted;
                data.cell.styles.textColor = [6, 78, 59]; // Dark green
                data.cell.styles.fontStyle = 'bold';
              } else if (job.status === 1) {
                // กำลังดำเนินการ - Yellow
                data.cell.styles.fillColor = PDF_COLORS.statusInProgress;
                data.cell.styles.textColor = [120, 53, 15]; // Dark yellow
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        },
      });

      yPos = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 10;

      // ==================== FOOTER ====================
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('Sarabun', 'normal');
        doc.setTextColor(PDF_COLORS.muted.r, PDF_COLORS.muted.g, PDF_COLORS.muted.b);
        
        const footerDate = format(new Date(), "dd/MM/yyyy HH:mm", { locale: th });
        doc.text(`พิมพ์เมื่อ: ${footerDate}`, 10, 200);
        doc.text(`หน้า ${i} / ${pageCount}`, 148.5, 200, { align: 'center' });
        doc.text(`PTEC Audit System`, 287, 200, { align: 'right' });
        
        doc.setTextColor(PDF_COLORS.text.r, PDF_COLORS.text.g, PDF_COLORS.text.b);
      }

      // ==================== SAVE ====================
      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      const filename = `Audit_Jobs_List_${timestamp}.pdf`;

      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfPreview({ url, filename });
      setIsPreviewOpen(true);

    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast.error("ไม่สามารถ Export PDF ได้", {
        description: getErrorMessage(error, "กรุณาลองใหม่อีกครั้ง"),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    if (!pdfPreview) return;
    const link = document.createElement("a");
    link.href = pdfPreview.url;
    link.download = pdfPreview.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    const selectedCount = Object.keys(selectedRows).filter((key) => selectedRows[key]).length;
    const exportedCount = getExportData().length;

    toast.success("Export PDF สำเร็จ", {
      description: selectedCount > 0
        ? `Export ${exportedCount} รายการที่เลือก`
        : `Export ทั้งหมด ${exportedCount} รายการ`,
    });

    // Call onExportComplete callback
    if (onExportComplete) {
      onExportComplete();
    }

    // Close preview
    setIsPreviewOpen(false);
    setPdfPreview(null);
  };

  const selectedCount = Object.keys(selectedRows).filter((key) => selectedRows[key]).length;
  const hasSelection = selectedCount > 0;
  const canExport = data.length > 0 && !disabled;

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
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    กำลังสร้าง...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-5 w-5" />
                    Export to PDF
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

      {/* PDF Preview Dialog */}
      <Dialog
        open={isPreviewOpen}
        onOpenChange={(open) => {
          setIsPreviewOpen(open);
          if (!open) {
            if (pdfPreview?.url) {
              URL.revokeObjectURL(pdfPreview.url);
            }
            setPdfPreview(null);
          }
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