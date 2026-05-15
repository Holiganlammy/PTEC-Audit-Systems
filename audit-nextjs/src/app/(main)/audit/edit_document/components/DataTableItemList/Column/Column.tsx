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
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import NoteCell from "../NoteCell/NoteCell";
import TagCell, { TaggedUser } from "../TagCell/TagCell";
export type { TaggedUser };import { useSession } from "next-auth/react";
import { CheckCircle2, XCircle, Clock, AlertCircle, FileEdit, Calendar, CircleFadingPlus, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { useState } from "react";
import BranchAddScore from "../../BranchAddScore";
 

type BranchScoreValue = -1 | 0 | 1;
type BranchScoreEntry = { score: BranchScoreValue; note?: string };

function BranchScoreCell({
  item,
  entry,
  disabled,
  onSubmit,
}: {
  item: AuditItem;
  entry?: BranchScoreEntry;
  disabled?: boolean;
  onSubmit?: (itemId: number, score: BranchScoreValue, note?: string) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  const canEditByRole = session?.user?.role_id === 1 || session?.user?.role_id === 2;
  const isDisabled = !!disabled || !canEditByRole;

  const variant = entry?.score === -1 ? "destructive" : entry?.score === 0 ? "secondary" : "default";
  const label = entry
    ? `คะแนน ${entry.score === 1 ? "+1" : entry.score === 0 ? "0" : "-1"}`
    : "ให้คะแนน";

  return (
    <div className="flex justify-center">
      <span
        title={
          isDisabled
            ? disabled
              ? "รายการถูกล็อก ไม่สามารถแก้ไขคะแนนได้"
              : "เฉพาะสิทธิ์ผู้ดูแลและ Audit เท่านั้นที่แก้ไขคะแนนได้"
            : entry
            ? "คลิกเพื่อแก้ไขคะแนน"
            : "คลิกเพื่อให้คะแนน"
        }
      >
        <Button
          type="button"
          variant="ghost"
          className="group h-8 px-2"
          onClick={() => !isDisabled && setOpen(true)}
          disabled={isDisabled}
          aria-label={
            isDisabled
              ? "ไม่มีสิทธิ์แก้ไขคะแนนสาขา"
              : entry
              ? "แก้ไขคะแนนสาขา"
              : "เพิ่มคะแนนสาขา"
          }
        >
          {entry ? (
            <span className="inline-flex items-center gap-1.5">
              <Badge variant={variant}>{label}</Badge>
              {!isDisabled && (
                <Pencil className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
              )}
            </span>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              <CircleFadingPlus className="mr-1 h-3 w-3" />
              {label}
            </Badge>
          )}
        </Button>
      </span>

      <BranchAddScore
        isOpen={open}
        onClose={() => setOpen(false)}
        itemId={item.item_id}
        itemName={item.category_name}
        initialScore={entry?.score ?? null}
        initialNote={entry?.note ?? ""}
        onSubmit={({ score, note }) => {
          return onSubmit?.(item.item_id, score as BranchScoreValue, note);
        }}
      />
    </div>
  );
}

export const DragHandleContext = createContext<{
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
}>({});

// ── Actions Cell Component ──
function ActionsCell({
  item,
  onEdit,
  onDelete,
}: {
  item: AuditItem;
  onEdit: (item: AuditItem) => void;
  onDelete: (item: AuditItem) => void;
}) {
  const session = useSession();
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
          {session.data?.user.role_id == 1 || session.data?.user.role_id == 2 ?
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <Pencil className="mr-2 h-4 w-4" />
              แก้ไข
            </DropdownMenuItem>
          : null}
          {session.data?.user.role_id === 1 || session.data?.user.role_id === 2 ?
          <DropdownMenuItem
            onClick={() => onDelete(item)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            ลบ
          </DropdownMenuItem>
          : null}
          <DropdownMenuItem
            onClick={() =>
              navigator.clipboard.writeText(
                format(new Date(item.inspection_date), "dd/MM/yyyy", { locale: th })
              )
            }
          >
            <Calendar className="mr-2 h-4 w-4" />
            คัดลอกวันที่ตรวจสอบ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}


// ── Send Email Cell Component ──
function SendEmailCell({ item, isLocked }: { item: AuditItem; isLocked?: boolean }) {
    const [isSending, setIsSending] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const { data: session } = useSession();

    const canSendEmail = session?.user?.role_id === 1 || session?.user?.role_id === 2;
    if (!canSendEmail) return null;
 
    const handleSendSummary = async () => {
      try {
        setIsSending(true);
 
        // 1. Fetch ALL audit comments (note_1)
        const auditResponse = await client.get(
          `/audit-items/${item.item_id}/audit-comments`,
          { headers: dataConfig().headers }
        );
 
        const auditComments = auditResponse.data.data || [];
 
        // 2. Fetch ALL other comments (note_3)
        const otherResponse = await client.get(
          `/audit-items/${item.item_id}/other-comments`,
          { headers: dataConfig().headers }
        );
 
        const otherComments = otherResponse.data.data || [];
 
        // 3. Check if there's anything to send
        if (auditComments.length === 0 && otherComments.length === 0) {
          toast.error('ไม่มีข้อความที่จะส่ง');
          return;
        }
 
        // 4. Get job data (สำหรับดึง branchEmails)
        const jobResponse = await client.get(
          `/audit-jobs/${item.job_id}`,
          { headers: dataConfig().headers }
        );
 
        const job = jobResponse.data.data;
        // const branchEmails = job?.branchManager.email || [];
        const branchEmails = ['npc@rpcthai.com'];
 
        if (branchEmails.length === 0) {
          toast.error('ไม่พบอีเมลของสาขา');
          return;
        }
 
        // 5. Prepare payload (ส่งทุก comment)
        const payload = {
          itemId: item.item_id,
          jobNo: job?.jobNo || '-',
          branchName: job?.branchName || '-',
          branchEmails,
          categoryName: item.category_name || '-',
          itemStatus: item.item_status ?? null,
          amChecklistStatus: item.amChecklistStatus ?? null,
          auditItemStatus: item.item_status_edit,
          auditDate: item.inspection_date || '-',
          
          // ALL audit comments
          auditComments: auditComments.map((c: {
            OwnerCommentUser?: { fullname?: string; userCode?: string };
            note: string;
            createdAt: string;
          }) => ({
            author: c.OwnerCommentUser?.fullname || 'Unknown',
            authorUserCode: c.OwnerCommentUser?.userCode || '-',
            text: c.note,
            createdAt: c.createdAt,
          })),
          
          // ALL other comments
          otherComments: otherComments.map((c: {
            OwnerCommentUser?: { fullname?: string; userCode?: string };
            note: string;
            createdAt: string;
          }) => ({
            author: c.OwnerCommentUser?.fullname || 'Unknown',
            authorUserCode: c.OwnerCommentUser?.userCode || '-',
            text: c.note,
            createdAt: c.createdAt,
          })),
        };
 
        // 6. Send email
        const response = await client.post(
          '/audit-email/send-summary',
          payload,
          { headers: dataConfig().headers }
        );
 
        // const { auditCommentsCount, otherCommentsCount, recipientCount } = 
        //   response.data;
 
        toast.success(
          `ส่งเมลสำเร็จ`
        );
      } catch (error) {
        console.error('❌ Failed to send summary email:', error);
        toast.error('ส่งเมลไม่สำเร็จ');
      } finally {
        setIsSending(false);
      }
    };
 
    return (
      <div className="flex justify-center">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 gap-1.5"
          onClick={() => setConfirmOpen(true)}
          disabled={isSending || isLocked}
          title={isLocked ? "รายการถูกล็อก" : "ส่งเมลสรุปไปยังสาขา"}
        >
          {isSending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Mail className="h-3.5 w-3.5" />
          )}
          <span className="text-xs">ส่งเมล</span>
        </Button>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันการส่งเมล</AlertDialogTitle>
              <AlertDialogDescription>
                คุณต้องการส่งเมลสรุปรายการ{" "}
                <span className="font-medium text-foreground">{item.category_name}</span>{" "}
                ไปยังสาขาใช่หรือไม่?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSending}>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction
                disabled={isSending}
                onClick={(e) => {
                  e.preventDefault();
                  setConfirmOpen(false);
                  handleSendSummary();
                }}
              >
                {isSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                ส่งเมล
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
}

// export interface AuditItem {
//   item_id: number;
//   job_id: number;
//   category_item_id: number;
//   category_name: string;
//   inspection_date: string;
//   item_status: number;
//   remarks: string;
//   note_1?: AuditComment[];
//   note_2?: AuditComment[];
//   note_3?: AuditComment[];
//   tagged_users?: TaggedUser[];
//   created_at: string;
//   updated_at: string;
//   active: boolean;
// }

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
      return <Badge className="bg-yellow-500">อยู่ระหว่างดำเนินการ</Badge>;
    case 3:
      return <Badge variant="destructive">ผิดปกติ</Badge>;
    case 4:
      return <Badge variant="secondary">ปิดเคส</Badge>;
    default:
      return <Badge variant="outline">ไม่ทราบ</Badge>;
  }
};

const getAMChecklistBadge = (status: number | null, interactive: boolean, onClick?: () => void) => {
  const clickableClass = "cursor-pointer transition-colors";
  const readonlyClass = "cursor-default opacity-75";
  const baseClass = interactive ? clickableClass : readonlyClass;
  const handleClick = interactive ? onClick : undefined;

  if (status === null) {
    return (
      <Badge
        variant="outline"
        className={`${baseClass} border-muted-foreground/40 text-muted-foreground${interactive ? " hover:border-muted-foreground hover:bg-muted" : ""}`}
        onClick={handleClick}
        title={interactive ? "คลิกเพื่อบันทึก AM Check" : undefined}
      >
        <FileEdit className="mr-1 h-3 w-3" />
        ยังไม่เช็ค
      </Badge>
    );
  }

  switch (status) {
    case 1:
      return (
        <Badge
          className={`${baseClass} bg-yellow-100 text-yellow-800${interactive ? " hover:bg-yellow-200" : ""} dark:bg-yellow-900/40 dark:text-yellow-300${interactive ? " dark:hover:bg-yellow-900/70" : ""} border-transparent`}
          onClick={handleClick}
          title={interactive ? "คลิกเพื่อแก้ไข AM Check" : undefined}
        >
          <Clock className="mr-1 h-3 w-3" />
          รอตรวจสอบ
        </Badge>
      );
    case 2:
      return (
        <Badge
          className={`${baseClass} bg-green-100 text-green-800${interactive ? " hover:bg-green-200" : ""} dark:bg-green-900/40 dark:text-green-300${interactive ? " dark:hover:bg-green-900/70" : ""} border-transparent`}
          onClick={handleClick}
          title={interactive ? "คลิกเพื่อแก้ไข AM Check" : undefined}
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          ผ่าน
        </Badge>
      );
    case 3:
      return (
        <Badge
          className={`${baseClass} bg-red-100 text-red-800${interactive ? " hover:bg-red-200" : ""} dark:bg-red-900/40 dark:text-red-300${interactive ? " dark:hover:bg-red-900/70" : ""} border-transparent`}
          onClick={handleClick}
          title={interactive ? "คลิกเพื่อแก้ไข AM Check" : undefined}
        >
          <XCircle className="mr-1 h-3 w-3" />
          ไม่ผ่าน
        </Badge>
      );
    case 4:
      return (
        <Badge
          className={`${baseClass} bg-orange-100 text-orange-800${interactive ? " hover:bg-orange-200" : ""} dark:bg-orange-900/40 dark:text-orange-300${interactive ? " dark:hover:bg-orange-900/70" : ""} border-transparent`}
          onClick={handleClick}
          title={interactive ? "คลิกเพื่อแก้ไข AM Check" : undefined}
        >
          <AlertCircle className="mr-1 h-3 w-3" />
          ต้องแก้ไข
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className={`${baseClass} border-muted-foreground/40 text-muted-foreground${interactive ? " hover:bg-muted" : ""}`}
          onClick={handleClick}
        >
          ไม่ทราบ
        </Badge>
      );
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
  onRefresh?: () => void,
  users: { UserID: string; UserCode: string; Fullname: string; Email: string }[] = [],
  taggedUsersMap: Record<number, TaggedUser[]> = {},
  onTagChange?: (itemId: number, tags: TaggedUser[]) => void,
  onCommentsChange?: (itemId: number, threadType: 1 | 2 | 3, comments: AuditComment[]) => void,
  jobData?: AuditJobData,
  isLocked?: boolean,
  onAMChecklistClick?: (item: AuditItem) => void,
  isAMChecklistAllowed?: boolean,
  branchScoresMap: Record<number, BranchScoreEntry> = {},
  onBranchScoreSubmit?: (itemId: number, score: BranchScoreValue, note?: string) => void,
  canSendEmail?: boolean
): ColumnDef<AuditItem>[] => {
  return [
  {
    id: "drag",
    header: () => null,
    cell: () => isLocked ? null : <DragHandle />,
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
    accessorKey: "item_status",
    header: () => (
      <div className="text-center">
        สถานะที่ตรวจพบ
      </div>
    ),
    cell: ({ row }) => {
      return(
        <div className="text-center">
          {getStatusBadge(row.getValue("item_status") as number)}
        </div>
      )
    },
  },
  {
    id: "branch_score",
    header: () => <div className="text-center">คะแนนสาขา</div>,
    cell: ({ row }) => {
      const entry = branchScoresMap[row.original.item_id];
      return (
        <BranchScoreCell
          item={row.original}
          entry={entry}
          disabled={isLocked}
          onSubmit={onBranchScoreSubmit}
        />
      );
    },
  },
  // {
  //   accessorKey: "inspection_date",
  //   header: "วันที่ตรวจสอบ",
  //   cell: ({ row }) => {
  //     const date = row.getValue("inspection_date") as string;
  //     return (
  //       <div className="text-sm">
  //         {format(new Date(date), "dd/MM/yyyy", { locale: th })}
  //       </div>
  //     );
  //   },
  // },
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
        onTagChange={onTagChange}
        onCommentsChange={onCommentsChange}
        users={users}
        isLocked={isLocked}
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
        onTagChange={onTagChange}
        onCommentsChange={onCommentsChange}
        users={users}
        isLocked={isLocked}
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
        jobData={jobData}
        users={users}
        onRefresh={onRefresh}
        onTagChange={onTagChange}
        onCommentsChange={onCommentsChange}
        taggedUsers={taggedUsersMap[row.original.item_id] ?? row.original.tagged_users ?? []}
        isLocked={isLocked}
      />
    ),
  },
  {
    id: "tagged_users",
    header: "แท็กผู้ใช้",
    cell: ({ row }) => {
      return (
        <TagCell
          itemId={row.original.item_id}
          users={users}
          initialTags={taggedUsersMap[row.original.item_id] ?? row.original.tagged_users ?? []}
          onTagChange={(tags) => onTagChange?.(row.original.item_id, tags)}
          isLocked={isLocked}
        />
      );
    },
  },
  {
    accessorKey: "item_status_edit",
    header: () => (
      <div className="text-center">
        สถานะอัพเดทและแก้ไข (ล่าสุด)
      </div>
    ),
    cell: ({ row }) => {
      return(
        <div className="text-center">
          {getStatusBadge(row.getValue("item_status_edit") as number)}
        </div>
      )
    },
  },
    {
    id: "am_checklist",
    header: () => (
      <div className="text-center">
        Check
      </div>
    ),
    cell: ({ row }) => {
      const item = row.original;
      const interactive = !!isAMChecklistAllowed;
      return (
        <div className="flex justify-center">
          {interactive ? (
            <div
              className="group relative inline-flex items-center gap-1 cursor-pointer"
              onClick={() => onAMChecklistClick?.(item)}
            >
              {getAMChecklistBadge(item.amChecklistStatus ?? null, true)}
              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          ) : (
            getAMChecklistBadge(item.amChecklistStatus ?? null, false)
          )}
        </div>
      );
    },
  },
  // {
  //   accessorKey: "remarks",
  //   header: "หมายเหตุ",
  //   cell: ({ row }) => {
  //     const remarks = row.getValue("remarks") as string;
  //     return remarks ? (
  //       <span className="text-sm text-muted-foreground line-clamp-2">
  //         {remarks}
  //       </span>
  //     ) : (
  //       <span className="text-sm text-muted-foreground italic">-</span>
  //     );
  //   },
  // },
  // ── Send Email ────────────────────────────────────────────────────────────
  ...(canSendEmail ? [{
    id: "send_email",
    header: () => (
      <div className="text-center">
        ส่งเมลสรุป
      </div>
    ),
    cell: ({ row }: { row: import('@tanstack/react-table').Row<AuditItem> }) => (
      <SendEmailCell item={row.original} isLocked={isLocked} />
    ),
  } satisfies ColumnDef<AuditItem>] : []),
  // ── Actions ───────────────────────────────────────────────────────────────
  {
    id: "actions",
    cell: ({ row }) =>
      isLocked ? null : (
        <ActionsCell
          item={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
  },
];
};