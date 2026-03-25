"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { dataConfig } from "@/config/config";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
// import { AuditItem } from "@/app/(main)/audit/edit_document/components/DataTableItemList/Column/Column";
import DataTableItemList from "@/app/(main)/audit/edit_document/components/DataTableItemList/DataTable";

// ── Local type definitions (mirrors editdoc.d.ts) ────────────────────────────

interface DetailUser {
  userCode: string;
  fullname: string;
  email: string;
  position: string;
  branchId: number;
}

interface AuditCategoryItem {
  categoryItemId: number;
  categoryName: string;
  categoryCode: number;
  description: string;
  active: boolean;
}

interface auditDetails {
  auditDetailId: number;
  itemId: number;
  approverBy: number | null;
  approverStatus: number;
  approverDate: string | null;
  note: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  OwnerCommentUser?: DetailUser;
  approverByUser?: DetailUser;
}

interface amDetails {
  amDetailId: number;
  itemId: number;
  approverBy: number | null;
  approverStatus: number;
  approverDate: string | null;
  note: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  OwnerCommentUser?: DetailUser;
  approverByUser?: DetailUser;
}

interface OtherDetails {
  otherDetailId: number;
  itemId: number;
  approverBy: number | null;
  approverStatus: number;
  approverDate: string | null;
  note: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  OwnerCommentUser?: DetailUser;
  approverByUser?: DetailUser;
}

interface AuditItemData {
  itemId: number;
  jobId: number;
  categoryItemId: number;
  inspectionDate: string;
  itemStatus: number;
  remarks: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  categoryItem?: AuditCategoryItem;
  auditDetails: auditDetails[];
  amDetails: amDetails[];
  otherDetails: OtherDetails[];
}

// ── Transform helper ──────────────────────────────────────────────────────────

function transformItems(data: AuditItemData[]): AuditItem[] {
  return data.map((item) => ({
    item_id: item.itemId,
    job_id: item.jobId,
    category_item_id: item.categoryItemId,
    category_name: item.categoryItem?.categoryName ?? "",
    inspection_date: item.inspectionDate,
    item_status: item.itemStatus,
    remarks: item.remarks || "",
    note_1: (item.auditDetails || []).map((c) => ({
      id: c.auditDetailId,
      itemId: c.itemId,
      userId: c.createdBy,
      author: c.OwnerCommentUser?.fullname || "Unknown",
      authorPosition: c.OwnerCommentUser?.position,
      text: c.note,
      approverStatus: c.approverStatus ?? 0,
      approverBy: c.approverBy ?? undefined,
      approverName: c.approverByUser?.fullname,
      approverUsername: c.approverByUser?.userCode,
      approverPosition: c.approverByUser?.position,
      approverDate: c.approverDate ?? undefined,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    note_2: (item.amDetails || []).map((c) => ({
      id: c.amDetailId,
      itemId: c.itemId,
      userId: c.createdBy,
      author: c.OwnerCommentUser?.fullname || "Unknown",
      authorPosition: c.OwnerCommentUser?.position,
      text: c.note,
      approverStatus: c.approverStatus ?? 0,
      approverBy: c.approverBy ?? undefined,
      approverName: c.approverByUser?.fullname,
      approverUsername: c.approverByUser?.userCode,
      approverPosition: c.approverByUser?.position,
      approverDate: c.approverDate ?? undefined,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    note_3: (item.otherDetails || []).map((c) => ({
      id: c.otherDetailId,
      itemId: c.itemId,
      userId: c.createdBy,
      author: c.OwnerCommentUser?.fullname || "Unknown",
      authorPosition: c.OwnerCommentUser?.position,
      text: c.note,
      approverStatus: c.approverStatus ?? 0,
      approverBy: c.approverBy ?? undefined,
      approverName: c.approverByUser?.fullname,
      approverUsername: c.approverByUser?.userCode,
      approverPosition: c.approverByUser?.position,
      approverDate: c.approverDate ?? undefined,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    active: item.active,
  }));
}

// ── Page component ────────────────────────────────────────────────────────────

export default function AddItemsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const jobNo = searchParams.get("jobNo") ?? "";
  const jobId = parseInt(searchParams.get("jobId") ?? "0");

  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!jobId) return;
    try {
      setIsLoadingItems(true);
      const response = await client.get(`/audit-items/job/${jobId}`, {
        headers: dataConfig().headers,
      });
      if (response.data.success) {
        setAuditItems(transformItems(response.data.data));
      }
    } catch (error) {
      console.error("Error fetching audit items:", error);
      toast.error("ไม่สามารถโหลดรายการตรวจสอบได้");
    } finally {
      setIsLoadingItems(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="">
      <div className="max-w-[1400px] mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/audit/list")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับรายการ
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">เพิ่มรายการตรวจสอบ</h1>
              <p className="text-sm text-muted-foreground mt-1">
                งาน:{" "}
                <span className="font-medium text-foreground">{jobNo}</span>
              </p>
            </div>
            <Button
              onClick={() => {
                toast.success("บันทึกเสร็จสิ้น", {
                  description: `งาน ${jobNo} พร้อมใช้งาน`,
                });
                router.push("/audit/list");
              }}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              เสร็จสิ้น
            </Button>
          </div>
        </div>

        {/* Loading guard */}
        {!jobId ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        ) : (
          <DataTableItemList
            items={auditItems}
            jobNo={jobNo}
            jobId={jobId}
            isLoading={isLoadingItems}
            onItemsChange={fetchItems}
          />
        )}
      </div>
    </div>
  );
}
