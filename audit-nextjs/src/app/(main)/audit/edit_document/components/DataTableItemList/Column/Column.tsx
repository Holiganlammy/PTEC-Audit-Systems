// ==========================================
// Column.tsx (อัพเดทให้ใช้ NoteCell ใหม่)
// ==========================================

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { IconGripVertical } from "@tabler/icons-react";
import { createContext, useContext } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import NoteCell from "../NoteCell/NoteCell";

export const DragHandleContext = createContext<{
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
}>({});

export interface Comment {
  id: number;
  itemId: number;
  userId: number;
  author: string;
  text: string;
  approverStatus: number | null;
  approverBy?: number;
  approverName?: string;
  approverDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditItem {
  item_id: number;
  job_id: number;
  category_item_id: number;
  category_name: string;
  inspection_date: string;
  item_status: number;
  remarks: string;
  note_1?: Comment[];
  note_2?: Comment[];
  note_3?: Comment[];
  created_at: string;
  updated_at: string;
  active: boolean;
}

// Status badge 
const getStatusBadge = (status: number) => {
  switch (status) {
    case 1:
      return (
        <Badge variant="default" className="bg-green-500">
          ปกติ
        </Badge>
      );
    case 2:
      return <Badge variant="destructive">ผิดปกติ</Badge>;
    case 3:
      return <Badge variant="secondary">ไม่มีข้อมูล</Badge>;
    default:
      return <Badge variant="outline">ไม่ทราบ</Badge>;
  }
};

// Drag Handle 
function DragHandle() {
  const { attributes, listeners } = useContext(DragHandleContext);
  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent cursor-grab active:cursor-grabbing"
    >
      <IconGripVertical className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}

// ── Column definitions 
export const createAuditItemsColumns = (
  onEdit: (item: AuditItem) => void,
  onDelete: (item: AuditItem) => void,
  onRefresh?: () => void
): ColumnDef<AuditItem>[] => [
  {
    id: "drag",
    header: () => null,
    cell: () => <DragHandle />,
  },
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex justify-center items-center w-8">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value: boolean) =>
            table.toggleAllPageRowsSelected(!!value)
          }
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center items-center w-8">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "category_name",
    header: "รายการ",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("category_name")}</div>
    ),
  },
  {
    accessorKey: "inspection_date",
    header: "วันที่ตรวจสอบ",
    cell: ({ row }) => {
      const date = row.getValue("inspection_date") as string;
      return (
        <div className="text-sm">
          {format(new Date(date), "dd/MM/yyyy", { locale: th })}
        </div>
      );
    },
  },
  // thread columns 
  {
    id: "note_1",
    header: "หน่วยงานตรวจสอบ Audit",
    cell: ({ row }) => (
      <NoteCell
        itemId={row.original.item_id}
        threadType={1}
        label="Audit Unit"
        initialComments={row.original.note_1}
        onRefresh={onRefresh}
      />
    ),
  },
  {
    id: "note_2",
    header: "หน่วยงาน AM",
    cell: ({ row }) => (
      <NoteCell
        itemId={row.original.item_id}
        threadType={2}
        label="AM Unit"
        initialComments={row.original.note_2}
        onRefresh={onRefresh}
      />
    ),
  },
  {
    id: "note_3",
    header: "หน่วยงานอื่นๆ",
    cell: ({ row }) => (
      <NoteCell
        itemId={row.original.item_id}
        threadType={3}
        label="Other Agencies"
        initialComments={row.original.note_3}
        onRefresh={onRefresh}
      />
    ),
  },
  {
    accessorKey: "item_status",
    header: "สถานะ",
    cell: ({ row }) => getStatusBadge(row.getValue("item_status")),
  },
  {
    accessorKey: "remarks",
    header: "หมายเหตุ",
    cell: ({ row }) => {
      const remarks = row.getValue("remarks") as string;
      return remarks ? (
        <span className="text-sm text-muted-foreground line-clamp-2">
          {remarks}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground italic">-</span>
      );
    },
  },
  // ── Actions ───────────────────────────────────────────────────────────────
  {
    id: "actions",
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Pencil className="mr-2 h-4 w-4" />
                แก้ไข
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(item)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                ลบ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];