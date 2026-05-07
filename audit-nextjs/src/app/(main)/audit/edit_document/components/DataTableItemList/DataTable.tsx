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
} from "@tanstack/react-table";
import {
  Table,
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
import AddItemModal from "../AdditemModal";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { toast } from "sonner";
import type { TaggedUser } from "./TagCell/TagCell";
import AMChecklistModal from "./Amchecklist/modal";

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

function SortableTableRow({ row }: { row: Row<AuditItem> }) {
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
        data-state={row.getIsSelected() && "selected"}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.5 : 1,
          position: isDragging ? "relative" : undefined,
          zIndex: isDragging ? 1 : undefined,
        }}
      >
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    </DragHandleContext.Provider>
  );
}

interface DataTableItemListProps {
  items: AuditItem[];
  jobNo: string;
  jobId: number;
  jobData?: AuditJobData;
  isLoading?: boolean;
  isLocked?: boolean;
  showAddButton?: boolean;
  onItemsChange: () => void;
  onCommentsChange?: (
    itemId: number,
    threadType: 1 | 2 | 3,
    comments: AuditComment[]
  ) => void;
}

export default function DataTableItemList({
  items,
  jobNo,
  jobId,
  jobData,
  isLoading = false,
  isLocked = false,
  showAddButton = false,
  onItemsChange,
  onCommentsChange,
}: DataTableItemListProps) {
  const { data: session } = useSession();
  const [orderedItems, setOrderedItems] = useState<AuditItem[]>(items);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [pageIndex, setPageIndex] = useState(0);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [taggedUsersMap, setTaggedUsersMap] = useState<Record<number, TaggedUser[]>>({});
  const [branchScoresMap, setBranchScoresMap] = useState<Record<number, BranchScoreEntry>>({});

  // Modal state
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<AuditItem | null>(null);
  const [openAMChecklistModal, setOpenAMChecklistModal] = useState(false);
  const [selectedAMChecklistItem, setSelectedAMChecklistItem] = useState<AuditItem | null>(null);

  // Sync when parent refreshes items
  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  // Fetch users once for TagCell
  useEffect(() => {
    client
      .get("/users", { headers: dataConfig().headers })
      .then((res) => {
        if (Array.isArray(res.data)) setUsers(res.data);
      })
      .catch(() => {});
  }, []);

  // Fetch all tagged users and group by item_id
  useEffect(() => {
    client
      .get("/audit-items/all/tagged-users", { headers: dataConfig().headers })
      .then((res) => {
        const list: { itemId?: number; item_id?: number; userId: string; userCode: string; fullname: string }[] =
          Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        const map: Record<number, TaggedUser[]> = {};
        list.forEach((entry) => {
          const id = entry.itemId ?? entry.item_id;
          if (id == null) return;
          if (!map[id]) map[id] = [];
          map[id].push({ userId: entry.userId, userCode: entry.userCode, fullname: entry.fullname });
        });
        setTaggedUsersMap(map);
      })
      .catch(() => {});
  }, []);

  // Fetch branch audit scores and group by itemId
  const fetchBranchScores = useCallback(async () => {
    const branchId = Number(jobData?.branchId);
    if (!Number.isFinite(branchId)) return;

    const res = await client.get("/branch-audit-scores/list", {
      params: { jobId, branchId },
      headers: dataConfig().headers,
    });

    const list: BranchAuditScoreApiRow[] = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.data)
      ? res.data.data
      : [];

    const latestByItem: Record<number, BranchAuditScoreApiRow> = {};
    for (const row of list) {
      if (!row?.active) continue;
      const prev = latestByItem[row.itemId];
      if (!prev) {
        latestByItem[row.itemId] = row;
        continue;
      }
      const prevTime = Date.parse(prev.createdAt);
      const nextTime = Date.parse(row.createdAt);
      if (!Number.isNaN(nextTime) && (Number.isNaN(prevTime) || nextTime >= prevTime)) {
        latestByItem[row.itemId] = row;
      }
    }

    const map: Record<number, BranchScoreEntry> = {};
    for (const [itemIdText, row] of Object.entries(latestByItem)) {
      const id = Number(itemIdText);
      map[id] = {
        scoreId: row.scoreId,
        score: row.score,
        note: row.remarks ?? undefined,
      };
    }

    setBranchScoresMap(map);
  }, [jobId, jobData?.branchId]);

  useEffect(() => {
    fetchBranchScores().catch((err) => {
      console.error("❌ Error fetching branch audit scores:", err);
    });
  }, [fetchBranchScores]);

  const handleEdit = useCallback((item: AuditItem) => {
    setSelectedItem(item);
    setOpenEditModal(true);
  }, []);

  const handleTagChange = useCallback((itemId: number, tags: TaggedUser[]) => {
    setTaggedUsersMap((prev) => ({ ...prev, [itemId]: tags }));
  }, []);

  const handleCommentsChange = useCallback((itemId: number, threadType: 1 | 2 | 3, comments: AuditComment[]) => {
    const noteKey = threadType === 1 ? "note_1" : threadType === 2 ? "note_2" : "note_3";
    setOrderedItems((prev) =>
      prev.map((item) =>
        item.item_id === itemId ? { ...item, [noteKey]: comments } : item
      )
    );
    onCommentsChange?.(itemId, threadType, comments);
  }, [onCommentsChange]);

  const handleAMChecklistClick = useCallback((item: AuditItem) => {
    setSelectedAMChecklistItem(item);
    setOpenAMChecklistModal(true);
  }, []);

  const isAMChecklistAllowed = (() => {
    const roleId = session?.user?.role_id;
    const userId = String(session?.user?.UserID ?? "");
    if (roleId === 1 || roleId === 2) return true;
    return userId !== "" && userId === String(jobData?.districtManager?.userId ?? "");
  })();

  // ── Permission filter ──────────────────────────────────────────────────────
  const { visibleItems, accessDenied } = useMemo(() => {
    const roleId = session?.user?.role_id;
    const userId = session?.user?.UserID;
    if (!userId) return { visibleItems: [], accessDenied: false };

    // role 1 หรือ 2: เห็นทุก item
    if (roleId === 1 || roleId === 2)
      return { visibleItems: orderedItems, accessDenied: false };

    // role 3: ต้องเป็น districtManager ของ job นี้
    if (roleId === 3) {
      const isJobMember = userId == jobData?.districtManager?.userId;
      if (!isJobMember) return { visibleItems: [], accessDenied: true };
      return { visibleItems: orderedItems, accessDenied: false };
    }

    // อื่นๆ: เห็นเฉพาะ item ที่ถูก tag
    return {
      visibleItems: orderedItems.filter((item) =>
        (taggedUsersMap[item.item_id] ?? []).some(
          (t) => t.userId == String(userId)
        )
      ),
      accessDenied: false,
    };
  }, [orderedItems, taggedUsersMap, session, jobData]);

  const handleDelete = useCallback((item: AuditItem) => {
    setDeleteItem(item);
  }, []);

  // onSubmit ของ BranchScoreCell จะส่ง itemId, score, note มาให้ handleBranchScoreSubmit เพื่อบันทึกผ่าน API และอัปเดต state
  const handleBranchScoreSubmit = useCallback(
    async (itemId: number, score: BranchScoreValue, note?: string) => {
      const existing = branchScoresMap[itemId];

      if (existing?.scoreId) {
        // แก้ไข — PUT /branch-audit-scores/:id
        await client.put(
          `/branch-audit-scores/${existing.scoreId}`,
          {
            score,
            remarks: note,
            updatedBy: session?.user?.UserID,
          },
          { headers: dataConfig().headers }
        );

        setBranchScoresMap((prev) => ({
          ...prev,
          [itemId]: { scoreId: existing.scoreId, score, note },
        }));
        toast.success("แก้ไขคะแนนสาขาเรียบร้อย");
      } else {
        // เพิ่มใหม่ — POST /branch-audit-scores/create
        await client.post(
          "/branch-audit-scores/create",
          {
            jobId,
            itemId,
            branchId: Number(jobData?.branchId),
            score,
            remarks: note,
            createdBy: String(session?.user?.UserID ?? ""),
            createdDate: new Date().toISOString(),
          },
          { headers: dataConfig().headers }
        );

        // refetch เพื่อให้ได้ scoreId ที่ถูกต้องสำหรับการแก้ไขครั้งถัดไป
        await fetchBranchScores();
        toast.success("บันทึกคะแนนสาขาเรียบร้อย");
      }
    },
    [jobId, jobData, session, branchScoresMap, fetchBranchScores]
  );

  const branchScoreSummary = useMemo(() => {
    let plus = 0;
    let zero = 0;
    let minus = 0;
    let total = 0;
    let scored = 0;

    for (const item of visibleItems) {
      const entry = branchScoresMap[item.item_id];
      if (!entry) continue;
      scored += 1;
      total += entry.score;
      if (entry.score === 1) plus += 1;
      else if (entry.score === 0) zero += 1;
      else minus += 1;
    }

    return {
      plus,
      zero,
      minus,
      total,
      scored,
      unscored: Math.max(0, visibleItems.length - scored),
    };
  }, [visibleItems, branchScoresMap]);

  const confirmDelete = async () => {
    if (!deleteItem) return;
    try {
      await client.delete(`/audit-items/${deleteItem.item_id}`, {
        headers: dataConfig().headers,
      });
      toast.success("ลบรายการสำเร็จ");
      onItemsChange();
    } catch {
      toast.error("ไม่สามารถลบรายการได้");
    } finally {
      setDeleteItem(null);
    }
  };

  const columns = useMemo(
    () =>
      createAuditItemsColumns(
        handleEdit,
        handleDelete,
        onItemsChange,
        users,
        taggedUsersMap,
        handleTagChange,
        handleCommentsChange,
        jobData,
        isLocked,
        handleAMChecklistClick,
        isAMChecklistAllowed,
        branchScoresMap,
        handleBranchScoreSubmit
      ),
    [
      handleEdit,
      handleDelete,
      onItemsChange,
      users,
      taggedUsersMap,
      handleTagChange,
      handleCommentsChange,
      jobData,
      isLocked,
      handleAMChecklistClick,
      isAMChecklistAllowed,
      branchScoresMap,
      handleBranchScoreSubmit,
    ]
  );

  const table = useReactTable({
    data: visibleItems,
    columns,
    getRowId: (row) => String(row.item_id),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      globalFilter: search,
      pagination: { pageIndex, pageSize },
    },
    onGlobalFilterChange: setSearch,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize })
          : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
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
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="ค้นหารายการ..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPageIndex(0);
          }}
          className="max-w-sm"
          disabled={isLoading}
        />
        {!isLocked && showAddButton && (
          <Button onClick={() => setOpenAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มรายการ
          </Button>
        )}
      </div>

      {/* Branch Score Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">สรุปคะแนนสาขา</div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">รวม: {branchScoreSummary.total}</Badge>
          <Badge>+1: {branchScoreSummary.plus}</Badge>
          <Badge variant="secondary">0: {branchScoreSummary.zero}</Badge>
          <Badge variant="destructive">-1: {branchScoreSummary.minus}</Badge>
          <Badge variant="outline">ยังไม่ให้คะแนน: {branchScoreSummary.unscored}</Badge>
        </div>
      </div>

      {/* DnD Table */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleItems.map((item) => item.item_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <TableRow key={i}>
                      {columns.map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length ? (
                  rows.map((row) => <SortableTableRow key={row.id} row={row} />)
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {noPermission
                        ? "🔒 คุณไม่มีสิทธิ์ในการดูรายการเหล่านี้"
                        : "ไม่พบรายการ"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </SortableContext>
      </DndContext>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} รายการทั้งหมด
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${pageSize}`}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="h-8 w-17.5">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 50, 100].map((s) => (
                  <SelectItem key={s} value={`${s}`}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPageIndex((p) => p - 1)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              หน้า {pageIndex + 1} / {table.getPageCount() || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPageIndex((p) => p + 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
     
      {/* Add Modal */}
      <AddItemModal
        open={openAddModal}
        onOpenChange={setOpenAddModal}
        jobNo={jobNo}
        jobId={jobId}
        jobData={jobData || undefined}
        onItemAdded={() => {
          setOpenAddModal(false);
          onItemsChange();
        }}
      />

      {/* Edit Modal */}
      <EditItemModal
        open={openEditModal}
        onOpenChange={setOpenEditModal}
        item={selectedItem}
        jobData={jobData}
        onItemUpdated={() => {
          setOpenEditModal(false);
          onItemsChange();
        }}
      />

      {/* AM Checklist Modal */}
      <AMChecklistModal
        open={openAMChecklistModal}
        onOpenChange={setOpenAMChecklistModal}
        item={selectedAMChecklistItem}
        onUpdated={() => {
          setOpenAMChecklistModal(false);
          onItemsChange();
        }}
      />

      {/* Delete Confirm Dialog */}
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
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบรายการ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}