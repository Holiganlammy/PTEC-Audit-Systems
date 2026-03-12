// app/audit-jobs/[id]/AuditItemsColumns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2, Plus, MessageSquare, Send } from "lucide-react";
import { IconGripVertical } from "@tabler/icons-react";
import { createContext, useContext } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

export const DragHandleContext = createContext<{
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
}>({});
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";

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

// ── Comment / Thread types ───────────────────────────────────────────────────
export interface Comment {
  id: number;
  text: string;
  author: string;
  created_at: string; // ISO string
}

const MOCK_COMMENTS: Comment[] = [
  { id: 1, text: "ตรวจสอบเบื้องต้นแล้ว พบสินค้าหมดอายุ 3 รายการ", author: "สมชาย ใจดี", created_at: "2026-03-01T09:00:00" },
  { id: 2, text: "รับทราบ จะแจ้งสาขาให้ดำเนินการกำจัดทันที", author: "สมหญิง รักดี", created_at: "2026-03-01T10:15:00" },
  { id: 3, text: "ดำเนินการแล้ว พร้อมส่งภาพประกอบ", author: "สมชาย ใจดี", created_at: "2026-03-02T08:30:00" },
];

// ── Avatar initials helper ───────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const colors = [
    "bg-blue-500", "bg-purple-500", "bg-green-500",
    "bg-orange-500", "bg-rose-500", "bg-teal-500",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`${color} flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold`}>
      {initials}
    </div>
  );
}

// ── Single comment bubble ────────────────────────────────────────────────────
function CommentBubble({ comment }: { comment: Comment }) {
  return (
    <div className="flex gap-2 items-start">
      <Avatar name={comment.author} />
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs font-semibold text-foreground">{comment.author}</span>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(comment.created_at), "d MMM yy · HH:mm", { locale: th })}
          </span>
        </div>
        <div className="rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground whitespace-pre-wrap break-words">
          {comment.text}
        </div>
      </div>
    </div>
  );
}

// ── Thread modal (history + reply input) ────────────────────────────────────
function ThreadModal({
  open,
  onOpenChange,
  label,
  comments,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  comments: Comment[];
  onSubmit: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [open, comments.length]);

  const handleSend = () => {
    if (!draft.trim()) return;
    onSubmit(draft.trim());
    setDraft("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="text-sm font-semibold">{label}</DialogTitle>
        </DialogHeader>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-4 py-3 max-h-[50vh]">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">ยังไม่มีความเห็น</p>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => <CommentBubble key={c.id} comment={c} />)}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Reply input */}
        <div className="border-t border-border px-4 py-3 flex gap-2 items-end">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="พิมพ์ความเห็น..."
            rows={2}
            className="resize-none flex-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
          />
          <Button size="icon" onClick={handleSend} disabled={!draft.trim()} className="mb-0.5 flex-shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── NoteCell ─────────────────────────────────────────────────────────────────
function NoteCell({ value = [], label }: { value?: Comment[]; label: string }) {
  const [comments, setComments] = useState<Comment[]>(
    value.length > 0 ? value : MOCK_COMMENTS
  );
  const [openThread, setOpenThread] = useState(false);

  const latest = comments[comments.length - 1];

  const handleSubmit = (text: string) => {
    const next: Comment = {
      id: Date.now(),
      text,
      author: "ฉัน", // TODO: replace with session user
      created_at: new Date().toISOString(),
    };
    setComments((prev) => [...prev, next]);
    // TODO: call API to persist
  };

  return (
    <div className="flex flex-col gap-1.5 min-w-[180px]">
      {/* Latest comment preview */}
      <div
        className="min-h-[52px] rounded-md border border-border bg-muted/30 px-2.5 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setOpenThread(true)}
        title="คลิกเพื่อดูและตอบกลับ"
      >
        {latest ? (
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] text-muted-foreground">{latest.author}</p>
            <p className="line-clamp-2 text-foreground text-xs leading-snug">{latest.text}</p>
          </div>
        ) : (
          <span className="text-muted-foreground italic text-xs">ยังไม่มีความเห็น</span>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 gap-1 text-xs"
          onClick={() => setOpenThread(true)}
        >
          <Plus className="h-3 w-3" />
          เพิ่ม
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 gap-1 text-xs text-muted-foreground"
          onClick={() => setOpenThread(true)}
        >
          <MessageSquare className="h-3 w-3" />
          {comments.length > 0 && <span>{comments.length}</span>}
        </Button>
      </div>

      <ThreadModal
        open={openThread}
        onOpenChange={setOpenThread}
        label={label}
        comments={comments}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────
const getStatusBadge = (status: number) => {
  switch (status) {
    case 1: return <Badge variant="default" className="bg-green-500">ปกติ</Badge>;
    case 2: return <Badge variant="destructive">ผิดปกติ</Badge>;
    case 3: return <Badge variant="secondary">ไม่มีข้อมูล</Badge>;
    default: return <Badge variant="outline">ไม่ทราบ</Badge>;
  }
};

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

// ── Column definitions ────────────────────────────────────────────────────────
export const createAuditItemsColumns = (
  onEdit: (item: AuditItem) => void,
  onDelete: (item: AuditItem) => void
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
          onCheckedChange={(value: boolean) => table.toggleAllPageRowsSelected(!!value)}
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
  // ── 3 thread columns (before สถานะ) ─────────────────────────────────────
  {
    id: "note_1",
    header: "หน่วยงานตรวจสอบ Audit (ข้อความล่าสุด)",
    cell: ({ row }) => <NoteCell value={row.original.note_1} label="Audit" />,
  },
  {
    id: "note_2",
    header: "หน่วยงาน AM (ข้อความล่าสุด)",
    cell: ({ row }) => <NoteCell value={row.original.note_2} label="AM" />,
  },
  {
    id: "note_3",
    header: "หน่วยงานอื่นๆ (ข้อความล่าสุด)",
    cell: ({ row }) => <NoteCell value={row.original.note_3} label="Other" />,
  },
  // ── สถานะ / หมายเหตุ ───────────────────────────────────────────────────
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
        <span className="text-sm text-muted-foreground line-clamp-2">{remarks}</span>
      ) : (
        <span className="text-sm text-muted-foreground italic">-</span>
      );
    },
  },
  // ── Actions ───────────────────────────────────────────────────────────────
  {
    id: "actions",
    header: () => <div className="text-right">จัดการ</div>,
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