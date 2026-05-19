/**
 * ====================================
 * Audit Draft Management
 * ====================================
 * จัดการ Draft ของ Audit Job ใน SessionStorage
 * - เก็บ Header + Items
 * - ไฟล์ไม่เก็บใน SessionStorage (เก็บใน React State)
 */

export interface AuditDraftHeader {
  Branch: string;
  Firstname: string;
  Lastname: string;
  Date: string; // ISO string
  PMCode: string;
  Address: string;
  Auditor: string;
  DistrictManager: string;
  BranchManager?: string;
  AdditionalNotes?: string;
  Type: "visit" | "online";
}

export interface AuditDraftItem {
  tempId: string; // Unique temp ID for draft
  category_item_id: number;
  category_name: string;
  inspection_date: string;
  item_status: number;
  item_status_edit: number | null;
  remarks: string;
  note_1: AuditComment[];
  note_2: AuditComment[];
  note_3: AuditComment[];
}

interface AuditDraft {
  header: AuditDraftHeader;
  items: AuditDraftItem[];
  timestamp: number;
}

const DRAFT_KEY = "audit_draft";

/**
 * บันทึก Draft
 */
export function saveDraft(draft: AuditDraft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    console.log("✓ Draft saved to SessionStorage");
  } catch (error) {
    console.error("Failed to save draft:", error);
    throw new Error("ไม่สามารถบันทึก Draft ได้");
  }
}

/**
 * โหลด Draft
 */
export function loadDraft(): AuditDraft | null {
  try {
    const data = sessionStorage.getItem(DRAFT_KEY);
    if (!data) return null;

    const draft = JSON.parse(data) as AuditDraft;
    console.log("✓ Draft loaded from SessionStorage");
    return draft;
  } catch (error) {
    console.error("Failed to load draft:", error);
    return null;
  }
}

/**
 * อัพเดท Header
 */
export function updateDraftHeader(header: AuditDraftHeader): void {
  const draft = loadDraft();
  const newDraft: AuditDraft = {
    header,
    items: draft?.items || [],
    timestamp: Date.now(),
  };
  saveDraft(newDraft);
}

/**
 * อัพเดท Items
 */
export function updateDraftItems(items: AuditDraftItem[]): void {
  const draft = loadDraft();
  if (!draft) {
    throw new Error("ไม่พบ Draft Header กรุณาสร้าง Header ก่อน");
  }

  const newDraft: AuditDraft = {
    ...draft,
    items,
    timestamp: Date.now(),
  };
  saveDraft(newDraft);
}

/**
 * เพิ่ม Item เดียว
 */
export function addDraftItem(item: AuditDraftItem): void {
  const draft = loadDraft();
  if (!draft) {
    throw new Error("ไม่พบ Draft Header กรุณาสร้าง Header ก่อน");
  }

  const newDraft: AuditDraft = {
    ...draft,
    items: [...draft.items, item],
    timestamp: Date.now(),
  };
  saveDraft(newDraft);
}

/**
 * ลบ Item
 */
export function removeDraftItem(tempId: string): void {
  const draft = loadDraft();
  if (!draft) return;

  const newDraft: AuditDraft = {
    ...draft,
    items: draft.items.filter((item) => item.tempId !== tempId),
    timestamp: Date.now(),
  };
  saveDraft(newDraft);
}

/**
 * ลบ Draft ทั้งหมด
 */
export function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
    console.log("✓ Draft cleared from SessionStorage");
  } catch (error) {
    console.error("Failed to clear draft:", error);
  }
}

/**
 * ตรวจสอบว่ามี Draft หรือไม่
 */
export function hasDraft(): boolean {
  return sessionStorage.getItem(DRAFT_KEY) !== null;
}

/**
 * ดึง Draft Info (สำหรับแสดงใน List)
 */
export function getDraftInfo(): {
  branchName: string;
  auditDate: string;
  itemCount: number;
  timestamp: number;
} | null {
  const draft = loadDraft();
  if (!draft) return null;

  return {
    branchName: draft.header.Address || "ไม่ระบุสาขา",
    auditDate: draft.header.Date,
    itemCount: draft.items.length,
    timestamp: draft.timestamp,
  };
}