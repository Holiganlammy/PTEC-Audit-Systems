// ==========================================
// ThreadModal.tsx - Simple & Clean
// ==========================================

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, CheckCircle2, XCircle, Clock, Trash2, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
// import type { AuditComment } from "../Column/Column";

interface ApiUser {
  UserID: string;
  UserCode: string;
  Fullname: string;
}

interface AuditComment {
  id: number;
  itemId?: number;
  userId?: number;
  author: string;
  authorUserCode?: string;
  authorPosition?: string;
  text: string;
  approverStatus: number | null;
  approverBy?: number;
  approverName?: string;
  approverPosition?: string;
  approverUsername?: string;
  approverDate?: string;
  requireApprovalFromUserCode?: string;
  requireApprovalFromName?: string;
  createdAt: string;
  updatedAt?: string;
}

interface ThreadModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  comments: AuditComment[];
  isLoading: boolean;
  onSubmit: (text: string, approverStatus?: 0 | null) => Promise<void>;
  onApprove: (commentId: number, status: 1 | 2) => Promise<void>;
  onDelete: (commentId: number, remark: string) => Promise<void>;
  onEdit: (commentId: number, note: string) => Promise<void>;
  canComment: boolean;
  canDelete: boolean;
  canEdit: boolean;
  canMention?: boolean;
  currentUserId?: string | number;
  currentUserCode?: string;
  users?: ApiUser[];
}

// ── Avatar ────────────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-orange-500",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className={`${color} flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold`}
    >
      {initials}
    </div>
  );
}

// ── Render mentions ──────────────────────────────────────────────────────
function renderMentions(text: string, users?: ApiUser[]) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (/^@\w+$/.test(part)) {
      const userCode = part.slice(1); // ลบ @ ออก
      const user = users?.find((u) => u.UserCode === userCode);
      
      return (
        <span
          key={i}
          className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-sm px-0.5 font-medium"
          title={user?.Fullname || userCode} // ← แสดง fullname ใน tooltip
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

// ── MentionTextarea – textarea with live highlight overlay ─────────────────
function MentionTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  rows,
  disabled,
  textareaRef,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  rows: number;
  disabled: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);

  const syncScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const parts = value.split(/(@\w+)/g);

  return (
    <div className="relative w-full">
      {/* Backdrop highlight layer – positioned behind the textarea */}
      <div
        ref={backdropRef}
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0 overflow-hidden rounded-md px-3 py-2 text-base md:text-sm"
        style={{
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
          wordBreak: "break-word",
          lineHeight: "1.5",
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      >
        {parts.map((part, i) =>
          /^@\w+$/.test(part) ? (
            <span
              key={i}
              className="bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 rounded-sm"
            >
              {part}
            </span>
          ) : (
            // ข้อความธรรมดา – ใช้สี foreground ปกติ (ขาวใน dark / ดำใน light)
            <span key={i} className="text-foreground">
              {part}
            </span>
          )
        )}
        {"\u200b"}
      </div>

      {/* Actual textarea – text transparent to reveal backdrop, caret stays visible */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onScroll={syncScroll}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="resize-none w-full relative"
        style={{
          background: "transparent",
          color: "transparent",
          caretColor: "hsl(var(--foreground))",
        }}
      />
    </div>
  );
}

// ── Comment Item ──────────────────────────────────────────────────────────
function CommentItem({
  comment,
  onApprove,
  canApprove,
  onDelete,
  canDelete,
  onEdit,
  canEdit,
  users
}: {
  comment: AuditComment;
  onApprove: (commentId: number, status: 1 | 2) => Promise<void>;
  canApprove: boolean;
  onDelete: (commentId: number, remark: string) => Promise<void>;
  canDelete: boolean;
  onEdit: (commentId: number, note: string) => Promise<void>;
  canEdit: boolean;
  users: ApiUser[];
}) {
  const [isApproving, setIsApproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRemark, setDeleteRemark] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(comment.text);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) setEditDraft(comment.text);
  }, [comment.text, isEditing]);

  useEffect(() => {
    if (!deleteOpen) setDeleteRemark("");
  }, [deleteOpen]);

  const handleApprove = async (status: 1 | 2) => {
    try {
      setIsApproving(true);
      await onApprove(comment.id, status);
      toast.success(status === 1 ? "อนุมัติสำเร็จ" : "ไม่อนุมัติสำเร็จ");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsApproving(false);
    }
  };

  const handleDelete = async () => {
    const remark = deleteRemark.trim();
    if (!remark) {
      toast.error("กรุณาระบุหมายเหตุสำหรับการลบ");
      return;
    }
    try {
      setIsDeleting(true);
      await onDelete(comment.id, remark);
      toast.success("ลบความเห็นสำเร็จ");
    } catch {
      toast.error("ไม่สามารถลบความเห็นได้");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    const next = editDraft.trim();
    if (!next) return;
    if (next === comment.text) {
      setIsEditing(false);
      return;
    }
    try {
      setIsSaving(true);
      await onEdit(comment.id, next);
      toast.success("แก้ไขความเห็นสำเร็จ");
      setIsEditing(false);
    } catch {
      toast.error("ไม่สามารถแก้ไขความเห็นได้");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex gap-2.5 items-start">
      <Avatar name={comment.author} />
      
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="text-sm font-semibold truncate">{comment.author}</span>
            {comment.authorUserCode && (
              <span className="text-xs text-muted-foreground">
                ({comment.authorUserCode})
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {format(new Date(comment.createdAt), "d MMM · HH:mm", { locale: th })}
            </span>
          </div>

          {(canEdit || canDelete) && (
            <div className="flex items-center gap-1">
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsEditing((v) => !v)}
                  disabled={isSaving || isDeleting}
                  aria-label="แก้ไขความเห็น"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}

              {canDelete && (
                <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={isDeleting}
                      aria-label="ลบความเห็น"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                      <AlertDialogDescription>
                        กรุณาระบุหมายเหตุก่อนลบความเห็นนี้
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2">
                      <Label htmlFor={`delete-remark-${comment.id}`} className="text-xs text-muted-foreground">
                        หมายเหตุ
                      </Label>
                      <Textarea
                        id={`delete-remark-${comment.id}`}
                        value={deleteRemark}
                        onChange={(e) => setDeleteRemark(e.target.value)}
                        placeholder="ระบุเหตุผล/หมายเหตุสำหรับการลบ..."
                        rows={3}
                        className="resize-none text-sm"
                        disabled={isDeleting}
                      />
                    </div>

                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting || !deleteRemark.trim()}
                      >
                        ลบ
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>

        {/* Message */}
        {isEditing ? (
          <div className="rounded-lg border bg-card px-3 py-2">
            <Textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              rows={3}
              className="resize-none text-sm"
              disabled={isSaving}
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => {
                  setEditDraft(comment.text);
                  setIsEditing(false);
                }}
                disabled={isSaving}
              >
                ยกเลิก
              </Button>
              <Button
                size="sm"
                className="h-7"
                onClick={handleSaveEdit}
                disabled={!editDraft.trim() || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "บันทึก"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm whitespace-pre-wrap break-words border">
            {renderMentions(comment.text, users)}
          </div>
        )}

        {/* Status Card */}
        {comment.approverStatus !== null && (
          <div className="mt-2 rounded-md border bg-card p-2.5">
            <div className="flex items-center gap-2 text-xs">
              {/* Icon + Status */}
              {comment.approverStatus === 0 && (
                <>
                  <Clock className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                  <span className="font-medium text-yellow-600 dark:text-yellow-400">รออนุมัติ</span>
                </>
              )}
              {comment.approverStatus === 1 && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-600 dark:text-green-400">อนุมัติแล้ว</span>
                </>
              )}
              {comment.approverStatus === 2 && (
                <>
                  <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                  <span className="font-medium text-red-600 dark:text-red-400">ไม่อนุมัติ</span>
                </>
              )}

              <span className="text-muted-foreground">·</span>

              {/* ชื่อผู้อนุมัติ (ถ้ามี) */}
              {comment.approverStatus !== 0 && comment.approverName ? (
                <>
                  <span className="font-medium">{comment.approverName}</span>
                  {comment.approverUsername && (
                    <span className="text-muted-foreground">
                      ({comment.approverUsername})
                    </span>
                  )}
                  {comment.approverDate && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">
                        {format(new Date(comment.approverDate), "d MMM · HH:mm", {
                          locale: th,
                        })}
                      </span>
                    </>
                  )}
                </>
              ) : comment.approverStatus === 0 && comment.requireApprovalFromName ? (
                <>
                  <span className="font-medium">{comment.requireApprovalFromName}</span>
                  {comment.requireApprovalFromUserCode && (
                    <span className="text-muted-foreground">
                      ({comment.requireApprovalFromUserCode})
                    </span>
                  )}
                </>
              ) : null}
            </div>

            {/* Action Buttons (สำหรับรออนุมัติ) */}
            {comment.approverStatus === 0 && canApprove && (
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 h-7 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleApprove(1)}
                  disabled={isApproving}
                >
                  {isApproving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      อนุมัติ
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 h-7"
                  onClick={() => handleApprove(2)}
                  disabled={isApproving}
                >
                  {isApproving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      ไม่อนุมัติ
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────
export default function ThreadModal({
  open,
  onOpenChange,
  label,
  comments,
  isLoading,
  onSubmit,
  onApprove,
  onDelete,
  onEdit,
  canComment,
  canDelete,
  canEdit,
  canMention = false,
  currentUserId,
  currentUserCode,
  users = [],
}: ThreadModalProps) {
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendForApproval, setSendForApproval] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const [mentionIndex, setMentionIndex] = useState<number>(0);

  const mentionUsers = mentionQuery !== null
    ? users
        .filter(
          (u) =>
            u.UserCode.toLowerCase().includes(mentionQuery.toLowerCase()) ||
            u.Fullname.toLowerCase().includes(mentionQuery.toLowerCase())
        )
        .slice(0, 8)
    : [];

  const closeMention = useCallback(() => {
    setMentionQuery(null);
    setMentionStart(-1);
    setMentionIndex(0);
  }, []);

  const handleSelectMention = useCallback(
    (user: ApiUser) => {
      const before = draft.slice(0, mentionStart);
      const after = draft.slice(mentionStart + 1 + (mentionQuery?.length ?? 0));
      const inserted = `@${user.UserCode} `;
      const newDraft = before + inserted + after;
      setDraft(newDraft);
      closeMention();
      setTimeout(() => {
        if (textareaRef.current) {
          const pos = before.length + inserted.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(pos, pos);
        }
      }, 0);
    },
    [draft, mentionStart, mentionQuery, closeMention]
  );

  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursor);
    const match = textBeforeCursor.match(/@(\w*)$/);
    if (canMention && match) {
      setMentionQuery(match[1]);
      setMentionStart(cursor - match[0].length);
      setMentionIndex(0);
    } else {
      closeMention();
    }
    setDraft(value);
  };

  useEffect(() => {
    if (open)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [open, comments.length]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    try {
      setIsSending(true);
      await onSubmit(draft.trim(), sendForApproval ? 0 : null);
      setDraft("");
      setSendForApproval(false);
      toast.success(sendForApproval ? "ส่งเพื่ออนุมัติสำเร็จ" : "เพิ่มความเห็นสำเร็จ");
    } catch {
      toast.error("ไม่สามารถส่งความเห็นได้");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col gap-0 p-0 max-h-[90vh]">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-sm font-semibold">{label}</DialogTitle>
        </DialogHeader>

        {/* Comments */}
        <div className="h-[40vh] overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              ยังไม่มีความเห็น
            </p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  users={users}
                  onApprove={onApprove}
                  onDelete={onDelete}
                  canDelete={canDelete}
                  onEdit={onEdit}
                  canEdit={
                    canEdit &&
                    String(currentUserId ?? "") !== "" &&
                    String(c.userId ?? "") !== "" &&
                    String(c.userId) === String(currentUserId)
                  }
                  canApprove={
                    !!currentUserCode &&
                    !!c.requireApprovalFromUserCode &&
                    currentUserCode === c.requireApprovalFromUserCode
                  }
                />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {canComment && (
          <div className="border-t px-4 py-3 flex flex-col gap-2">
            <div className="flex gap-2">
            <div className="relative flex-1">
              {canMention && mentionUsers.length > 0 && (
                <div className="absolute bottom-full mb-1 left-0 w-full z-50 rounded-md border bg-popover shadow-md overflow-hidden">
                  <div className="px-3 py-1.5 border-b bg-amber-50 dark:bg-amber-950/40 flex items-center gap-1.5">
                    <span className="text-xs text-amber-700 dark:text-amber-400">
                      การ tag จะทำการส่งอีเมลแจ้งเตือนไปยังผู้ถูก tag ทุกครั้ง
                    </span>
                  </div>
                  <ul className="max-h-48 overflow-y-auto py-1">
                    {mentionUsers.map((u, i) => (
                      <li
                        key={u.UserID}
                        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm hover:bg-accent ${
                          i === mentionIndex ? "bg-accent" : ""
                        }`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectMention(u);
                        }}
                        onMouseEnter={() => setMentionIndex(i)}
                      >
                        <span className="font-medium text-primary">@{u.UserCode}</span>
                        <span className="text-muted-foreground truncate">{u.Fullname}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <MentionTextarea
                textareaRef={textareaRef}
                value={draft}
                onChange={handleDraftChange}
                placeholder={canMention ? "พิมพ์ความเห็น... (พิมพ์ @ เพื่อ tag ผู้ใช้)" : "พิมพ์ความเห็น..."}
                rows={2}
                disabled={isSending}
                onKeyDown={(e) => {
                  if (mentionUsers.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setMentionIndex((i) => Math.min(i + 1, mentionUsers.length - 1));
                      return;
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setMentionIndex((i) => Math.max(i - 1, 0));
                      return;
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSelectMention(mentionUsers[mentionIndex]);
                      return;
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      closeMention();
                      return;
                    }
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!draft.trim() || isSending}
                className="self-end"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="approval"
                checked={sendForApproval}
                onCheckedChange={setSendForApproval}
              />
              <Label htmlFor="approval" className="text-xs text-muted-foreground cursor-pointer">
                ส่งเพื่ออนุมัติ
              </Label>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}