// ==========================================
// ThreadModal.tsx - Simple & Clean
// ==========================================

"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
// import type { AuditComment } from "../Column/Column";

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
  canComment: boolean;
  currentUserCode?: string;
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

// ── Comment Item ──────────────────────────────────────────────────────────
function CommentItem({
  comment,
  onApprove,
  canApprove,
}: {
  comment: AuditComment;
  onApprove: (commentId: number, status: 1 | 2) => Promise<void>;
  canApprove: boolean;
}) {
  const [isApproving, setIsApproving] = useState(false);

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

  return (
    <div className="flex gap-2.5 items-start">
      <Avatar name={comment.author} />
      
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm font-semibold">{comment.author}</span>
          {comment.authorUserCode && (
            <span className="text-xs text-muted-foreground">
              ({comment.authorUserCode})
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {format(new Date(comment.createdAt), "d MMM · HH:mm", { locale: th })}
          </span>
        </div>

        {/* Message */}
        <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm whitespace-pre-wrap break-words border">
          {comment.text}
        </div>

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
  canComment,
  currentUserCode,
}: ThreadModalProps) {
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendForApproval, setSendForApproval] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
        <div className="flex-1 overflow-y-auto px-4 py-3 max-h-[50vh]">
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
                  onApprove={onApprove}
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
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="พิมพ์ความเห็น..."
                rows={2}
                className="resize-none flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isSending}
              />
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