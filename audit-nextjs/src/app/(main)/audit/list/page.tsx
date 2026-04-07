"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { dataConfig } from "@/config/config";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";

import { DataTable } from "@/components/DataTable";
import { createAuditListColumns } from "./DataTable/Column";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";

// Types
interface AuditStatusInfo {
  auditStatusId: number;
  statusName: string;
}

interface AuditList {
  jobId: number;
  jobNo: string;
  branchId: number;
  branchName: string;
  auditDate: string;
  status: number;
  statusInfo?: AuditStatusInfo;
  auditor?: {
    userCode: string;
    fullname: string;
    email: string;
  };
  districtManager?: {
    userCode: string;
    fullname: string;
    email: string;
  };
  branchManager?: {
    userCode: string;
    fullname: string;
    email: string;
  };
  createdByUser?: {
    userCode: string;
    fullname: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

interface FetchJobsParams {
  page: number;
  limit: number;
  status?: string;
  branchId?: string;
}

interface PaginationMeta {
  page: string;
  limit: string;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ApiResponse {
  code: number;
  data: AuditList[];
  message: string;
  pagination: PaginationMeta;
  user: {
    role_id: number;
    is_admin: boolean;
  };
}

export default function AuditJobsListPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<AuditList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [deleteJobId, setDeleteJobId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteNote, setDeleteNote] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const session = useSession();

  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: FetchJobsParams = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      if (branchFilter !== "all") {
        params.branchId = branchFilter;
      }

      const response = await client.get<ApiResponse>("/audit-jobs/list", {
        headers: dataConfig().headers,
        params,
      });

      if (response.data.code === 200) {
        setJobs(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error: unknown) {
      console.error("Error fetching audit jobs:", error);
      const errorMessage =
        error instanceof Error && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      toast.error("ไม่สามารถโหลดข้อมูลได้", {
        description: errorMessage || "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, branchFilter, itemsPerPage]);

  // Fetch jobs from API
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Handle delete job
  const handleDelete = async () => {
    if (!deleteJobId) return;

    setIsDeleting(true);
    try {
      await client.delete(`/audit-jobs/${deleteJobId}`,{
        headers: dataConfig().headers,
        data:{ delete_reason: deleteNote , deleted_by: session.data?.user.UserID }
      });

      toast.success("ลบงานสำเร็จ");
      fetchJobs();
    } catch (error: unknown) {
      console.error("Error deleting audit job:", error);
      const errorMessage =
        error instanceof Error && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      toast.error("ไม่สามารถลบงานได้", {
        description: errorMessage || "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsDeleting(false);
      setDeleteJobId(null);
      setDeleteNote("");
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter("all");
    setBranchFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== "all" || branchFilter !== "all";

  // // ── Permission filter ──────────────────────────────────────────────────────
  // const visibleJobs = useMemo(() => {
  //   const roleId = session.data?.user?.role_id;
  //   const userCode = session.data?.user?.UserCode;
  //   if (!userCode) return jobs;
  //   console.log("Filtering jobs for user:", userCode, "with role:", roleId);
  //   // role 1 หรือ 2: เห็นทุก job
  //   if (roleId === 1 || roleId === 2) return jobs;

  //   // role 3: เห็นเฉพาะ job ที่ตัวเองเป็น districtManager
  //   if (roleId === 3) {
  //     return jobs.filter((job) => job.districtManager?.userCode === userCode);
  //   }

  //   // อื่นๆ: ไม่เห็น job ใด
  //   return [];
  // }, [jobs, session.data]);

  // Get filter labels
  const getStatusLabel = (value: string) => {
    const labels: Record<string, string> = {
      all: "ทั้งหมด",
      "1": "อยู่ระหว่างดำเนินการ",
      "2": "ดำเนินการเสร็จสิ้น",
    };
    return labels[value] || value;
  };

  const getBranchLabel = (value: string) => {
    const labels: Record<string, string> = {
      all: "All Branches",
      "83": "สาขา 83",
      "85": "สาขา 85",
      "901": "HO",
    };
    return labels[value] || value;
  };

  return (
    <div className="py-8">
      <div className="container mx-auto px-4 max-w-[1500px]">
        {/* Header with Inline Filters */}
        <div className="mb-6">
          <div className="flex flex-col gap-4">
            {/* Title and Create Button */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Audit Jobs Management
                </h1>
                <p className="text-muted-foreground mt-2">
                  จัดการและติดตามงานตรวจสอบทั้งหมดของระบบ
                </p>
              </div>
              <Button
                onClick={() => router.push("/audit/create")}
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create New Job
              </Button>
            </div>

            {/* Inline Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">
                Filters:
              </span>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="1">อยู่ระหว่างดำเนินการ</SelectItem>
                  <SelectItem value="2">ดำเนินการเสร็จสิ้น</SelectItem>
                </SelectContent>
              </Select>

              {/* Branch Filter */}
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  <SelectItem value="83">สาขา 83</SelectItem>
                  <SelectItem value="85">สาขา 85</SelectItem>
                  <SelectItem value="901">HO</SelectItem>
                </SelectContent>
              </Select>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <>
                  <div className="h-6 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    {statusFilter !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        {getStatusLabel(statusFilter)}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-foreground"
                          onClick={() => setStatusFilter("all")}
                        />
                      </Badge>
                    )}
                    {branchFilter !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        {getBranchLabel(branchFilter)}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-foreground"
                          onClick={() => setBranchFilter("all")}
                        />
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-7 text-xs"
                    >
                      Clear all
                    </Button>
                  </div>
                </>
              )}

              {/* Total Count */}
              {pagination && (
                <>
                  <div className="h-6 w-px bg-border ml-auto" />
                  <span className="text-sm text-muted-foreground">
                    {pagination.total} jobs total
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* DataTable Card */}
        {/* <Card>
          <CardContent className="p-6"> */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Loading jobs...
                  </p>
                </div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">No jobs found</p>
                {hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters} size="sm">
                    Clear Filters
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => router.push("/audit-jobs/create")}
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Job
                  </Button>
                )}
              </div>
            ) : (
              <DataTable
                columns={createAuditListColumns(setDeleteJobId)}
                data={jobs}
                searchKey="jobNo"
                searchPlaceholder="Search by Job No, Branch, or Auditor..."
                Loading={isLoading}
                pagination={{
                  pageIndex: currentPage - 1,
                  pageSize: itemsPerPage,
                }}
                pageCount={pagination?.totalPages || 0}
                totalRows={pagination?.total || 0}
                onPageChange={(newPage) => setCurrentPage(newPage + 1)}
                onPageSizeChange={(newSize) => {
                  setItemsPerPage(newSize);
                  setCurrentPage(1);
                }}
              />
            )}
          {/* </CardContent>
        </Card> */}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteJobId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteJobId(null);
              setDeleteNote("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ยืนยันการลบ Audit Job</DialogTitle>
              <DialogDescription>
                การลบนี้ไม่สามารถย้อนกลับได้ กรุณาระบุหมายเหตุก่อนดำเนินการ
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              <Label htmlFor="delete-note">หมายเหตุ <span className="text-red-500">*</span></Label>
              <Textarea
                id="delete-note"
                placeholder="กรอกหมายเหตุการลบ..."
                value={deleteNote}
                onChange={(e) => setDeleteNote(e.target.value)}
                rows={3}
                disabled={isDeleting}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteJobId(null);
                  setDeleteNote("");
                }}
                disabled={isDeleting}
              >
                ยกเลิก
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting || !deleteNote.trim()}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังลบ...
                  </>
                ) : (
                  "ยืนยันการลบ"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}