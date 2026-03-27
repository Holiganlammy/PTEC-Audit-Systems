"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { dataConfig } from "@/config/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { DataTable } from "@/components/DataTable";
import { AuditListColumn } from "./DataTable/Column";
import { Badge } from "@/components/ui/badge";

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
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Fetch jobs from API
  useEffect(() => {
    fetchJobs();
  }, [currentPage, statusFilter, branchFilter, itemsPerPage]);

  const fetchJobs = async () => {
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
  };

  // Handle delete job
  const handleDelete = async () => {
    if (!deleteJobId) return;

    setIsDeleting(true);
    try {
      await client.delete(`/audit-jobs/${deleteJobId}`, {
        headers: dataConfig().headers,
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
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter("all");
    setBranchFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== "all" || branchFilter !== "all";

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
                columns={AuditListColumn}
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
        <AlertDialog
          open={deleteJobId !== null}
          onOpenChange={() => setDeleteJobId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this job? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}