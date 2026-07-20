import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { loadSarabunFont } from "@/lib/font/THSarabunPSK";

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
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

/**
 * สร้างเอกสาร PDF สรุปผลการตรวจ (ใช้ร่วมกันระหว่างปุ่ม Export และการส่งเมลสรุปผลการตรวจ)
 * ไม่ trigger preview/download เอง — ผู้เรียกเป็นคนตัดสินใจว่าจะทำอะไรต่อกับ doc ที่ได้
 */
export async function buildAuditDetailPdf(
  jobData: AuditJobData,
  itemsToExport: AuditItem[],
  formType: "AM" | "AA" | "Audit" = "Audit"
): Promise<{ doc: jsPDF; filename: string }> {
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
            ["มอบหมายงานให้สาขา", jobData.branchAssignment || "-"],
          ]
        : [
            ["ผู้ตรวจสอบ", jobData.auditor?.fullname || "-"],
            ["ผู้จัดการเขต", jobData.districtManager?.fullname || "-"],
            ["ผู้จัดการสาขา", jobData.branchManager?.fullname || "-"],
            ["ผู้ทำรายการ", jobData.createdByUser?.fullname || "-"],
            ["หมายเหตุเพิ่มเติม", jobData.additionalNotes || "-"],
            ["มอบหมายงานให้สาขา", jobData.branchAssignment || "-"],
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

  return { doc, filename };
}
