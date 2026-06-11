/**
 * ====================================
 * Audit Draft Management
 * ====================================
 * จัดการ Draft ของ Audit Job ใน SessionStorage
 * - เก็บ Header + Items ใน SessionStorage
 * - เก็บไฟล์แนบ Header ใน IndexedDB
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
const DRAFT_DB_NAME = "audit_draft_db";
const DRAFT_DB_VERSION = 1;
const DRAFT_FILE_STORE = "header_files";
const DRAFT_FILE_KEY = "header_files";

interface DraftFileRecord {
  key: string;
  files: Array<{
    name: string;
    type: string;
    lastModified: number;
    size: number;
    data: ArrayBuffer;
  }>;
}

function openDraftDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DRAFT_DB_NAME, DRAFT_DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DRAFT_FILE_STORE)) {
        db.createObjectStore(DRAFT_FILE_STORE, { keyPath: "key" });
      }
    };
  });
}

export async function saveDraftHeaderFiles(files: File[]): Promise<void> {
  const db = await openDraftDB();

  const storedFiles = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
      size: file.size,
      data: await file.arrayBuffer(),
    }))
  );

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DRAFT_FILE_STORE, "readwrite");
    const store = tx.objectStore(DRAFT_FILE_STORE);
    const record: DraftFileRecord = { key: DRAFT_FILE_KEY, files: storedFiles };

    if (storedFiles.length === 0) {
      store.delete(DRAFT_FILE_KEY);
    } else {
      store.put(record);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();
}

export async function loadDraftHeaderFiles(): Promise<File[]> {
  try {
    const db = await openDraftDB();

    const record = await new Promise<DraftFileRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(DRAFT_FILE_STORE, "readonly");
      const store = tx.objectStore(DRAFT_FILE_STORE);
      const request = store.get(DRAFT_FILE_KEY);
      request.onsuccess = () => resolve(request.result as DraftFileRecord | undefined);
      request.onerror = () => reject(request.error);
    });

    db.close();

    if (!record?.files?.length) return [];

    return record.files.map(
      (file) =>
        new File([file.data], file.name, {
          type: file.type,
          lastModified: file.lastModified,
        })
    );
  } catch (error) {
    console.error("Failed to load draft header files:", error);
    return [];
  }
}

export async function clearDraftHeaderFiles(): Promise<void> {
  try {
    const db = await openDraftDB();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFT_FILE_STORE, "readwrite");
      const store = tx.objectStore(DRAFT_FILE_STORE);
      store.delete(DRAFT_FILE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch (error) {
    console.error("Failed to clear draft header files:", error);
  }
}

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
    void clearDraftHeaderFiles();
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