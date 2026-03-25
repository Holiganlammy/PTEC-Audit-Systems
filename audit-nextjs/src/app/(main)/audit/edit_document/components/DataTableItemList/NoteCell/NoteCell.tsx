"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { getSession, useSession } from "next-auth/react";
import type { TaggedUser } from "../TagCell/TagCell";
import ThreadModal from "./ThreadModal";

interface NoteCellProps {
  itemId: number;
  threadType: 1 | 2 | 3; // 1=Audit, 2=AM, 3=Other
  label: string;
  initialComments?: AuditComment[];
  onRefresh?: () => void;
  taggedUsers?: TaggedUser[];
  jobData?: AuditJobData;
}

interface AuditDetailsComment {
  auditDetailId?: number;
  amDetailId?: number;
  otherDetailId?: number;
  itemId: number;
  userId: number;
  note: string;
  approverStatus: number | null;
  approverBy?: number;
  approverDate?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  OwnerCommentUser?: {
    fullname: string;
    position?: string;
  };
  approverByUser?: {
    fullname: string;
    userCode?: string;
    position?: string;
  };
  requireApprovalFrom?: {
    userCode: string;
    fullname: string;
  };
}

interface AuditJobData {
  jobid: number;
  jobNo: string;
  districtManager?: {
    userId: number;
  };
}

// ── Main NoteCell Component ──────────────────────────────────────────────────
export default function NoteCell({
  itemId,
  threadType,
  label,
  initialComments = [],
  onRefresh,
  taggedUsers = [],
  jobData,
}: NoteCellProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<AuditComment[]>(initialComments);
  const [openThread, setOpenThread] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  console.log(session?.user.role_id, "session role id in NoteCell");
  const roleId = session?.user?.role_id;
  console.log("Current User Role ID:", roleId);
  
  const canComment = (() => {
    // Thread Type 1 (Audit): role 1, 2, 4
    if (threadType === 1) {
      return roleId === 1 || roleId === 2 || roleId === 4;
    }
    
    // Thread Type 2 (AM): role 1, 2 และต้องเป็น districtManager ของ job นี้
  if (threadType === 2) {
    const isDistrictManager =
      String(session?.user?.UserID) === String(jobData?.districtManager?.userId);
    return roleId === 1 || roleId === 2 || isDistrictManager;
  }
    
    // Thread Type 3 (Other): เฉพาะคนที่ถูก tag
    return taggedUsers.some(
      (t) => String(t.userId) === String(session?.user?.UserID)
    );
  })();

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
          // Transform API response to AuditComment format
          const transformedComments: AuditComment[] = response.data.data.map(
            (c: AuditDetailsComment) => ({
              id:
                threadType === 1
                  ? c.auditDetailId!
                  : threadType === 2
                  ? c.amDetailId!
                  : c.otherDetailId!,
              itemId: c.itemId,
              userId: c.createdBy,
              author: c.OwnerCommentUser?.fullname || "Unknown",
              authorPosition: c.OwnerCommentUser?.position,
              text: c.note,
              approverStatus: c.approverStatus ?? null,
              approverName: c.approverByUser?.fullname,
              approverUsername: c.approverByUser?.userCode,
              approverPosition: c.approverByUser?.position,
              approverDate: c.approverDate,
              requireApprovalFromUserCode: c.requireApprovalFrom?.userCode,
              requireApprovalFromName: c.requireApprovalFrom?.fullname,
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
            })
          );
          
          console.log("✅ Fetched comments:", transformedComments);
          setComments(transformedComments);
        }
      } catch (error) {
        console.error("❌ Error fetching comments:", error);
        toast.error("ไม่สามารถโหลดความเห็นได้");
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openThread, itemId, threadType]);

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
      const transformedComments: AuditComment[] = response.data.data.map(
        (c: AuditDetailsComment) => ({
          id:
            threadType === 1
              ? c.auditDetailId!
              : threadType === 2
              ? c.amDetailId!
              : c.otherDetailId!,
          itemId: c.itemId,
          userId: c.createdBy,
          author: c.OwnerCommentUser?.fullname || "Unknown",
          authorPosition: c.OwnerCommentUser?.position,
          text: c.note,
          approverStatus: c.approverStatus ?? null,
          approverName: c.approverByUser?.fullname,
          approverUsername: c.approverByUser?.userCode,
          approverPosition: c.approverByUser?.position,
          approverDate: c.approverDate,
          requireApprovalFromUserCode: c.requireApprovalFrom?.userCode,
          requireApprovalFromName: c.requireApprovalFrom?.fullname,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })
      );

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
      approverBy: session?.user?.UserID,
      approverDate: new Date().toISOString(),
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
      const transformedComments: AuditComment[] = response.data.data.map(
        (c: AuditDetailsComment) => ({
          id:
            threadType === 1
              ? c.auditDetailId!
              : threadType === 2
              ? c.amDetailId!
              : c.otherDetailId!,
          itemId: c.itemId,
          userId: c.createdBy,
          author: c.OwnerCommentUser?.fullname || "Unknown",
          authorPosition: c.OwnerCommentUser?.position,
          text: c.note,
          approverStatus: c.approverStatus ?? null,
          approverName: c.approverByUser?.fullname,
          approverUsername: c.approverByUser?.userCode,
          approverPosition: c.approverByUser?.position,
          approverDate: c.approverDate,
          requireApprovalFromUserCode: c.requireApprovalFrom?.userCode,
          requireApprovalFromName: c.requireApprovalFrom?.fullname,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })
      );
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
        onClick={() => {
          setViewOnly(true);
          setOpenThread(true);
        }}
        title="คลิกเพื่อดูความเห็น"
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
        {canComment && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 gap-1 text-xs"
            onClick={() => {
              setViewOnly(false);
              setOpenThread(true);
            }}
          >
            <Plus className="h-3 w-3" />
            เพิ่ม
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 gap-1 text-xs text-muted-foreground"
          onClick={() => {
            setViewOnly(true);
            setOpenThread(true);
          }}
        >
          <MessageSquare className="h-3 w-3" />
          {comments.length > 0 && <span>{comments.length}</span>}
        </Button>
      </div>

      <ThreadModal
        open={openThread}
        onOpenChange={(v) => {
          setOpenThread(v);
          if (!v) setViewOnly(false);
        }}
        label={label}
        comments={comments}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        onApprove={handleApprove}
        canComment={canComment && !viewOnly}
        currentUserCode={session?.user?.UserCode}
      />
    </div>
  );
}