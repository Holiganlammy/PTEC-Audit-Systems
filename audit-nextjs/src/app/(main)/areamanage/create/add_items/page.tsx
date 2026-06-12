"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { dataConfig } from "@/config/config";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft, CheckCircle, Loader2, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import DataTableItemList from "@/app/(main)/areamanage/edit_document/components/DataTableItemList/DataTable";
import { format } from "date-fns";
import {
  loadDraft,
  clearDraft,
  updateDraftItems,
  loadDraftHeaderFiles,
  type AMAuditDraftHeader,
} from "@/utils/am-audit-draft";
import { useSession } from "next-auth/react";

// ── Transform helper ──────────────────────────────────────────────────────────

function transformItems(data: AMItemData[]): AuditItem[] {
  return data.map((item) => ({
    item_id: item.itemId,
    job_id: item.jobId,
    category_item_id: item.categoryItemId,
    category_name: item.categoryItem?.categoryName ?? "",
    inspection_date: item.inspectionDate,
    item_status: item.itemStatus,
    item_status_edit: item.itemStatusEdit,
    remarks: item.remarks || "",
    note_1: (item.amCheckerComments  || []).map((c) => ({
      id: c.amCheckerDetailId,
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
    note_2: (item.amComments || []).map((c) => ({
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
    note_3: (item.otherComments || []).map((c) => ({
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
  const { data: session } = useSession();

  const mode = searchParams.get("mode"); // "draft" or null
  const formTypeParam = searchParams.get("formType") === "AA" ? "AA" : "AM";
  const jobNoParam = searchParams.get("jobNo") ?? "";
  const jobIdParam = parseInt(searchParams.get("jobId") ?? "0");

  const [isDraftMode, setIsDraftMode] = useState(false);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [jobData, setJobData] = useState<AuditJobData | null>(null);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Draft state
  const [draftHeader, setDraftHeader] = useState<AMAuditDraftHeader | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // ตรวจสอบโหมด Draft
  useEffect(() => {
    if (mode === "draft") {
      const draft = loadDraft(formTypeParam);
      if (!draft) {
        toast.error("ไม่พบข้อมูล Draft", {
          id: "draft-not-found",
          description: "กรุณาสร้าง Header ก่อน",
        });
        router.push(`/areamanage/create?formType=${formTypeParam}`);
        return;
      }

      setIsDraftMode(true);
      setDraftHeader({ ...draft.header, RoleFormType: draft.header.RoleFormType || formTypeParam });

      // โหลด Items จาก Draft
      if (draft.items && draft.items.length > 0) {
        // แปลง Draft Items เป็น AuditItem format
        const draftItems: AuditItem[] = draft.items.map((item) => ({
          item_id: 0, // Temp ID
          job_id: 0,
          category_item_id: item.category_item_id,
          category_name: item.category_name,
          inspection_date: item.inspection_date,
          item_status: item.item_status,
          item_status_edit: item.item_status_edit,
          remarks: item.remarks,
          note_1: item.note_1 || [],
          note_2: item.note_2 || [],
          note_3: item.note_3 || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          active: true,
        }));
        setAuditItems(draftItems);
      }

      toast.info("โหมด Draft", {
        id: "draft-mode-info",
        description: "กำลังเพิ่มรายการตรวจสอบ",
      });
    } else if (jobNoParam && jobIdParam) {
      setIsDraftMode(false);
    }
  }, [mode, formTypeParam, jobNoParam, jobIdParam, router]);

  // Fetch Job Data (ถ้าไม่ใช่ Draft Mode)
  useEffect(() => {
    if (!isDraftMode && jobNoParam) {
      client
        .get("/am-jobs/detail", {
          params: { jobNo: jobNoParam },
          headers: dataConfig().headers,
        })
        .then((res) => {
          if (res.data?.success) setJobData(res.data.data);
        })
        .catch(() => {});
    }
  }, [isDraftMode, jobNoParam]);

  // Fetch Items (ถ้าไม่ใช่ Draft Mode)
  const fetchItems = useCallback(async () => {
    if (isDraftMode || !jobIdParam) return;

    try {
      setIsLoadingItems(true);
      const response = await client.get(`/am-items/job/${jobIdParam}`, {
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
  }, [isDraftMode, jobIdParam]);

  useEffect(() => {
    if (!isDraftMode) {
      fetchItems();
    }
  }, [fetchItems, isDraftMode]);

  // Fetch branches & users (สำหรับ Draft Mode)
  useEffect(() => {
    if (!isDraftMode) return;

    const fetchBranches = async () => {
      try {
        const response = await client.get("/branch", {
          headers: dataConfig().headers,
        });
        if (response.data.success) {
          setBranches(response.data.data.filter((b: Branch) => b.name?.startsWith("สาขา")));
        }
      } catch (error) {
        console.error("Error fetching branches:", error);
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await client.get("/users", {
          headers: dataConfig().headers,
        });
        if (Array.isArray(response.data)) {
          setUsers(response.data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchBranches();
    fetchUsers();
  }, [isDraftMode]);

  /**
   * เสร็จสิ้น - สร้าง Job + Items (Draft Mode)
   */
  const handleFinishDraft = async () => {
    if (!draftHeader) return;

    const isAA = formTypeParam === "AA";

    try {
      setIsSubmitting(true);

      // 1. หา Branch Manager
      const selectedBranch = branches.find(
        (b) => b.branchid.toString() === draftHeader.Branch
      );
      const branchManagers = users.filter(
        (u) =>
          u.Position?.toLowerCase().includes("ผู้จัดการสาขา") ||
          u.PositionCode === "BM"
      );
      const branchManager = branchManagers.find(
        (u) => u.BranchID === selectedBranch?.branchid
      );

      // 2. สร้าง Header Payload
      const headerPayload = {
        branchId: parseInt(draftHeader.Branch),
        branchName: selectedBranch?.name || "",
        auditDate: format(new Date(draftHeader.Date), "yyyy-MM-dd"),
        address: draftHeader.Address || "",
        pmCode: draftHeader.PMCode || "",
        auditorUserId: parseInt(draftHeader.Auditor),
        districtManagerUserId: parseInt(draftHeader.DistrictManager),
        branchManagerUserId: parseInt(branchManager?.UserID || "0"),
        additionalNotes: draftHeader.AdditionalNotes || "",
        positionType: draftHeader.RoleFormType,
        status: 1,
        createdBy: session?.user?.UserID,
      };

      // 3. สร้าง Job (AM หรือ AA ตาม formTypeParam)
      const jobCreateEndpoint = isAA ? "/aa-jobs/create" : "/am-jobs/create";
      const result = await client.post(jobCreateEndpoint, headerPayload, {
        headers: dataConfig().headers,
      });

      const createdJobNo = result.data.jobNo ?? result.data.data?.jobNo ?? "";
      const createdJobId = result.data.jobId ?? result.data.data?.jobId ?? "";

      if (!createdJobId) {
        throw new Error("ไม่สามารถสร้าง Job ได้");
      }

      // 4. สร้าง Items (ถ้ามี)
      if (auditItems.length > 0) {
        const itemsPayload = auditItems.map((item) => ({
          jobId: createdJobId,
          categoryItemId: item.category_item_id,
          inspectionDate: item.inspection_date,
          itemStatus: item.item_status,
          remarks: item.remarks,
          jobSource: isAA ? "AA" : undefined,
          createdBy: session?.user?.UserID,
        }));

        const bulkResult = await client.post(
          `/am-items/bulk`,
          itemsPayload,
          { headers: dataConfig().headers }
        );

        // 4.1 Post audit comments (note_1) ที่บันทึกไว้ใน draft
        const createdItems: { itemId: number }[] =
          bulkResult.data?.data ?? bulkResult.data ?? [];
        if (Array.isArray(createdItems) && createdItems.length === auditItems.length) {
          for (let i = 0; i < auditItems.length; i++) {
            const item = auditItems[i];
            const created = createdItems[i];
            if (!created?.itemId) continue;
            const draftComment = item.note_1?.[0];
            if (!draftComment?.text?.trim()) continue;
            const approverStatus = draftComment.approverStatus === 0 ? 0 : null;
            await client.post(
              `/am-items/${created.itemId}/audit-comments`,
              {
                itemId: created.itemId,
                note: draftComment.text,
                userId: draftHeader.Auditor,
                createdBy: session?.user?.UserID,
                approverStatus,
              },
              { headers: dataConfig().headers }
            );
          }
        }
      }

      // 5. อัปโหลดไฟล์แนบ Header (ถ้ามี)
      const headerFiles = await loadDraftHeaderFiles(formTypeParam);
      if (headerFiles.length > 0) {
        const formData = new FormData();
        headerFiles.forEach((file) => {
          formData.append("files", file);
        });
        formData.append("uploadedBy", String(session?.user?.UserID ?? ""));

        const fileUploadEndpoint = isAA
          ? `/aa-jobs/${createdJobId}/header-attachments`
          : `/am-jobs/${createdJobId}/header-attachments`;

        await client.post(fileUploadEndpoint, formData, {
          headers: {
            ...dataConfig().headers,
            "Content-Type": "multipart/form-data",
          },
        });
      }

      // 6. Clear Draft
      clearDraft(formTypeParam);

      toast.success("เสร็จสิ้น!", {
        description: `งาน ${createdJobNo} ถูกสร้างเรียบร้อยแล้ว`,
      });

      router.push("/areamanage/list");
    } catch (error) {
      console.error("Error creating job:", error);
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "ไม่สามารถสร้างงานได้";
      toast.error("เกิดข้อผิดพลาด", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    if (isDraftMode) {
      handleFinishDraft();
    } else {
      router.push("/audit/list");
    }
  };

  // Items เปลี่ยน → อัพเดท Draft (ถ้าเป็น Draft Mode)
  const handleItemsChange = useCallback((updatedItems?: AuditItem[]) => {
    if (isDraftMode) {
      if (updatedItems !== undefined) {
        setAuditItems(updatedItems);
        const draftItems = updatedItems.map((item) => ({
          tempId: `temp-${item.item_id}`,
          category_item_id: item.category_item_id,
          category_name: item.category_name,
          inspection_date: item.inspection_date,
          item_status: item.item_status,
          item_status_edit: item.item_status_edit || null,
          remarks: item.remarks,
          note_1: item.note_1 ?? [],
          note_2: item.note_2 ?? [],
          note_3: item.note_3 ?? [],
        }));
        updateDraftItems(draftItems, formTypeParam);
      }
    } else {
      fetchItems();
    }
  }, [isDraftMode, fetchItems, formTypeParam]);

  const handleBack = () => {
    if (isDraftMode) {
      // กลับไป Create Page (Draft ยังอยู่)
      router.push(`/areamanage/create?formType=${formTypeParam}`);
    } else {
      router.push("/audit/list");
    }
  };

  // ถ้าเป็น Normal Mode แต่ Job ถูกยกเลิก
  if (!isDraftMode && jobData?.active === false) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 text-center px-4">
        <div className="rounded-full bg-red-100 p-8">
          <X className="h-20 w-20 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-red-600">
            เอกสารถูกยกเลิกแล้ว
          </h1>
          <p className="text-muted-foreground">
            งาน:{" "}
            <span className="font-medium text-foreground">{jobNoParam}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            เอกสารนี้ถูกยกเลิกและไม่สามารถดำเนินการใดๆ ได้
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/audit/list")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          กลับรายการ
        </Button>
      </div>
    );
  }

  return (
    <div className="">
      <div className="max-w-[1400px] mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isDraftMode ? "กลับไปแก้ไข Header" : "กลับรายการ"}
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">เพิ่มรายการตรวจสอบ</h1>
              {isDraftMode ? (
                <p className="text-sm text-muted-foreground mt-1">
                  โหมด:{" "}
                  <span className="font-medium text-orange-600">Draft</span> |
                  สาขา:{" "}
                  <span className="font-medium text-foreground">
                    {branches.find(
                      (b) => b.branchid.toString() === draftHeader?.Branch
                    )?.name || "ไม่ระบุ"}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  งาน:{" "}
                  <span className="font-medium text-foreground">
                    {jobNoParam}
                  </span>
                </p>
              )}
            </div>
            <Button onClick={() => setShowFinishDialog(true)} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  เสร็จสิ้น
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Draft Mode Warning */}
        {isDraftMode && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>โหมด Draft:</strong> ข้อมูลจะถูกบันทึกชั่วคราวใน
              SessionStorage เมื่อกด <strong>&ldquo;เสร็จสิ้น&rdquo;</strong>{" "}
              ระบบจะสร้างเอกสารทันที
            </AlertDescription>
          </Alert>
        )}

        {/* Finish confirmation dialog */}
        <AlertDialog
          open={showFinishDialog}
          onOpenChange={setShowFinishDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันการเสร็จสิ้น</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {isDraftMode ? (
                    <>
                      <p>
                        เมื่อกด <strong className="text-foreground">ยืนยัน</strong>{" "}
                        ระบบจะ:
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>สร้างเอกสารงานตรวจสอบ</li>
                        <li>บันทึกรายการตรวจสอบทั้งหมด ({auditItems.length} รายการ)</li>
                        <li>อัปโหลดไฟล์แนบ Header (ถ้ามี)</li>
                        <li>ลบข้อมูล Draft</li>
                      </ul>
                    </>
                  ) : (
                    <p>
                      เมื่อกด <strong className="text-foreground">ยืนยัน</strong>{" "}
                      ระบบจะพาคุณกลับไปยังหน้ารายการ
                    </p>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                ยกเลิก (เพิ่มรายการต่อ)
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleFinish} disabled={isSubmitting || (!isDraftMode)}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  isDraftMode ? "ยืนยัน (สร้างเอกสาร)" : "ยืนยัน"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Loading guard */}
        {!isDraftMode && !jobIdParam ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        ) : (
          <DataTableItemList
            items={auditItems}
            jobNo={isDraftMode ? "DRAFT" : jobNoParam}
            jobId={isDraftMode ? 0 : jobIdParam}
            jobData={jobData ?? undefined}
            isLoading={isLoadingItems}
            isDraftMode={isDraftMode}
            inspectionDate={draftHeader?.Date}
            positionType={isDraftMode ? draftHeader?.RoleFormType : undefined}
            onItemsChange={handleItemsChange}
          />
        )}
      </div>
    </div>
  );
}