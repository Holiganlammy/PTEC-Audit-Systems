/**
 * ====================================
 * AM AreaManage Draft Management
 * ====================================
 * จัดการ Draft ของ AreaManage Job ใน SessionStorage
 * - เก็บ Header + Items ใน SessionStorage
 * - เก็บไฟล์แนบ Header ใน IndexedDB (แยกตาม FormType)
 * - แยก Draft ตาม FormType (AM/AA)
 */

export interface AMAuditDraftHeader {
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
  BranchAssignment?: string;
  RoleFormType: "AM" | "AA";
}

export interface AMAuditDraftItem {
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

interface AMAuditDraft {
  header: AMAuditDraftHeader;
  items: AMAuditDraftItem[];
  timestamp: number;
}

export type AMDraftFormType = "AM" | "AA";

const DRAFT_KEY_PREFIX = "am_audit_draft";
const ACTIVE_DRAFT_FORM_KEY = "am_audit_draft_active_form";
const DRAFT_DB_NAME = "am_audit_draft_db";
const DRAFT_DB_VERSION = 1;
const DRAFT_FILE_STORE = "header_files";

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

function getDraftKey(formType: AMDraftFormType): string {
  return `${DRAFT_KEY_PREFIX}_${formType}`;
}

function getDraftFileKey(formType: AMDraftFormType): string {
  return `header_files_${formType}`;
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

export async function saveDraftHeaderFiles(
  files: File[],
  formType: AMDraftFormType
): Promise<void> {
  const db = await openDraftDB();
  const key = getDraftFileKey(formType);

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
    const record: DraftFileRecord = { key, files: storedFiles };

    if (storedFiles.length === 0) {
      store.delete(key);
    } else {
      store.put(record);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();
}

export async function loadDraftHeaderFiles(
  formType: AMDraftFormType
): Promise<File[]> {
  try {
    const db = await openDraftDB();
    const key = getDraftFileKey(formType);

    const record = await new Promise<DraftFileRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(DRAFT_FILE_STORE, "readonly");
      const store = tx.objectStore(DRAFT_FILE_STORE);
      const request = store.get(key);
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

export async function clearDraftHeaderFiles(formType?: AMDraftFormType): Promise<void> {
  try {
    const db = await openDraftDB();
    const keys = formType
      ? [getDraftFileKey(formType)]
      : ([getDraftFileKey("AM"), getDraftFileKey("AA")] as const);

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFT_FILE_STORE, "readwrite");
      const store = tx.objectStore(DRAFT_FILE_STORE);
      keys.forEach((key) => store.delete(key));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch (error) {
    console.error("Failed to clear draft header files:", error);
  }
}

function saveActiveDraftFormType(formType: AMDraftFormType): void {
  sessionStorage.setItem(ACTIVE_DRAFT_FORM_KEY, formType);
}

function getActiveDraftFormType(): AMDraftFormType | null {
  const data = sessionStorage.getItem(ACTIVE_DRAFT_FORM_KEY);
  if (data === "AM" || data === "AA") return data;
  return null;
}

export function saveDraft(draft: AMAuditDraft, formType: AMDraftFormType): void {
  try {
    sessionStorage.setItem(getDraftKey(formType), JSON.stringify(draft));
    saveActiveDraftFormType(formType);
    console.log("✓ AM draft saved to SessionStorage");
  } catch (error) {
    console.error("Failed to save AM draft:", error);
    throw new Error("ไม่สามารถบันทึก Draft ได้");
  }
}

export function loadDraft(formType?: AMDraftFormType): AMAuditDraft | null {
  try {
    const activeFormType = formType ?? getActiveDraftFormType();
    if (!activeFormType) return null;

    const data = sessionStorage.getItem(getDraftKey(activeFormType));
    if (!data) return null;

    const draft = JSON.parse(data) as AMAuditDraft;
    console.log("✓ AM draft loaded from SessionStorage");
    return draft;
  } catch (error) {
    console.error("Failed to load AM draft:", error);
    return null;
  }
}

export function updateDraftHeader(header: AMAuditDraftHeader, formType: AMDraftFormType): void {
  const draft = loadDraft(formType);
  const newDraft: AMAuditDraft = {
    header,
    items: draft?.items || [],
    timestamp: Date.now(),
  };
  saveDraft(newDraft, formType);
}

export function updateDraftItems(items: AMAuditDraftItem[], formType: AMDraftFormType): void {
  const draft = loadDraft(formType);
  if (!draft) {
    throw new Error("ไม่พบ Draft Header กรุณาสร้าง Header ก่อน");
  }

  const newDraft: AMAuditDraft = {
    ...draft,
    items,
    timestamp: Date.now(),
  };
  saveDraft(newDraft, formType);
}

export function clearDraft(formType?: AMDraftFormType): void {
  try {
    if (formType) {
      sessionStorage.removeItem(getDraftKey(formType));
      const active = getActiveDraftFormType();
      if (active === formType) {
        sessionStorage.removeItem(ACTIVE_DRAFT_FORM_KEY);
      }
    } else {
      sessionStorage.removeItem(getDraftKey("AM"));
      sessionStorage.removeItem(getDraftKey("AA"));
      sessionStorage.removeItem(ACTIVE_DRAFT_FORM_KEY);
    }
    void clearDraftHeaderFiles(formType);
    console.log("✓ AM draft cleared from SessionStorage");
  } catch (error) {
    console.error("Failed to clear AM draft:", error);
  }
}

export function hasDraft(formType: AMDraftFormType): boolean {
  return sessionStorage.getItem(getDraftKey(formType)) !== null;
}

export function getDraftInfo(formType?: AMDraftFormType): {
  branchName: string;
  auditDate: string;
  itemCount: number;
  timestamp: number;
} | null {
  const draft = loadDraft(formType);
  if (!draft) return null;

  return {
    branchName: draft.header.Address || "ไม่ระบุสาขา",
    auditDate: draft.header.Date,
    itemCount: draft.items.length,
    timestamp: draft.timestamp,
  };
}
