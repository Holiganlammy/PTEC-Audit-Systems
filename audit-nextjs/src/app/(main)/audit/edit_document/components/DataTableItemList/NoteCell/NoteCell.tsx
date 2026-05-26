"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { useSession } from "next-auth/react";
import type { TaggedUser } from "../TagCell/TagCell";
import ThreadModal from "./ThreadModal";

interface ApiUser {
  UserID: string;
  UserCode: string;
  Fullname: string;
  Email: string;
}

interface NoteCellProps {
  itemId: number;
  threadType: 1 | 2 | 3; // 1=Audit, 2=AM, 3=Other
  label: string;
  initialComments?: AuditComment[];
  onRefresh?: () => void;
  onTagChange?: (itemId: number, tags: TaggedUser[]) => void;
  onCommentsChange?: (itemId: number, threadType: 1 | 2 | 3, comments: AuditComment[]) => void;
  taggedUsers?: TaggedUser[];
  jobData?: AuditJobData;
  users?: ApiUser[];
  isLocked?: boolean;
}

interface auditCommentsComment {
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


// ── Main NoteCell Component ──────────────────────────────────────────────────
export default function NoteCell({
  itemId,
  threadType,
  label,
  initialComments = [],
  // onRefresh is kept for potential future use (currently unused after modal-close fix)
  onTagChange,
  onCommentsChange,
  taggedUsers = [],
  jobData,
  users = [],
  isLocked = false,
}: NoteCellProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<AuditComment[]>(initialComments);
  const [openThread, setOpenThread] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const roleId = session?.user?.role_id;

  const canDelete = (roleId === 1 || roleId === 2) && !isLocked;
  const canEdit = (roleId === 1 || roleId === 2) && !isLocked;
  const canMention = roleId === 1 || roleId === 2 || roleId === 3;
  
  const canComment = (() => {
    // Thread Type 1 (Audit): role 1, 2, 4
    if (threadType === 1) {
      return roleId === 1 || roleId === 2 || roleId === 4;
    }
    
    // Thread Type 2 (AM): role 1, 2 และต้องเป็น districtManager ของ job นี้
  if (threadType === 2) {
    const isDistrictManager =
      String(session?.user?.UserID) === String(jobData?.districtManager?.userId);
    return roleId === 1 || roleId === 2 || roleId === 3 || isDistrictManager;
  }
    
    // Thread Type 3 (Other): เฉพาะคนที่ถูก tag หรือ role 1, 2
    return roleId === 1 || roleId === 2 || taggedUsers.some(
      (t) => String(t.userId) === String(session?.user?.UserID)
    );
  })();

  // Map threadType to API endpoint
  const getEndpoint = () => {
    if (threadType === 1) return "audit-comments";
    if (threadType === 2) return "am-comments";
    return "other-comments";
  };

  // Fetch comments when modal opens
  useEffect(() => {
    const fetchComments = async () => {
      if (!openThread) return;
      // Draft items have negative itemId — skip API fetch, keep initialComments
      if (itemId <= 0) return;

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
            (c: auditCommentsComment) => ({
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
 
  const payload = {
    itemId,
    userId: session?.user?.UserID,
    note: text,
    createdBy: session?.user?.UserID,
    approverStatus,
  };
 
  // 1. Save comment
  await client.post(
    `/audit-items/${itemId}/${endpoint}`,
    payload,
    { headers: dataConfig().headers }
  );
 
  // 2. Fetch comments (ทำครั้งเดียว)
  const response = await client.get(`/audit-items/${itemId}/${endpoint}`, {
    headers: dataConfig().headers,
  });
 
  if (response.data.success) {
    const latestComments = response.data.data;
 
    //  Auto-tag approver (ถ้าส่งเพื่ออนุมัติ)
    if (approverStatus === 0) {
      // หา comment ที่เพิ่งสร้าง
      const myPendingComments = latestComments.filter(
        (c: auditCommentsComment) =>
          c.createdBy === session?.user?.UserID &&
          c.approverStatus === 0 &&
          c.requireApprovalFrom
      );
 
      // เก็บ approver ที่ต้อง tag
      const approversToTag = new Set<string>();
 
      myPendingComments.forEach((c: auditCommentsComment) => {
        if (c.requireApprovalFrom) {
          const approverUser = users.find(
            (u: ApiUser) => u.UserCode === c.requireApprovalFrom!.userCode
          );
 
          if (approverUser) {
            approversToTag.add(approverUser.UserID);
          }
        }
      });
 
      // Tag approvers
      for (const approverUserId of approversToTag) {
        const alreadyTagged = taggedUsers.some(
          (t) => String(t.userId) === String(approverUserId)
        );
 
        if (!alreadyTagged) {
          try {
            await client.post(
              `/audit-items/${itemId}/tagged-user`,
              {
                userId: approverUserId,
                createdBy: session?.user?.UserID,
              },
              { headers: dataConfig().headers }
            );
          } catch (error) {
            console.error('❌ Failed to auto-tag:', error);
          }
        }
      }
 
      // Update TagCell UI immediately without refresh
      if (onTagChange) {
        const newlyTagged = [...approversToTag]
          .filter(uid => !taggedUsers.some(t => String(t.userId) === String(uid)))
          .map(uid => {
            const u = users.find(u => u.UserID === uid);
            return u ? { userId: u.UserID, userCode: u.UserCode, fullname: u.Fullname } : null;
          })
          .filter((t): t is TaggedUser => t !== null);
        if (newlyTagged.length > 0) {
          onTagChange(itemId, [...taggedUsers, ...newlyTagged]);
        }
      }
    }
 
    // Update UI
    const transformedComments: AuditComment[] = latestComments.map(
      (c: auditCommentsComment) => ({
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
    onCommentsChange?.(itemId, threadType, transformedComments);
  }
 
  // 3. Send email notification to mentioned users
  const mentionMatches = [...text.matchAll(/@(\w+)/g)];
  const mentionedCodes = Array.from(
    new Set(mentionMatches.map((m) => m[1]))
  );
  
  if (mentionedCodes.length > 0) {
    const mentionedUserList = users.filter((u) =>
      mentionedCodes.includes(u.UserCode)
    );
    
    if (mentionedUserList.length > 0) {
      try {
        // ดึงข้อมูล Item เพื่อส่งในเมล
        const itemResponse = await client.get(
          `/audit-items/${itemId}`,
          { headers: dataConfig().headers }
        );
        
        const item = itemResponse.data.data;
 
        await client.post(
          "/audit-email/mention-email",
          {
            mentionedUsers: mentionedUserList.map((u) => ({
              userId: u.UserID,
              userCode: u.UserCode,
              fullname: u.Fullname,
              email: u.Email, // ← จำเป็น!
            })),
            commentText: text,
            senderName: session?.user?.UserCode || 
                        `${session?.user?.fristName ?? ""} ${session?.user?.lastName ?? ""}`.trim() || 
                        "Unknown",
            itemId,
            threadType,
            jobNo: jobData?.jobNo || item?.job?.jobNo || '-',
            branchName: jobData?.branchName || item?.job?.branchName || '-',
            categoryName: item?.categoryItem?.categoryName || '-',
            itemStatus: item?.itemStatus ?? 0,
            amChecklistStatus: item?.amChecklistStatus ?? null,
            auditChecked: item?.note_1 && item.note_1.length > 0,
            auditDate: item?.inspectionDate || '-',
          },
          { headers: dataConfig().headers }
        );
        
        console.log(`✓ Sent mention email to ${mentionedUserList.length} users`);
      } catch (err) {
        console.error("❌ Failed to send mention notification email:", err);
      }
    }
  }
};

  // Delete comment
  const handleDelete = async (commentId: number, remark: string) => {
    const endpoint = getEndpoint();

    const itemIdParam = String(itemId).trim();
    const commentIdParam = String(commentId).trim();

    // Backend validates params as "numeric string"
    if (!/^\d+$/.test(itemIdParam) || !/^\d+$/.test(commentIdParam)) {
      throw new Error(`Invalid route params: itemId=${itemIdParam}, commentId=${commentIdParam}`);
    }

    const remarkText = String(remark ?? "").trim();
    if (!remarkText) {
      throw new Error("Delete remark is required");
    }

    await client.delete(`/audit-items/${itemIdParam}/${endpoint}/${commentIdParam}`,{
      headers: dataConfig().headers,
      data: { updatedBy: session?.user?.UserID, deletedReason: remarkText },
    });

    // Refetch comments
    const response = await client.get(`/audit-items/${itemIdParam}/${endpoint}`, {
      headers: dataConfig().headers,
    });

    if (response.data.success) {
      const transformedComments: AuditComment[] = response.data.data.map(
        (c: auditCommentsComment) => ({
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
      onCommentsChange?.(itemId, threadType, transformedComments);
    }
  };

  // Edit comment
  const handleEdit = async (commentId: number, note: string) => {
    const endpoint = getEndpoint();

    const itemIdParam = String(itemId).trim();
    const commentIdParam = String(commentId).trim();
    if (!/^\d+$/.test(itemIdParam) || !/^\d+$/.test(commentIdParam)) {
      throw new Error(`Invalid route params: itemId=${itemIdParam}, commentId=${commentIdParam}`);
    }

    const payload = {
      note,
      updateBy: session?.user?.UserID,
    };

    await client.put(`/audit-items/${itemIdParam}/${endpoint}/${commentIdParam}`, payload, {
      headers: dataConfig().headers,
    });

    const response = await client.get(`/audit-items/${itemIdParam}/${endpoint}`, {
      headers: dataConfig().headers,
    });

    if (response.data.success) {
      const transformedComments: AuditComment[] = response.data.data.map(
        (c: auditCommentsComment) => ({
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
      onCommentsChange?.(itemId, threadType, transformedComments);
    }
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
        (c: auditCommentsComment) => ({
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
      onCommentsChange?.(itemId, threadType, transformedComments);
    }
  };

  const latest = comments[comments.length - 1];

  return (
    <div className="flex flex-col gap-1.5 w-[220px] max-w-[220px]">
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
        {canComment && !isLocked && (
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
        onOpenChange={setOpenThread}
        label={label}
        comments={comments}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        onApprove={handleApprove}
        onDelete={handleDelete}
        onEdit={handleEdit}
        canComment={openThread && canComment && !viewOnly}
        canDelete={canDelete}
        canEdit={canEdit}
        canMention={canMention}
        currentUserId={session?.user?.UserID}
        currentUserCode={session?.user?.UserCode}
        users={users}
        isAuditUnit={threadType === 1}
      />
    </div>
  );
}