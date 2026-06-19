"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type Row,
  type Header,
  type Cell,
} from "@tanstack/react-table";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
} from "lucide-react";
import { createAuditItemsColumns, DragHandleContext } from "./Column/Column";
import EditItemModal from "../EditItemModal";
import AddItemModal, { type DraftAddItem } from "../AdditemModal";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { toast } from "sonner";
import type { TaggedUser } from "./TagCell/TagCell";
import AMChecklistModal from "./Amchecklist/modal";
import ItemAttachmentModal from "./ItemAttachmentModal";


// ══════════════════════════════════════════════════════════════════════════════
// STICKY COLUMN HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * สร้าง CSS styles สำหรับ sticky column จาก column meta
 */
function getStickyStyle(meta?: {
  sticky?: "left" | "right";
  stickyOffset?: number;
  stickyWidth?: number;
  isLastSticky?: boolean;
}): React.CSSProperties | undefined {
  if (!meta?.sticky) return undefined;

  return {
    position: "sticky",
    [meta.sticky]: meta.stickyOffset ?? 0,
    zIndex: meta.isLastSticky ? 2 : 1,
    ...(meta.stickyWidth != null
      ? { width: `${meta.stickyWidth}px`, minWidth: `${meta.stickyWidth}px` }
      : {}),
  };
}

function getStickyClassName(meta?: {
  sticky?: "left" | "right";
  isLastSticky?: boolean;
}, isHeader?: boolean): string {
  if (!meta?.sticky) return "";

  const classes: string[] = [];

  // Background ทึบเพื่อบัง content ด้านหลัง
  if (isHeader) {
    // ตรงกับ TableHeader: bg-neutral-800 dark:bg-zinc-900
    classes.push("bg-neutral-800 dark:bg-zinc-900");
  } else {
    classes.push("bg-background");
  }

  // Shadow เฉพาะคอลัมน์สุดท้ายที่ sticky
  if (meta.isLastSticky) {
    if (meta.sticky === "left") {
      // clip-path ป้องกัน shadow ล้นด้านบน/ล่าง
      classes.push(
        "[box-shadow:4px_0_8px_-4px_rgba(0,0,0,0.1)]",
        "[clip-path:inset(0_-8px_0_0)]"
      );
    } else {
      classes.push(
        "[box-shadow:-4px_0_8px_-4px_rgba(0,0,0,0.1)]",
        "[clip-path:inset(0_0_0_-8px)]"
      );
    }
  }

  return classes.join(" ");
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface ApiUser {
  UserID: string;
  UserCode: string;
  Fullname: string;
  Email: string;
}

type BranchScoreValue = -1 | 0 | 1;
type BranchScoreEntry = { scoreId?: number; score: BranchScoreValue; note?: string };

type BranchAuditScoreApiRow = {
  scoreId: number;
  jobId: number;
  branchId: number;
  itemId: number;
  score: BranchScoreValue;
  createdBy: number;
  createdAt: string;
  remarks: string | null;
  active: boolean;
};

// ══════════════════════════════════════════════════════════════════════════════
// SORTABLE ROW (ใช้ sticky style ด้วย)
// ══════════════════════════════════════════════════════════════════════════════

function SortableTableRow({ row, viewport }: { row: Row<AuditItem>; viewport: 'mobile' | 'tablet' | 'desktop'; }) {
  const {
    setNodeRef,
    transform,
    transition,
    listeners,
    attributes,
    isDragging,
  } = useSortable({ id: row.original.item_id });

  return (
    <DragHandleContext.Provider value={{ listeners, attributes }}>
      <TableRow
        ref={setNodeRef}
        id={`item-${row.original.item_id}`}
        data-item-id={row.original.item_id}
        data-state={row.getIsSelected() && "selected"}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.5 : 1,
          position: isDragging ? "relative" : undefined,
          zIndex: isDragging ? 10 : undefined,
        }}
      >
        {row.getVisibleCells().map((cell: Cell<AuditItem, unknown>) => {
          const meta = cell.column.columnDef.meta;
          return (
            <TableCell
              key={cell.id}
              style={viewport === 'mobile' ? undefined : getStickyStyle(meta)}
              className={viewport === 'mobile' ? '' : getStickyClassName(meta, false)}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          );
        })}
      </TableRow>
    </DragHandleContext.Provider>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

interface DataTableItemListProps {
  items: AuditItem[];
  jobNo: string;
  jobId: number;
  jobData?: AuditJobData;
  isLoading?: boolean;
  isLocked?: boolean;
  showAddButton?: boolean;
  isDraftMode?: boolean;
  inspectionDate?: string;
  positionType?: string;
  onItemsChange: (updatedItems?: AuditItem[]) => void;
  onCommentsChange?: (
    itemId: number,
    threadType: 1 | 2 | 3,
    comments: AuditComment[]
  ) => void;
  onSelectionChange?: (items: AuditItem[]) => void;
  highlightItemId?: number;
  highlightThreadType?: number;
}

export default function DataTableItemList({
  items,
  jobNo,
  jobId,
  jobData,
  isLoading = false,
  isLocked = false,
  isDraftMode = false,
  inspectionDate,
  positionType,
  onItemsChange,
  onCommentsChange,
  onSelectionChange,
  highlightItemId,
  highlightThreadType,
}: DataTableItemListProps) {
  const { data: session } = useSession();
  const [orderedItems, setOrderedItems] = useState<AuditItem[]>(items);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [pageIndex, setPageIndex] = useState(0);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [taggedUsersMap, setTaggedUsersMap] = useState<Record<number, TaggedUser[]>>({});
  const [branchScoresMap, setBranchScoresMap] = useState<Record<number, BranchScoreEntry>>({});
  const [attachmentCountsMap, setAttachmentCountsMap] = useState<Record<number, number>>({});

  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<AuditItem | null>(null);
  const [openAMChecklistModal, setOpenAMChecklistModal] = useState(false);
  const [selectedAMChecklistItem, setSelectedAMChecklistItem] = useState<AuditItem | null>(null);
  const [openAttachmentModal, setOpenAttachmentModal] = useState(false);
  const [selectedAttachmentItem, setSelectedAttachmentItem] = useState<AuditItem | null>(null);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setViewport(w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => { setOrderedItems(items); }, [items]);

  useEffect(() => {
    client.get("/users", { headers: dataConfig().headers })
      .then((res) => { if (Array.isArray(res.data)) setUsers(res.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    client.get("/audit-items/all/tagged-users", { headers: dataConfig().headers })
      .then((res) => {
        const list: TaggedUser[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        const map: Record<number, TaggedUser[]> = {};
        list.forEach((entry) => {
          const id = entry.itemId;
          if (id == null) return;
          if (!map[id]) map[id] = [];
          map[id].push({ userId: entry.userId, userCode: entry.userCode, fullname: entry.fullname });
        });
        setTaggedUsersMap(map);
      })
      .catch(() => {});
  }, []);

  const fetchBranchScores = useCallback(async () => {
    const branchId = Number(jobData?.branchId);
    if (!Number.isFinite(branchId)) return;
    const res = await client.get("/branch-audit-scores/list", {
      params: { jobId, branchId },
      headers: dataConfig().headers,
    });
    const list: BranchAuditScoreApiRow[] = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
    const latestByItem: Record<number, BranchAuditScoreApiRow> = {};
    for (const row of list) {
      if (!row?.active) continue;
      const prev = latestByItem[row.itemId];
      if (!prev || Date.parse(row.createdAt) >= Date.parse(prev.createdAt)) {
        latestByItem[row.itemId] = row;
      }
    }
    const map: Record<number, BranchScoreEntry> = {};
    for (const [id, row] of Object.entries(latestByItem)) {
      map[Number(id)] = { scoreId: row.scoreId, score: row.score, note: row.remarks ?? undefined };
    }
    setBranchScoresMap(map);
  }, [jobId, jobData?.branchId]);

  useEffect(() => { fetchBranchScores().catch(() => {}); }, [fetchBranchScores]);

  const fetchAttachmentCounts = useCallback(async () => {
    if (isDraftMode || !jobId) return;
 
    try {
      const res = await client.get(`/audit-items/attachments/by-job/${jobId}`, {
        headers: dataConfig().headers,
      });
 
      if (res.data?.success && res.data?.data) {
        const grouped: Record<string, Array<{ fileId: number }>> = res.data.data;
        const map: Record<number, number> = {};
 
        for (const [itemIdStr, files] of Object.entries(grouped)) {
          map[Number(itemIdStr)] = Array.isArray(files) ? files.length : 0;
        }
 
        setAttachmentCountsMap(map);
      }
    } catch (error) {
      console.error("Error fetching attachment counts:", error);
    }
  }, [jobId, isDraftMode]);

  useEffect(() => { fetchAttachmentCounts().catch(() => {}); }, [fetchAttachmentCounts]);

  const handleEdit = useCallback((item: AuditItem) => { setSelectedItem(item); setOpenEditModal(true); }, []);
  const handleTagChange = useCallback((itemId: number, tags: TaggedUser[]) => { setTaggedUsersMap((prev) => ({ ...prev, [itemId]: tags })); }, []);
  const handleCommentsChange = useCallback((itemId: number, threadType: 1 | 2 | 3, comments: AuditComment[]) => {
    const noteKey = threadType === 1 ? "note_1" : threadType === 2 ? "note_2" : "note_3";
    setOrderedItems((prev) => prev.map((item) => item.item_id === itemId ? { ...item, [noteKey]: comments } : item));
    onCommentsChange?.(itemId, threadType, comments);
  }, [onCommentsChange]);

  const handleAMChecklistClick = useCallback((item: AuditItem) => { setSelectedAMChecklistItem(item); setOpenAMChecklistModal(true); }, []);
  const handleAttachmentClick = useCallback((item: AuditItem) => { setSelectedAttachmentItem(item); setOpenAttachmentModal(true); }, []);

  // Permission logic for AM Checklist: role 1, 2, 4 หรือ role 3 ที่เป็น District Manager ของงานนี้
  const isAMChecklistAllowed = (() => {
    const roleId = session?.user?.role_id;
    const userId = String(session?.user?.UserID ?? "");
    if (roleId === 1 || roleId === 2 || roleId === 4) return true;
    return userId !== "" && userId === String(jobData?.districtManager?.userId ?? "");
  })();

  // Permission logic for visible Audit items:
  // - role 1, 2, 4: เห็นทุก item
  // - role 3: เห็นทุก item ถ้าเป็น District Manager ของงานนี้, ถ้าไม่ใช่จะเห็นเฉพาะ item ที่ถูก tag
  // - อื่นๆ: เห็นเฉพาะ item ที่ถูก tag
  const { visibleItems, accessDenied } = useMemo(() => {
    const roleId = session?.user?.role_id;
    const userId = session?.user?.UserID;
    if (!userId) return { visibleItems: [], accessDenied: false };
    if (roleId === 1 || roleId === 2 || roleId === 4) return { visibleItems: orderedItems, accessDenied: false };
    if (roleId === 3) {
      const isJobMember = userId == jobData?.districtManager?.userId;
      if (!isJobMember) return { visibleItems: [], accessDenied: true };
      return { visibleItems: orderedItems, accessDenied: false };
    }
    return {
      visibleItems: orderedItems.filter((item) => (taggedUsersMap[item.item_id] ?? []).some((t) => t.userId == String(userId))),
      accessDenied: false,
    };
  }, [orderedItems, taggedUsersMap, session, jobData]);

  const handleDelete = useCallback((item: AuditItem) => { setDeleteItem(item); }, []);

  const handleBranchScoreSubmit = useCallback(async (itemId: number, score: BranchScoreValue, note?: string) => {
    const existing = branchScoresMap[itemId];
    if (existing?.scoreId) {
      await client.put(`/branch-audit-scores/${existing.scoreId}`, { score, remarks: note, updatedBy: session?.user?.UserID }, { headers: dataConfig().headers });
      setBranchScoresMap((prev) => ({ ...prev, [itemId]: { scoreId: existing.scoreId, score, note } }));
      toast.success("แก้ไขคะแนนสาขาเรียบร้อย");
    } else {
      await client.post("/branch-audit-scores/create", { jobId, itemId, branchId: Number(jobData?.branchId), score, remarks: note, createdBy: String(session?.user?.UserID ?? ""), createdDate: new Date().toISOString() }, { headers: dataConfig().headers });
      await fetchBranchScores();
      toast.success("บันทึกคะแนนสาขาเรียบร้อย");
    }
  }, [jobId, jobData, session, branchScoresMap, fetchBranchScores]);

  const branchScoreSummary = useMemo(() => {
    let plus = 0, zero = 0, minus = 0, total = 0, scored = 0;
    for (const item of visibleItems) {
      const entry = branchScoresMap[item.item_id];
      if (!entry) continue;
      scored += 1; total += entry.score;
      if (entry.score === 1) plus += 1; else if (entry.score === 0) zero += 1; else minus += 1;
    }
    return { plus, zero, minus, total, scored, unscored: Math.max(0, visibleItems.length - scored) };
  }, [visibleItems, branchScoresMap]);

  const canShowAddButton = session?.user?.role_id === 1 || session?.user?.role_id === 2;

  const confirmDelete = async () => {
    if (!deleteItem) return;
    if (isDraftMode) {
      const newItems = orderedItems.filter((item) => item.item_id !== deleteItem.item_id);
      setOrderedItems(newItems); onItemsChange(newItems); setDeleteItem(null);
      toast.success("ลบรายการสำเร็จ"); return;
    }
    try {
      await client.delete(`/audit-items/${deleteItem.item_id}`, { headers: dataConfig().headers });
      toast.success("ลบรายการสำเร็จ"); onItemsChange();
    } catch { toast.error("ไม่สามารถลบรายการได้"); }
    finally { setDeleteItem(null); }
  };

  const handleDraftItemAdd = useCallback((draftItems: DraftAddItem[]) => {
    const now = new Date().toISOString();
    const newItems: AuditItem[] = draftItems.map((draftItem) => {
      const tempNote1: AuditComment[] = draftItem.remarks
        ? [{ id: -(Date.now() + Math.random()), itemId: 0, userId: Number(session?.user?.UserID ?? 0), author: [session?.user?.fristName ?? "", session?.user?.lastName ?? ""].filter(Boolean).join(" ") || session?.user?.UserCode || "Draft", text: draftItem.remarks, approverStatus: draftItem.auditCommentStatus === "0" ? 0 : null, createdAt: now, updatedAt: now }]
        : [];
      return { item_id: -(Date.now() + Math.random()), job_id: 0, category_item_id: draftItem.category_item_id, category_name: draftItem.category_name, inspection_date: draftItem.inspection_date, item_status: draftItem.item_status, item_status_edit: null, remarks: draftItem.remarks, note_1: tempNote1, note_2: [], note_3: [], created_at: now, updated_at: now, active: true };
    });
    const merged = [...orderedItems, ...newItems];
    setOrderedItems(merged);
    onItemsChange(merged);
  }, [orderedItems, onItemsChange, session]);

  const columns = useMemo(
    () => createAuditItemsColumns(handleEdit, handleDelete, onItemsChange, users, taggedUsersMap, handleTagChange, handleCommentsChange, jobData, isLocked, handleAMChecklistClick, handleAttachmentClick, isAMChecklistAllowed, branchScoresMap, handleBranchScoreSubmit, session?.user?.role_id === 1 || session?.user?.role_id === 2, isDraftMode, attachmentCountsMap, viewport, highlightItemId, highlightThreadType),
    [handleEdit, handleDelete, onItemsChange, users, taggedUsersMap, handleTagChange, handleCommentsChange, jobData, isLocked, handleAMChecklistClick, handleAttachmentClick, isAMChecklistAllowed, branchScoresMap, handleBranchScoreSubmit, session, isDraftMode, attachmentCountsMap, viewport, highlightItemId, highlightThreadType]
  );

  // เมื่อโหลดข้อมูลเสร็จและมี highlightItemId ให้ scroll ไปหา row นั้น
  useEffect(() => {
    if (!highlightItemId || orderedItems.length === 0) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-item-id="${highlightItemId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 500);
    return () => clearTimeout(timer);
  }, [highlightItemId, orderedItems.length]);

  useEffect(() => {
    if (onSelectionChange) {
      const selected = visibleItems.filter((item) => rowSelection[String(item.item_id)]);
      onSelectionChange(selected);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection, visibleItems]);

  const table = useReactTable({
    data: visibleItems,
    columns,
    getRowId: (row) => String(row.item_id),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    state: { globalFilter: search, pagination: { pageIndex, pageSize }, rowSelection },
    onGlobalFilterChange: setSearch,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex); setPageSize(next.pageSize);
    },
    globalFilterFn: (row, _, filterValue) => {
      const name = (row.getValue<string>("category_name") ?? "").toLowerCase();
      return name.includes((filterValue as string).toLowerCase());
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedItems((prev) => {
      const oldIndex = prev.findIndex((item) => item.item_id === active.id);
      const newIndex = prev.findIndex((item) => item.item_id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const rows = table.getRowModel().rows;
  const noPermission = !isLoading && (accessDenied || (orderedItems.length > 0 && visibleItems.length === 0));

  return (
    <div className="flex flex-1 flex-col gap-4 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <Input placeholder="ค้นหารายการ..." value={search} onChange={(e) => { setSearch(e.target.value); setPageIndex(0); }} className="max-w-sm" disabled={isLoading} />
        {/* {!isLocked && showAddButton && ( */}
        {!isLocked && canShowAddButton && (
          <Button className="text-xs sm:text-sm" onClick={() => setOpenAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มรายการ
          </Button>
        )}
      </div>

      {/* Branch Score Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs sm:text-sm text-muted-foreground">สรุปคะแนนสาขา</div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">รวม: {branchScoreSummary.total}</Badge>
          <Badge className="bg-green-500 dark:bg-green-700 text-white border-transparent">+1: {branchScoreSummary.plus}</Badge>
          <Badge className="bg-yellow-500 dark:bg-yellow-700 text-white border-transparent">0: {branchScoreSummary.zero}</Badge>
          <Badge className="bg-destructive dark:bg-red-700 text-white border-transparent">-1: {branchScoreSummary.minus}</Badge>
          <Badge variant="outline">ยังไม่ให้คะแนน: {branchScoreSummary.unscored}</Badge>
        </div>
      </div>

      {/* DnD Table with Sticky Columns */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleItems.map((item) => item.item_id)} strategy={verticalListSortingStrategy}>
          <div
            className="rounded-md border overflow-auto bg-background"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            <table className="w-full caption-bottom text-xs xl:text-sm">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header: Header<AuditItem, unknown>) => {
                      const meta = header.column.columnDef.meta;
                      return (
                        <TableHead
                          key={header.id}
                          style={viewport === 'mobile' ? undefined : getStickyStyle(meta)}
                          className={viewport === 'mobile' ? '' : getStickyClassName(meta, true)}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <TableRow key={i}>
                      {columns.map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length ? (
                  rows.map((row) => <SortableTableRow key={row.id} row={row} viewport={viewport} />)
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                      {noPermission ? "🔒 คุณไม่มีสิทธิ์ในการดูรายการเหล่านี้" : "ไม่พบรายการ"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </table>
          </div>
        </SortableContext>
      </DndContext>

      {/* Pagination */}
      <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs sm:text-sm text-muted-foreground">{table.getFilteredRowModel().rows.length} รายการทั้งหมด</div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <p className="text-xs sm:text-sm font-medium whitespace-nowrap">Rows per page</p>
            <Select value={`${pageSize}`} onValueChange={(v) => { setPageSize(Number(v)); setPageIndex(0); }}>
              <SelectTrigger className="h-8 w-17.5"><SelectValue placeholder={pageSize} /></SelectTrigger>
              <SelectContent side="top">{[10, 20, 50, 100].map((s) => (<SelectItem key={s} value={`${s}`}>{s}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPageIndex(0)} disabled={!table.getCanPreviousPage()}><ChevronsLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPageIndex((p) => p - 1)} disabled={!table.getCanPreviousPage()}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs sm:text-sm whitespace-nowrap px-1">หน้า {pageIndex + 1} / {table.getPageCount() || 1}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPageIndex((p) => p + 1)} disabled={!table.getCanNextPage()}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}><ChevronsRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddItemModal open={openAddModal} onOpenChange={setOpenAddModal} jobNo={jobNo} jobId={jobId} jobData={jobData || undefined} isDraftMode={isDraftMode} inspectionDate={inspectionDate} positionType={positionType} onDraftItemAdd={isDraftMode ? handleDraftItemAdd : undefined} onItemAdded={() => { setOpenAddModal(false); onItemsChange(); }} />
     <EditItemModal open={openEditModal} onOpenChange={setOpenEditModal} item={selectedItem} jobData={jobData} onItemUpdated={() => { setOpenEditModal(false); onItemsChange(); }} />
      <AMChecklistModal open={openAMChecklistModal} onOpenChange={setOpenAMChecklistModal} item={selectedAMChecklistItem} onUpdated={() => { setOpenAMChecklistModal(false); onItemsChange(); }} />
      <ItemAttachmentModal open={openAttachmentModal} onOpenChange={setOpenAttachmentModal} item={selectedAttachmentItem} readOnly={selectedAttachmentItem?.item_status_edit === 4} onUpdated={() => { onItemsChange(); fetchAttachmentCounts().catch(() => {}); }} />
 
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => { if (!open) setDeleteItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบรายการ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบรายการ <span className="font-medium text-foreground">&quot;{deleteItem?.category_name}&quot;</span> ใช่หรือไม่?<br />
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">ลบรายการ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
