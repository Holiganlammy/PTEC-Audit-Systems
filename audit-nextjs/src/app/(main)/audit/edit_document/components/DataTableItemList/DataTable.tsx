"use client";

import { useState, useEffect } from "react";
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
import { createAuditItemsColumns, AuditItem, DragHandleContext } from "./Column/Column";
import EditItemModal from "../EditItemModal";
import AddItemModal from "../AdditemModal";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { toast } from "sonner";

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
  isLoading?: boolean;
  onItemsChange: () => void;
}

export default function DataTableItemList({
  items,
  jobNo,
  isLoading = false,
  onItemsChange,
}: DataTableItemListProps) {
  const [orderedItems, setOrderedItems] = useState<AuditItem[]>(items);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [pageIndex, setPageIndex] = useState(0);

  // Modal state
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null);

  // Sync when parent refreshes items
  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  const handleEdit = (item: AuditItem) => {
    setSelectedItem(item);
    setOpenEditModal(true);
  };

  const handleDelete = async (item: AuditItem) => {
    if (!confirm(`ยืนยันการลบรายการ "${item.category_name}"?`)) return;
    try {
      await client.delete(`/audit-items/${item.item_id}`, {
        headers: dataConfig().headers,
      });
      toast.success("ลบรายการสำเร็จ");
      onItemsChange();
    } catch {
      toast.error("ไม่สามารถลบรายการได้");
    }
  };

  const columns = createAuditItemsColumns(handleEdit, handleDelete);

  const table = useReactTable({
    data: orderedItems,
    columns,
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
        <Button onClick={() => setOpenAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มรายการ
        </Button>
      </div>

      {/* DnD Table */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedItems.map((item) => item.item_id)}
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
                  rows.map((row) => (
                    <SortableTableRow key={row.id} row={row} />
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      ไม่พบรายการ
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
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 50, 100].map((s) => (
                  <SelectItem key={s} value={`${s}`}>{s}</SelectItem>
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
        onItemUpdated={() => {
          setOpenEditModal(false);
          onItemsChange();
        }}
      />
    </div>
  );
}