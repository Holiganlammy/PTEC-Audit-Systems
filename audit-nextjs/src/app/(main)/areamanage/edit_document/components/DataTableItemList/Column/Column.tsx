// app/audit/edit_document/components/DataTableItemList/Column/Column.tsx
// Version: 2.0.0 | Date: 2025-05-20 | Updated: Added sticky column support for category_name

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Paperclip, Pencil, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import NoteCell from "../NoteCell/NoteCell";
import TagCell, { TaggedUser } from "../TagCell/TagCell";
export type { TaggedUser };
import { useSession } from "next-auth/react";
import { CheckCircle2, XCircle, Clock, AlertCircle, FileEdit, CircleFadingPlus, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { useState } from "react";
import { cn } from "@/lib/utils";
import BranchAddScore from "../../BranchAddScore";

// ══════════════════════════════════════════════════════════════════════════════
// STICKY COLUMN META
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Column meta สำหรับ sticky columns
 * - sticky: "left" | "right"  → ด้านที่ stick
 * - stickyOffset: number      → left/right offset (px)
 * - stickyWidth: number       → ความกว้างคอลัมน์ (px) สำหรับคำนวณ offset ของคอลัมน์ถัดไป
 * - isLastSticky: boolean     → คอลัมน์สุดท้ายที่ sticky (ใส่ shadow)
 */
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    sticky?: "left" | "right";
    stickyOffset?: number;
    stickyWidth?: number;
    isLastSticky?: boolean;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

type BranchScoreValue = -1 | 0 | 1;
type BranchScoreEntry = { score: BranchScoreValue; note?: string };

// ══════════════════════════════════════════════════════════════════════════════
// BRANCH SCORE CELL
// ══════════════════════════════════════════════════════════════════════════════

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

  const canEditByRole = [1, 3].includes(Number(session?.user?.role_id ?? -1));
  const isDisabled = !!disabled || !canEditByRole;

  const scoreClassName =
    entry?.score === 1
      ? "bg-green-500 dark:bg-green-700 text-white border-transparent"
      : entry?.score === 0
      ? "bg-yellow-500 dark:bg-yellow-700 text-white border-transparent"
      : "bg-destructive dark:bg-red-700 text-white border-transparent";
  const scoreBadgeClassName = cn(
    scoreClassName,
    "min-w-[80px] whitespace-normal break-words text-center leading-tight"
  );
  const scoreValue = entry ? (entry.score === 1 ? "+1" : entry.score === 0 ? "0" : "-1") : "";
  const scoreText = entry
    ? entry.score === 1
      ? "ผ่าน"
      : entry.score === 0
      ? "ไม่ผ่าน"
      : "มีผลกระทบ"
    : "";
  const scoreVariant = "outline" as const;
  const label = entry
    ? `คะแนน ${entry.score === 1 ? "+1 ผ่าน" : entry.score === 0 ? "0 ไม่เป็นไปตามข้อกำหนด" : "-1 มีผลกระทบ"}`
    : "ให้คะแนน";

  // เมื่อ disabled และมีคะแนนแล้ว → render badge โดยตรง ไม่ใช้ disabled button (ป้องกัน opacity fade)
  if (isDisabled && entry) {
    return (
      <div className="flex justify-center">
        <span title={disabled ? "รายการถูกล็อก ไม่สามารถแก้ไขคะแนนได้" : "เฉพาะสิทธิ์ผู้ดูแลและ Audit เท่านั้นที่แก้ไขคะแนนได้"}>
          <Badge variant={scoreVariant} className={scoreBadgeClassName}>
            <span className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] font-semibold leading-none">{scoreValue}</span>
              <span className="text-[10px] leading-tight">{scoreText}</span>
            </span>
          </Badge>
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <span
        title={
          isDisabled
            ? "เฉพาะสิทธิ์ผู้ดูแลและ Audit เท่านั้นที่แก้ไขคะแนนได้"
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
              <Badge variant={scoreVariant} className={scoreBadgeClassName}>
                <span className="flex flex-col items-center gap-0.5">
                  <span className="text-[12px] font-semibold leading-none">{scoreValue}</span>
                  <span className="text-[12px] leading-tight">{scoreText}</span>
                </span>
              </Badge>
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

// ══════════════════════════════════════════════════════════════════════════════
// DRAG HANDLE
// ══════════════════════════════════════════════════════════════════════════════

export const DragHandleContext = createContext<{
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
}>({});

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

// ══════════════════════════════════════════════════════════════════════════════
// ACTIONS CELL
// ══════════════════════════════════════════════════════════════════════════════

function ActionsCell({
  item,
  onEdit,
  onDelete,
  onAttachment,
  isDraftMode,
  isRowClosed,
  positionType,
}: {
  item: AuditItem;
  onEdit: (item: AuditItem) => void;
  onDelete: (item: AuditItem) => void;
  onAttachment: (item: AuditItem) => void;
  isDraftMode?: boolean;
  isRowClosed?: boolean;
  positionType?: string;
}) {
  const session = useSession();
  const roleId = Number(session.data?.user.role_id ?? -1);
  const allowedRoles = positionType === "AA" ? [1, 8] : [1, 3];
  const canAction = allowedRoles.includes(roleId);
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
          {!isDraftMode && (
            <DropdownMenuItem onClick={canAction ? () => onEdit(item) : undefined} disabled={!canAction}>
              <Pencil className="mr-2 h-4 w-4" />
              แก้ไข
            </DropdownMenuItem>
          )}
          {!isDraftMode && (
            <DropdownMenuItem onClick={() => onAttachment(item)}>
              <Paperclip className="mr-2 h-4 w-4" />
              {isRowClosed ? "ดูไฟล์แนบ" : "เก็บไฟล์"}
            </DropdownMenuItem>
          )}
          {!isRowClosed && (
            <DropdownMenuItem
              onClick={canAction ? () => onDelete(item) : undefined}
              disabled={!canAction}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              ลบ
            </DropdownMenuItem>
          )}
          {/* {!isDraftMode && <DropdownMenuItem
            onClick={() =>
              navigator.clipboard.writeText(
                format(new Date(item.inspection_date), "dd/MM/yyyy", { locale: th })
              )
            }
          >
            <Calendar className="mr-2 h-4 w-4" />
            คัดลอกวันที่ตรวจสอบ
          </DropdownMenuItem>} */}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SEND EMAIL CELL
// ══════════════════════════════════════════════════════════════════════════════

function SendEmailCell({ item, isLocked, positionType }: { item: AuditItem; isLocked?: boolean; positionType?: string }) {
  const [isSending, setIsSending] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data: session } = useSession();

  const allowedEmailRoles = positionType === "AA" ? [1, 8] : [1, 3];
  const canSendEmail = allowedEmailRoles.includes(Number(session?.user?.role_id ?? -1));

  const handleSendSummary = async () => {
    try {
      setIsSending(true);
      const isAA = positionType === "AA";

      const thread1Endpoint = isAA ? "aa-comments" : "audit-comments";
      const auditResponse = await client.get(
        `/am-items/${item.item_id}/${thread1Endpoint}`,
        { headers: dataConfig().headers }
      );
      const auditComments = auditResponse.data.data || [];

      const otherResponse = await client.get(
        `/am-items/${item.item_id}/other-comments`,
        { headers: dataConfig().headers }
      );
      const otherComments = otherResponse.data.data || [];

      if (auditComments.length === 0 && otherComments.length === 0) {
        toast.error('ไม่มีข้อความที่จะส่ง');
        return;
      }

      const jobEndpoint = isAA ? `/aa-jobs/${item.job_id}` : `/am-jobs/${item.job_id}`;
      const jobResponse = await client.get(jobEndpoint, { headers: dataConfig().headers });
      const job = jobResponse.data.data;
      const branchEmails = ['npc@rpcthai.com'];

      if (branchEmails.length === 0) {
        toast.error('ไม่พบอีเมลของสาขา');
        return;
      }

      const payload = {
        itemId: item.item_id,
        jobNo: job?.jobNo || '-',
        branchName: job?.branchName || '-',
        branchEmails,
        categoryName: item.category_name || '-',
        itemStatus: item.item_status ?? null,
        amChecklistStatus: item.headerChecklistStatus ?? null,
        auditItemStatus: item.item_status_edit,
        auditDate: item.inspection_date || '-',
        formType: positionType ?? "AM",
        auditComments: auditComments.map((c: auditCommentsComment) => ({
          author: c.OwnerCommentUser?.fullname || 'Unknown',
          authorUserCode: c.OwnerCommentUser?.userCode || '-',
          text: c.note,
          createdAt: c.createdAt,
        })),
        otherComments: otherComments.map((c: auditCommentsComment) => ({
          author: c.OwnerCommentUser?.fullname || 'Unknown',
          authorUserCode: c.OwnerCommentUser?.userCode || '-',
          text: c.note,
          createdAt: c.createdAt,
        })),
      };

      await client.post('/am-email/send-summary', payload, { headers: dataConfig().headers });
      toast.success(`ส่งเมลสำเร็จ`);
      setHasSent(true);
    } catch (error) {
      console.error('❌ Failed to send summary email:', error);
      toast.error('ส่งเมลไม่สำเร็จ');
    } finally {
      setIsSending(false);
    }
  };

  const isButtonDisabled = isSending || isLocked || hasSent || !canSendEmail;
  const buttonTitle = !canSendEmail ? "ไม่มีสิทธิ์ส่งเมล" : isLocked ? "รายการถูกล็อก" : hasSent ? "ส่งเมลแล้ว" : "ส่งเมลสรุปไปยังสาขา";

  return (
    <div className="flex justify-center">
      <Button
        size="sm"
        variant={hasSent ? "default" : "outline"}
        className={cn("h-7 px-2 gap-1.5", hasSent && "bg-green-600 hover:bg-green-600 text-white border-transparent cursor-not-allowed opacity-70")}
        onClick={() => !isButtonDisabled && setConfirmOpen(true)}
        disabled={isButtonDisabled}
        title={buttonTitle}
      >
        {isSending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : hasSent ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <Mail className="h-3.5 w-3.5" />
        )}
        <span className="text-xs">{hasSent ? "ส่งแล้ว" : "ส่งเมล"}</span>
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
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              ส่งเมล
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STATUS BADGES
// ══════════════════════════════════════════════════════════════════════════════

const getStatusBadge = (status: number) => {
  switch (status) {
    case 1:
      return <Badge className="bg-green-500 dark:bg-green-700 text-white border-transparent">ปกติ</Badge>;
    case 2:
      return <Badge className="bg-yellow-500 dark:bg-yellow-700 text-white border-transparent">อยู่ระหว่างดำเนินการ</Badge>;
    case 3:
      return <Badge className="bg-destructive dark:bg-red-700 text-white border-transparent">ผิดปกติ</Badge>;
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
      <Badge variant="outline" className={`${baseClass} border-muted-foreground/40 text-muted-foreground${interactive ? " hover:border-muted-foreground hover:bg-muted" : ""}`} onClick={handleClick} title={interactive ? "คลิกเพื่อบันทึก AM Check" : undefined}>
        <FileEdit className="mr-1 h-3 w-3" />
        ยังไม่เช็ค
      </Badge>
    );
  }

  switch (status) {
    case 1:
      return <Badge className={`${baseClass} bg-yellow-100 text-yellow-800${interactive ? " hover:bg-yellow-200" : ""} dark:bg-yellow-900/40 dark:text-yellow-300 border-transparent`} onClick={handleClick} title={interactive ? "คลิกเพื่อแก้ไข AM Check" : undefined}><Clock className="mr-1 h-3 w-3" />รอตรวจสอบ</Badge>;
    case 2:
      return <Badge className={`${baseClass} bg-green-100 text-green-800${interactive ? " hover:bg-green-200" : ""} dark:bg-green-900/40 dark:text-green-300 border-transparent`} onClick={handleClick} title={interactive ? "คลิกเพื่อแก้ไข AM Check" : undefined}><CheckCircle2 className="mr-1 h-3 w-3" />ผ่าน</Badge>;
    case 3:
      return <Badge className={`${baseClass} bg-red-100 text-red-800${interactive ? " hover:bg-red-200" : ""} dark:bg-red-900/40 dark:text-red-300 border-transparent`} onClick={handleClick} title={interactive ? "คลิกเพื่อแก้ไข AM Check" : undefined}><XCircle className="mr-1 h-3 w-3" />ไม่ผ่าน</Badge>;
    case 4:
      return <Badge className={`${baseClass} bg-orange-100 text-orange-800${interactive ? " hover:bg-orange-200" : ""} dark:bg-orange-900/40 dark:text-orange-300 border-transparent`} onClick={handleClick} title={interactive ? "คลิกเพื่อแก้ไข AM Check" : undefined}><AlertCircle className="mr-1 h-3 w-3" />ต้องแก้ไข</Badge>;
    default:
      return <Badge variant="outline" className={`${baseClass} border-muted-foreground/40 text-muted-foreground${interactive ? " hover:bg-muted" : ""}`} onClick={handleClick}>ไม่ทราบ</Badge>;
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// COLUMN DEFINITIONS (with sticky meta)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Sticky Layout:
 * | drag (40px) | select (40px) | category_name (sticky, 220px) | ... scrollable ... |
 *
 * - drag:          sticky left: 0,    width: 40px
 * - select:        sticky left: 40px, width: 40px
 * - category_name: sticky left: 80px, width: 220px, isLastSticky: true (มี shadow)
 */

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
  onAttachmentClick?: (item: AuditItem) => void,
  isAMChecklistAllowed?: boolean,
  branchScoresMap: Record<number, BranchScoreEntry> = {},
  onBranchScoreSubmit?: (itemId: number, score: BranchScoreValue, note?: string) => void,
  canSendEmail?: boolean,
  isDraftMode?: boolean,
  attachmentCountsMap: Record<number, number> = {},
  viewport: 'mobile' | 'tablet' | 'desktop' = 'desktop',
  highlightItemId?: number,
  highlightThreadType?: number,
  positionType: "AM" | "AA" = "AM",
): ColumnDef<AuditItem>[] => {
  const effectiveLocked = isLocked || !!isDraftMode;

  return [
    // ── Sticky: drag (left: 0, width: 40px) ───────────────────────────────
    {
      id: "drag",
      header: () => null,
      cell: () => effectiveLocked ? null : <DragHandle />,
      meta: {
        sticky: "left" as const,
        stickyOffset: 0,
        stickyWidth: 40,
      },
    },
    // ── Sticky: select (left: 40px, width: 40px) ─────────────────────────
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex justify-center items-center w-8">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value: boolean) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            disabled={isDraftMode}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center items-center w-8">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
            aria-label="Select row"
            disabled={isDraftMode}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      meta: {
        sticky: "left" as const,
        stickyOffset: 40,
        stickyWidth: 40,
      },
    },
    // ── Sticky: category_name (left: 80px, isLastSticky → shadow) ────────
    {
      accessorKey: "category_name",
      header: "รายการ",
      cell: ({ row }) => {
        const count = attachmentCountsMap[row.original.item_id] ?? 0;
        const name = row.getValue("category_name") as string;
        return (
          <div className={cn(
            "font-medium overflow-hidden",
            viewport === 'mobile'
              ? "min-w-[140px]"
              : viewport === 'tablet'
              ? "w-[160px] max-w-[160px]"
              : "w-[220px] max-w-[220px]"
          )}>
            <div className="break-words whitespace-normal leading-snug" title={name}>
              {name}
            </div>
            {count > 0 && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                <span>{count} ไฟล์</span>
              </div>
            )}
          </div>
        );
      },
      meta: {
        sticky: "left" as const,
        stickyOffset: 80,
        stickyWidth: 220,
        isLastSticky: true,
      },
    },
    // ── Normal columns ───────────────────────────────────────────────────
    {
      accessorKey: "item_status",
      header: () => <div className="text-center">สถานะที่ตรวจพบ</div>,
      cell: ({ row }) => (
        <div className="text-center">{getStatusBadge(row.getValue("item_status") as number)}</div>
      ),
    },
    {
      id: "branch_score",
      header: () => <div className="text-center">คะแนนสาขา</div>,
      cell: ({ row }) => {
        const entry = branchScoresMap[row.original.item_id];
        const isRowClosed = row.original.item_status_edit === 4;
        return <BranchScoreCell item={row.original} entry={entry} disabled={effectiveLocked || isRowClosed} onSubmit={onBranchScoreSubmit} />;
      },
    },
    {
      id: "note_1",
      header: positionType === "AA" ? "หน่วยงานตรวจสอบ AA" : "หน่วยงานตรวจสอบ (AM Checker)",
      cell: ({ row }) => (
        <NoteCell itemId={row.original.item_id} threadType={1} positionType={positionType} label={positionType === "AA" ? "AA" : "AM (Checker)"} initialComments={row.original.note_1} onRefresh={onRefresh} onTagChange={onTagChange} onCommentsChange={onCommentsChange} users={users} isLocked={effectiveLocked || row.original.item_status_edit === 4} autoOpen={highlightItemId === row.original.item_id && highlightThreadType === 1} highlighted={highlightItemId === row.original.item_id && (highlightThreadType === 1 || highlightThreadType === undefined) && (row.original.note_1 ?? []).some(c => c.approverStatus === 0)} />
      ),
    },
    {
      id: "note_2",
      header: positionType === "AA" ? "หน่วยงาน AM" : "หน่วยงาน RM",
      cell: ({ row }) => (
        <NoteCell itemId={row.original.item_id} threadType={2} label={positionType === "AA" ? "AM" : "RM"} initialComments={row.original.note_2} onRefresh={onRefresh} onTagChange={onTagChange} onCommentsChange={onCommentsChange} users={users} isLocked={effectiveLocked || row.original.item_status_edit === 4} autoOpen={highlightItemId === row.original.item_id && highlightThreadType === 2} highlighted={highlightItemId === row.original.item_id && (highlightThreadType === 2 || highlightThreadType === undefined) && (row.original.note_2 ?? []).some(c => c.approverStatus === 0)} />
      ),
    },
    {
      id: "note_3",
      header: "หน่วยงานอื่นๆ",
      cell: ({ row }) => (
        <NoteCell itemId={row.original.item_id} threadType={3} label="Other Agencies" initialComments={row.original.note_3} jobData={jobData} users={users} onRefresh={onRefresh} onTagChange={onTagChange} onCommentsChange={onCommentsChange} taggedUsers={taggedUsersMap[row.original.item_id] ?? row.original.tagged_users ?? []} isLocked={effectiveLocked || row.original.item_status_edit === 4} autoOpen={highlightItemId === row.original.item_id && highlightThreadType === 3} highlighted={highlightItemId === row.original.item_id && (highlightThreadType === 3 || highlightThreadType === undefined) && (row.original.note_3 ?? []).some(c => c.approverStatus === 0)} />
      ),
    },
    {
      id: "tagged_users",
      header: "แท็กผู้ใช้",
      cell: ({ row }) => (
        <TagCell itemId={row.original.item_id} users={users} initialTags={taggedUsersMap[row.original.item_id] ?? row.original.tagged_users ?? []} onTagChange={(tags) => onTagChange?.(row.original.item_id, tags)} isLocked={effectiveLocked || row.original.item_status_edit === 4} positionType={positionType} />
      ),
    },
    {
      accessorKey: "item_status_edit",
      header: () => <div className="text-center">สถานะอัพเดทและแก้ไข (ล่าสุด)</div>,
      cell: ({ row }) => (
        <div className="text-center">{getStatusBadge(row.getValue("item_status_edit") as number)}</div>
      ),
    },
    ...(canSendEmail ? [{
      id: "send_email",
      header: () => <div className="text-center">กรณีแจ้งผลสาขา</div>,
      cell: ({ row }: { row: import("@tanstack/react-table").Row<AuditItem> }) => (
        <SendEmailCell item={row.original} isLocked={effectiveLocked || row.original.item_status_edit === 4} positionType={positionType} />
      ),
    } satisfies ColumnDef<AuditItem>] : []),
    {
      id: "am_checklist",
      header: () => <div className="text-center">Check</div>,
      cell: ({ row }) => {
        const item = row.original;
        const interactive = !!isAMChecklistAllowed && !isDraftMode;
        return (
          <div className="flex justify-center">
            {interactive ? (
              <div className="group relative inline-flex items-center gap-1 cursor-pointer" onClick={() => onAMChecklistClick?.(item)}>
                {getAMChecklistBadge(item.headerChecklistStatus ?? null, true)}
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            ) : (
              getAMChecklistBadge(item.headerChecklistStatus ?? null, false)
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) =>
        effectiveLocked && !isDraftMode ? null : (
          <ActionsCell
            item={row.original}
            onEdit={isDraftMode ? () => {} : onEdit}
            onDelete={onDelete}
            onAttachment={onAttachmentClick ?? (() => {})}
            isDraftMode={isDraftMode}
            isRowClosed={row.original.item_status_edit === 4}
            positionType={positionType}
          />
        ),
    },
  ];
};
