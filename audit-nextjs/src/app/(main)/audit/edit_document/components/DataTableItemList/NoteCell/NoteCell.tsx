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
import { Plus, MessageSquare, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getSession } from "next-auth/react";

// ── Types ────────────────────────────────────────────────────────────────────
export interface Comment {
  id: number;
  itemId: number;
  userId: number;
  author: string;
  authorPosition?: string;
  text: string;
  approverStatus: number | null; // null=comment ปกติ, 0=รออนุมัติ, 1=อนุมัติ, 2=ไม่อนุมัติ
  approverBy?: number;
  approverName?: string;
  approverPosition?: string;
  approverDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface NoteCellProps {
  itemId: number;
  threadType: 1 | 2 | 3; // 1=Audit, 2=AM, 3=Other
  label: string;
  initialComments?: Comment[];
  onRefresh?: () => void;
}

// ── Avatar Component ─────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const safeName = name || "?";
  const initials = safeName
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
    "bg-rose-500",
    "bg-teal-500",
  ];
  const color = colors[safeName.charCodeAt(0) % colors.length];
  return (
    <div
      className={`${color} flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold`}
    >
      {initials}
    </div>
  );
}

// ── Comment Bubble ───────────────────────────────────────────────────────────
function CommentBubble({ comment }: { comment: Comment }) {
  const isPlain = comment.approverStatus === null;

  const getStatusBadge = () => {
    if (isPlain) return null;
    if (comment.approverStatus === 0) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
          รออนุมัติ
        </span>
      );
    } else if (comment.approverStatus === 1) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">
          ✓ อนุมัติ
        </span>
      );
    } else if (comment.approverStatus === 2) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">
          ✗ ไม่อนุมัติ
        </span>
      );
    }
    return null;
  };

  return (
    <div className="flex gap-2 items-start">
      <Avatar name={comment.author} />
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-foreground">
            {comment.author}
          </span>
          {comment.authorPosition && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {comment.authorPosition}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(comment.createdAt), "d MMM yy · HH:mm", {
              locale: th,
            })}
          </span>
          {getStatusBadge()}
        </div>
        <div className="rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground whitespace-pre-wrap break-words">
          {comment.text}
        </div>
        {!isPlain &&
          (comment.approverStatus === 1 || comment.approverStatus === 2) &&
          comment.approverName && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>
                {comment.approverStatus === 1 ? "อนุมัติโดย" : "ไม่อนุมัติโดย"}:
              </span>
              <span className="font-medium text-foreground">
                {comment.approverName}
              </span>
              {comment.approverPosition && (
                <span className="px-1 py-0.5 rounded bg-muted">
                  {comment.approverPosition}
                </span>
              )}
              {comment.approverDate && (
                <span>
                  ({format(new Date(comment.approverDate), "d MMM yy · HH:mm", { locale: th })})
                </span>
              )}
            </div>
          )}
      </div>
    </div>
  );
}

// ── Approve Section ──────────────────────────────────────────────────────────
function ApproveSection({
  comment,
  onApprove,
}: {
  comment: Comment;
  onApprove: (commentId: number, status: 1 | 2) => Promise<void>;
}) {
  const [isApproving, setIsApproving] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<"1" | "2">("1");

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await onApprove(comment.id, parseInt(approvalStatus) as 1 | 2);
      toast.success(
        approvalStatus === "1"
          ? "อนุมัติความเห็นสำเร็จ"
          : "ไม่อนุมัติความเห็นสำเร็จ"
      );
    } catch {
      toast.error("เกิดข้อผิดพลาดในการอนุมัติ");
    } finally {
      setIsApproving(false);
    }
  };

  // null = ความเห็นปกติ ไม่ต้องอนุมัติ
  if (comment.approverStatus === null || comment.approverStatus !== 0) return null;

  return (
    <div className="mt-1.5 ml-9 flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2.5 py-1.5">
      {/* label */}
      <span className="text-[10px] text-muted-foreground shrink-0">
        อนุมัติ{" "}
        <span className="font-medium text-foreground">{comment.author}</span>:
      </span>

      {/* toggle */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setApprovalStatus("1")}
          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
            approvalStatus === "1"
              ? "bg-green-500 border-green-500 text-white"
              : "border-border text-muted-foreground hover:border-green-400 hover:text-green-600"
          }`}
        >
          ✓ อนุมัติ
        </button>
        <button
          type="button"
          onClick={() => setApprovalStatus("2")}
          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
            approvalStatus === "2"
              ? "bg-red-500 border-red-500 text-white"
              : "border-border text-muted-foreground hover:border-red-400 hover:text-red-500"
          }`}
        >
          ✗ ไม่อนุมัติ
        </button>
      </div>

      {/* confirm */}
      <Button
        size="sm"
        variant="ghost"
        onClick={handleApprove}
        disabled={isApproving}
        className="h-5 px-2 text-[10px] ml-auto"
      >
        {isApproving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          "ยืนยัน"
        )}
      </Button>
    </div>
  );
}

// ── Thread Modal ─────────────────────────────────────────────────────────────
function ThreadModal({
  open,
  onOpenChange,
  label,
  comments,
  onSubmit,
  onApprove,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  comments: Comment[];
  onSubmit: (text: string, approverStatus: 0 | null) => Promise<void>;
  onApprove: (commentId: number, status: 1 | 2) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isApproved, setIsApproved] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open)
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        80
      );
  }, [open, comments.length]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    try {
      setIsSending(true);
      await onSubmit(draft.trim(), isApproved ? 0 : null);
      setDraft("");
      toast.success("เพิ่มความเห็นสำเร็จ");
    } catch {
      toast.error("ไม่สามารถเพิ่มความเห็นได้");
    } finally {
      setIsSending(false);
    }
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
            <p className="text-sm text-muted-foreground text-center py-8">
              ยังไม่มีความเห็น
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id}>
                  <CommentBubble comment={c} />
                  <ApproveSection comment={c} onApprove={onApprove} />
                </div>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Reply input */}
        <div className="border-t border-border px-4 py-3 flex flex-col gap-2">
          {/* Approval switch */}
          <div className="flex items-center gap-2">
            <Switch
              id="approval-switch"
              checked={isApproved}
              onCheckedChange={setIsApproved}
              className={isApproved ? "data-[state=checked]:bg-green-500" : ""}
            />
            <Label
              htmlFor="approval-switch"
              className={`text-xs font-medium cursor-pointer select-none ${
                isApproved ? "text-green-600" : "text-red-500"
              }`}
            >
              {isApproved ? "คอมเมนต์อนุมัติ" : "คอมเมนต์ไม่อนุมัติ"}
            </Label>
          </div>

          {/* Textarea + send */}
          <div className="flex gap-2 items-end">
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
              className={`mb-0.5 flex-shrink-0 ${
                isApproved
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main NoteCell Component ──────────────────────────────────────────────────
export default function NoteCell({
  itemId,
  threadType,
  label,
  initialComments = [],
  onRefresh,
}: NoteCellProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [openThread, setOpenThread] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Map threadType to API endpoint
  const getEndpoint = () => {
    if (threadType === 1) return "audit-details";
    if (threadType === 2) return "am-details";
    return "other-details";
  };

  // Fetch comments when modal opens
  useEffect(() => {
    const fetchComments = async () => {
      if (!openThread) return;

      try {
        setIsLoading(true);
        const endpoint = getEndpoint();
        const response = await client.get(
          `/audit-items/${itemId}/${endpoint}`,
          {
            headers: dataConfig().headers,
          }
        );

        if (response.data.success) {
          // Transform API response to Comment format
          const transformedComments = response.data.data.map((c: AuditDetailsComment) => ({
            id:
              threadType === 1
                ? c.auditDetailId
                : threadType === 2
                ? c.amDetailId
                : c.otherDetailId,
            itemId: c.itemId,
            userId: c.createdBy,
            author: c.OwnerCommentUser?.fullname || "Unknown",
            authorPosition: c.OwnerCommentUser?.position,
            text: c.note,
            approverStatus: c.approverStatus ?? null,
            approverName: c.approverByUser?.fullname,
            approverPosition: c.approverByUser?.position,
            approverDate: c.approverDate,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          }));

          setComments(transformedComments);
        }
      } catch (error) {
        console.error("Error fetching comments:", error);
        toast.error("ไม่สามารถโหลดความเห็นได้");
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openThread, itemId, threadType]);

  // Submit new comment
  const handleSubmit = async (text: string, approverStatus: 0 | null = null) => {
    const endpoint = getEndpoint();
    const session = await getSession();

    const payload = {
      itemId,
      userId: session?.user?.UserID,
      note: text,
      createdBy: session?.user?.UserID,
      approverStatus,
    };

    await client.post(`/audit-items/${itemId}/${endpoint}`, payload, {
      headers: dataConfig().headers,
    });

    // Refetch comments
    const response = await client.get(`/audit-items/${itemId}/${endpoint}`, {
      headers: dataConfig().headers,
    });

    if (response.data.success) {
      const transformedComments = response.data.data.map((c: AuditDetailsComment) => ({
        id:
          threadType === 1
            ? c.auditDetailId
            : threadType === 2
            ? c.amDetailId
            : c.otherDetailId,
        itemId: c.itemId,
        userId: c.createdBy,
        author: c.OwnerCommentUser?.fullname || "Unknown",
        authorPosition: c.OwnerCommentUser?.position,
        text: c.note,
        approverStatus: c.approverStatus ?? null,
        approverName: c.approverByUser?.fullname,
        approverPosition: c.approverByUser?.position,
        approverDate: c.approverDate,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      setComments(transformedComments);
    }

    // Notify parent to refresh
    if (onRefresh) onRefresh();
  };

  // Approve/Reject comment
  const handleApprove = async (commentId: number, status: 1 | 2) => {
    const endpoint = getEndpoint();

    const payload = {
      approverStatus: status,
      approverBy: 1, // TODO: Get from auth context
    };

    await client.patch(
      `/audit-items/${itemId}/${endpoint}/${commentId}/approve`,
      payload,
      {
        headers: dataConfig().headers,
      }
    );

    // Refetch comments
    const response = await client.get(`/audit-items/${itemId}/${endpoint}`, {
      headers: dataConfig().headers,
    });

    if (response.data.success) {
      const transformedComments = response.data.data.map((c: AuditDetailsComment) => ({
        id:
          threadType === 1
            ? c.auditDetailId
            : threadType === 2
            ? c.amDetailId
            : c.otherDetailId,
        itemId: c.itemId,
        userId: c.createdBy,
        author: c.OwnerCommentUser?.fullname || "Unknown",
        authorPosition: c.OwnerCommentUser?.position,
        text: c.note,
        approverStatus: c.approverStatus ?? null,
        approverName: c.approverByUser?.fullname,
        approverPosition: c.approverByUser?.position,
        approverDate: c.approverDate,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      setComments(transformedComments);
    }

    // Notify parent to refresh
    if (onRefresh) onRefresh();
  };

  const latest = comments[comments.length - 1];

  return (
    <div className="flex flex-col gap-1.5 min-w-[180px]">
      {/* Latest comment preview */}
      <div
        className="min-h-[52px] rounded-md border border-border bg-muted/30 px-2.5 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setOpenThread(true)}
        title="คลิกเพื่อดูและตอบกลับ"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : latest ? (
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] text-muted-foreground">{latest.author}</p>
            <p className="line-clamp-2 text-foreground text-xs leading-snug">
              {latest.text}
            </p>
          </div>
        ) : (
          <span className="text-muted-foreground italic text-xs">
            ยังไม่มีความเห็น
          </span>
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
        onApprove={handleApprove}
      />
    </div>
  );
}
