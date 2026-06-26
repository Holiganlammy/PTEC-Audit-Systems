"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
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
  /** auto-open the thread modal on mount (used for email deep-link highlight) */
  autoOpen?: boolean;
  /** visually highlight this NoteCell (ring/glow) */
  highlighted?: boolean;
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
  autoOpen = false,
  highlighted = false,
}: NoteCellProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<AuditComment[]>(initialComments);
  const [openThread, setOpenThread] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const hasAutoOpened = useRef(false);

  // Auto-open modal once when mounted with autoOpen=true (email deep-link)
  useEffect(() => {
    if (autoOpen && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      setViewOnly(false);
      setOpenThread(true);
    }
  }, [autoOpen]);
  const [isLoading, setIsLoading] = useState(false);
  const roleId = session?.user?.role_id;
  // Permission logic: - Delete/Edit allowed for role 1, 2 if not locked;
  const canDelete = (roleId === 1 || roleId === 2) && !isLocked;
  const canEdit = (roleId === 1 || roleId === 2) && !isLocked;
  const canMention = false;
  
  // Permission logic for commenting:
  const canComment = (() => {
    // Thread Type 1 (Audit): role 1, 2, 4
    if (threadType === 1) {
      return roleId === 1 || roleId === 2 || roleId === 4;
    }
    
    // Thread Type 2 (AM): role 1, 2 และต้องเป็น districtManager ของ job นี้
  if (threadType === 2) {
    const isDistrictManager =
      String(session?.user?.UserID) === String(jobData?.districtManager?.userId);
    return roleId === 1 || roleId === 2 || roleId === 3 || isDistrictManager || roleId === 4;
  }
    
    // Thread Type 3 (Other): เฉพาะคนที่ถูก tag หรือ role 1, 2, 4
    return roleId === 1 || roleId === 2 || roleId === 4 || taggedUsers.some(
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
          String(c.createdBy) === String(session?.user?.UserID) &&
          c.approverStatus === 0 &&
          c.requireApprovalFrom
      );
 
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

      const actuallyTagged = new Set<string>();

      // Fetch current tagged users fresh from API to prevent duplicate tagging
      let currentTaggedUserIds = new Set<string>(
        taggedUsers.map((t) => String(t.userId))
      );
      try {
        const taggedRes = await client.get(`/audit-items/${itemId}/tagged-user`, {
          headers: dataConfig().headers,
        });
        if (taggedRes.data?.data) {
          currentTaggedUserIds = new Set<string>(
            taggedRes.data.data.map((t: { userId: string | number }) => String(t.userId))
          );
        }
      } catch {
        // fallback to prop value if API fails
      }

      for (const approverUserId of approversToTag) {
        const alreadyTagged =
          currentTaggedUserIds.has(String(approverUserId)) ||
          actuallyTagged.has(approverUserId);
        if (!alreadyTagged) {
          try {
            const roleRes = await client.get(
              `/audit-user-roles/check-role/${approverUserId}`,
              { headers: dataConfig().headers }
            );
            const hasrole = roleRes.data?.data?.hasrole;
            const approverRoleId = roleRes.data?.data?.roleId;

            // ข้ามเฉพาะเมื่อมี role (hasrole === true) และเป็น role 1, 2, 4
            if (hasrole === true && (approverRoleId === 1 || approverRoleId === 2 || approverRoleId === 4)) {
              console.log(`⏭️ Skip auto-tag userId=${approverUserId} (role ${approverRoleId})`);
              continue;
            }

            await client.post(
              `/audit-items/${itemId}/tagged-user`,
              { userId: approverUserId, createdBy: session?.user?.UserID },
              { headers: dataConfig().headers }
            );

            actuallyTagged.add(approverUserId);

            // ถ้าไม่มี role ให้เพิ่ม role 4 (user) auto
            if (hasrole === false) {
              const approverInfo = users.find((u) => u.UserID === approverUserId);
              await client.post(
                `/audit-user-roles`,
                {
                  userId: parseInt(approverUserId),
                  userCode: approverInfo?.UserCode,
                  roleId: 4,
                  createdBy: session?.user?.UserID,
                },
                { headers: dataConfig().headers }
              );
              console.log(`✅ Auto-assigned role 4 to userId=${approverUserId}`);
            }

          } catch (error) {
            console.error('❌ Failed to auto-tag:', error);
          }
        }
      }

      // Update TagCell UI — ใช้ actuallyTagged (เฉพาะคนที่ tag จริง)
      if (onTagChange && actuallyTagged.size > 0) {
        const newlyTagged = [...actuallyTagged]
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
            jobUrl: `${window.location.origin}/audit/edit_document?jobNo=${jobData?.jobNo || item?.job?.jobNo || ''}&highlightItemId=${itemId}&threadType=${threadType}`,
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

  // Derive highlight from internal comments state so it clears immediately after approval
  const hasPendingApproval = comments.some((c) => c.approverStatus === 0);
  const isHighlighted = highlighted && hasPendingApproval;

  return (
    <div className="flex flex-col gap-1.5 w-35 max-w-35">
      {/* Highlight badge — shown when this cell has a pending-approval comment */}
      {isHighlighted && (
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 w-fit">
          <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 whitespace-nowrap">
            {threadType === 1 ? "รอรับทราบ" : "รออนุมัติ"} — คลิกเพื่อดู
          </span>
        </div>
      )}
      {/* Latest comment preview */}
      <div
        className={cn(
          "min-h-9.5 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/50 transition-colors",
          isHighlighted && "ring-2 ring-amber-400 border-amber-400 bg-amber-50/20 dark:bg-amber-900/10"
        )}
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