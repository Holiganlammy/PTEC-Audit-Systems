// Version: 4.0.0 | Date: 2025-05-20 | Updated: Added filters - date range, district manager, branch manager, search
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { MonthPicker, formatMonthLabel } from "@/components/ui/month-picker";
import { Plus, Loader2, X, Trash2, Edit, FileText, CalendarIcon, Filter, Check, ChevronsUpDown } from "lucide-react";
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
import ExportListDropdown from "@/components/ExportListDropdown";
import { loadDraft, clearDraft, getDraftInfo } from "@/utils/audit-draft";
import { format, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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
  auditor?: { userCode: string; fullname: string; email: string };
  districtManager?: { userCode: string; fullname: string; email: string };
  branchManager?: { userCode: string; fullname: string; email: string };
  createdByUser?: { userCode: string; fullname: string; email: string };
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

interface User {
  UserID: string;
  UserCode: string;
  Fullname: string;
  Position: string;
  PositionCode: string;
  BranchID: number;
  BranchName: string;
  PersonalCode?: string | null;
  fristName?: string;
  lastName?: string;
}

interface FetchJobsParams {
  page: number;
  limit: number;
  status?: string;
  branchId?: string;
  districtManagerUserId?: string;
  branchManagerUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
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
  user: { role_id: number; is_admin: boolean };
}

export default function AuditJobsListPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<AuditList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [deleteJobId, setDeleteJobId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteNote, setDeleteNote] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const session = useSession();
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

  // ── Filter State ────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [districtManagerFilter, setDistrictManagerFilter] = useState<string>("all");
  const [branchManagerFilter, setBranchManagerFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [openBranchManager, setOpenBranchManager] = useState(false);
  const [bmSearch, setBmSearch] = useState("");
  const [openMonthFilter, setOpenMonthFilter] = useState(false);

  // ── Users for filter dropdowns ──────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [userPersonalCodes, setUserPersonalCodes] = useState<User[]>([]);

  // ── Draft State ─────────────────────────────────────────────────────────
  const [hasDraft, setHasDraft] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{
    branchName: string;
    auditDate: string;
    itemCount: number;
    timestamp: number;
  } | null>(null);
  const [showDeleteDraftDialog, setShowDeleteDraftDialog] = useState(false);

  // ── Bulk Delete State ───────────────────────────────────────────────────
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteNote, setBulkDeleteNote] = useState("");

  const canDelete = session.data?.user?.role_id === 1 || session.data?.user?.role_id === 2;
  const selectedJobIds = Object.keys(selectedRows).filter((key) => selectedRows[key]).map((key) => parseInt(key));
  const selectedCount = selectedJobIds.length;

  // ── URL Params Sync ──────────────────────────────────────────────────────
  const [isReadyToFetch, setIsReadyToFetch] = useState(false); // gate: รอให้อ่าน URL params ก่อนค่อย fetch
  const isFirstMount = useRef(true);

  // อ่านค่า filter จาก URL เมื่อ mount ครั้งแรก
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const search = params.get("search");
    const status = params.get("status");
    const page = params.get("page");
    const limit = params.get("limit");
    const df = params.get("dateFrom");
    const dt = params.get("dateTo");
    const dm = params.get("dm");
    const bm = params.get("bm");
    if (search) setSearchQuery(search);
    if (status) setStatusFilter(status);
    if (page) setCurrentPage(parseInt(page, 10) || 1);
    if (limit) setItemsPerPage(parseInt(limit, 10) || 10);
    if (df) setDateFrom(new Date(df));
    if (dt) setDateTo(new Date(dt));
    if (dm) setDistrictManagerFilter(dm);
    if (bm) setBranchManagerFilter(bm);
    setIsReadyToFetch(true); // อนุญาตให้ fetchJobs ทำงานได้หลังอ่าน URL params แล้ว
  }, []); 

  // เขียนค่า filter ลง URL เมื่อ state เปลี่ยน (ข้าม render แรก)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (currentPage > 1) params.set("page", String(currentPage));
    if (itemsPerPage !== 10) params.set("limit", String(itemsPerPage));
    if (dateFrom) params.set("dateFrom", format(dateFrom, "yyyy-MM-dd"));
    if (dateTo) params.set("dateTo", format(dateTo, "yyyy-MM-dd"));
    if (districtManagerFilter !== "all") params.set("dm", districtManagerFilter);
    if (branchManagerFilter !== "all") params.set("bm", branchManagerFilter);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [searchQuery, statusFilter, currentPage, itemsPerPage, dateFrom, dateTo, districtManagerFilter, branchManagerFilter]);

  // ── Computed: Filter users by role ──────────────────────────────────────
  const districtManagers = users.filter((u) =>
    ["TNM", "KTK", "PRH", "STJ", "TKA"].includes(u.UserCode)
  );
  const branchManagers = users.filter(
    (u) => u.UserCode.startsWith("PTEC")
  );

  // ── Fetch Users ─────────────────────────────────────────────────────────
  useEffect(() => {
    client
      .get("/users", { headers: dataConfig().headers })
      .then((res) => {
        if (Array.isArray(res.data)) setUsers(res.data);
      })
      .catch(() => {});
  }, []);

  // ── Fetch PM Codes (สำหรับแสดงชื่อ PM Code ในคอลัมน์ผู้จัดการสาขา) ──────────
  useEffect(() => {
    client
      .get("/users-personal-code", { headers: dataConfig().headers })
      .then((res) => {
        if (Array.isArray(res.data)) setUserPersonalCodes(res.data);
        else if (res.data?.success && Array.isArray(res.data?.data)) setUserPersonalCodes(res.data.data);
        else if (Array.isArray(res.data?.data)) setUserPersonalCodes(res.data.data);
      })
      .catch(() => {});
  }, []);

  // ── Draft Check ─────────────────────────────────────────────────────────
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setHasDraft(true);
      setDraftInfo(getDraftInfo());
    }
  }, []);

  // ── Active Filters Count ────────────────────────────────────────────────
  const activeFilterCount = [
    statusFilter !== "all",
    branchFilter !== "all",
    districtManagerFilter !== "all",
    branchManagerFilter !== "all",
    !!dateFrom,
    !!dateTo,
    !!searchQuery.trim(),
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  // ── Fetch Jobs ──────────────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    if (!isReadyToFetch) return; // รอให้อ่าน URL params ก่อน
    try {
      setIsLoading(true);
      const params: FetchJobsParams = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (statusFilter !== "all") params.status = statusFilter;
      if (branchFilter !== "all") params.branchId = branchFilter;
      if (districtManagerFilter !== "all") params.districtManagerUserId = districtManagerFilter;
      if (branchManagerFilter !== "all") params.branchManagerUserId = branchManagerFilter;
      if (dateFrom) params.dateFrom = format(dateFrom, "yyyy-MM-dd");
      if (dateTo) params.dateTo = format(dateTo, "yyyy-MM-dd");
      if (searchQuery.trim()) params.search = searchQuery.trim();

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
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error("ไม่สามารถโหลดข้อมูลได้", { description: errorMessage || "กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, branchFilter, districtManagerFilter, branchManagerFilter, dateFrom, dateTo, searchQuery, itemsPerPage, isReadyToFetch]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // ── Month Filter (ตัวช่วยตั้ง dateFrom/dateTo ทั้งเดือนในคลิกเดียว) ──────────
  const selectedMonth =
    dateFrom && dateTo &&
    isSameDay(dateFrom, startOfMonth(dateFrom)) &&
    isSameDay(dateTo, endOfMonth(dateFrom))
      ? dateFrom
      : undefined;

  const handleMonthSelect = (date: Date | undefined) => {
    if (!date) return;
    setDateFrom(startOfMonth(date));
    setDateTo(endOfMonth(date));
    setCurrentPage(1);
    setOpenMonthFilter(false);
  };

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteJobId) return;
    setIsDeleting(true);
    try {
      await client.delete(`/audit-jobs/${deleteJobId}`, { headers: dataConfig().headers, data: { delete_reason: deleteNote, deleted_by: session.data?.user.UserID } });
      toast.success("ลบงานสำเร็จ"); fetchJobs();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && "response" in error ? (error as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error("ไม่สามารถลบงานได้", { description: errorMessage || "กรุณาลองใหม่อีกครั้ง" });
    } finally { setIsDeleting(false); setDeleteJobId(null); setDeleteNote(""); }
  };

  const handleExportComplete = () => { setSelectedRows({}); };

  const handleBulkDelete = async () => {
    if (selectedJobIds.length === 0 || !bulkDeleteNote.trim()) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedJobIds.map((jobId) => client.delete(`/audit-jobs/${jobId}`, { headers: dataConfig().headers, data: { delete_reason: bulkDeleteNote, deleted_by: session.data?.user.UserID } })));
      toast.success(`ลบงานสำเร็จ ${selectedJobIds.length} รายการ`); setSelectedRows({}); fetchJobs();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && "response" in error ? (error as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error("ไม่สามารถลบงานบางรายการได้", { description: errorMessage || "กรุณาลองใหม่อีกครั้ง" });
    } finally { setIsBulkDeleting(false); setShowBulkDeleteDialog(false); setBulkDeleteNote(""); }
  };

  const handleDeleteDraft = () => { clearDraft(); setHasDraft(false); setDraftInfo(null); setShowDeleteDraftDialog(false); toast.success("ลบ Draft สำเร็จ"); };

  // ── Stable DataTable callbacks (useCallback prevents new references on every render) ─
  const handlePageChange = useCallback((newPage: number) => { setCurrentPage(newPage + 1); }, []);
  const handlePageSizeChange = useCallback((newSize: number) => { setItemsPerPage(newSize); setCurrentPage(1); }, []);
  const handleSearchChange = useCallback((value: string) => { setSearchQuery(value); setCurrentPage(1); }, []);

  const clearFilters = () => {
    setStatusFilter("all");
    setBranchFilter("all");
    setDistrictManagerFilter("all");
    setBranchManagerFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery("");
    setCurrentPage(1);
  };

  const getFilterLabel = (type: string, value: string): string => {
    if (type === "status") {
      const labels: Record<string, string> = { "1": "อยู่ระหว่างดำเนินการ", "2": "ดำเนินการเสร็จสิ้น" };
      return labels[value] || value;
    }
    if (type === "branch") {
      const labels: Record<string, string> = { "83": "สาขา 83", "85": "สาขา 85", "901": "HO" };
      return labels[value] || `สาขา ${value}`;
    }
    if (type === "dm") {
      const user = districtManagers.find((u) => u.UserID === value);
      return user ? user.Fullname : value;
    }
    if (type === "bm") {
      const user = branchManagers.find((u) => u.UserID === value);
      return user ? user.Fullname : value;
    }
    return value;
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="py-2 sm:py-4">
      <div className="container mx-auto px-4 max-w-[1500px]">
        {/* Header */}
        <div className="mb-3">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">Audit Jobs Management</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">จัดการและติดตามงานตรวจสอบทั้งหมดของระบบ</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3 sm:flex-shrink-0">
                <ExportListDropdown data={jobs} selectedRows={selectedRows} onExportComplete={handleExportComplete} disabled={isLoading} />
                {canDelete && (
                  <Button variant="destructive" size="sm" className="sm:size-auto sm:h-10" disabled={selectedCount === 0 || isLoading} onClick={() => setShowBulkDeleteDialog(true)}>
                    <Trash2 className="mr-1.5 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5" />
                    <span>ลบที่เลือก{selectedCount > 0 && ` (${selectedCount})`}</span>
                  </Button>
                )}
                {canDelete && (
                  <Button onClick={() => router.push("/audit/create")} size="sm" className="sm:size-auto sm:h-10">
                    <Plus className="mr-1.5 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5" />
                    <span>Create New Job</span>
                  </Button>
                )}
              </div>
            </div>

            {/* ── Filter Bar ────────────────────────────────────────────── */}
            <div className="space-y-2">
              {/* Row 1: Quick Filters + Advanced Toggle */}
              <div className="flex items-center gap-2 flex-wrap sm:gap-3">
                {/* Status */}
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">สถานะ: ทั้งหมด</SelectItem>
                    <SelectItem value="1">อยู่ระหว่างดำเนินการ</SelectItem>
                    <SelectItem value="2">ดำเนินการเสร็จสิ้น</SelectItem>
                  </SelectContent>
                </Select>


                {/* Advanced Filters Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={cn("gap-2", showAdvancedFilters && "bg-accent")}
                >
                  <Filter className="h-4 w-4" />
                  ตัวกรองเพิ่มเติม
                  {activeFilterCount > 2 && (
                    <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFilterCount - [statusFilter !== "all", branchFilter !== "all", !!searchQuery.trim()].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>

                {/* Active Filter Badges + Clear */}
                {hasActiveFilters && (
                  <>
                    <div className="h-6 w-px bg-border" />
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusFilter !== "all" && (
                        <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/15 hover:text-destructive transition-colors" onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}>
                          {getFilterLabel("status", statusFilter)}
                          <X className="h-3 w-3" />
                        </Badge>
                      )}
                      {branchFilter !== "all" && (
                        <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/15 hover:text-destructive transition-colors" onClick={() => { setBranchFilter("all"); setCurrentPage(1); }}>
                          {getFilterLabel("branch", branchFilter)}
                          <X className="h-3 w-3" />
                        </Badge>
                      )}
                      {districtManagerFilter !== "all" && (
                        <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/15 hover:text-destructive transition-colors" onClick={() => { setDistrictManagerFilter("all"); setCurrentPage(1); }}>
                          ผจก.เขต: {getFilterLabel("dm", districtManagerFilter)}
                          <X className="h-3 w-3" />
                        </Badge>
                      )}
                      {branchManagerFilter !== "all" && (
                        <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/15 hover:text-destructive transition-colors" onClick={() => { setBranchManagerFilter("all"); setCurrentPage(1); }}>
                          ผจก.สาขา: {getFilterLabel("bm", branchManagerFilter)}
                          <X className="h-3 w-3" />
                        </Badge>
                      )}
                      {dateFrom && (
                        <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/15 hover:text-destructive transition-colors" onClick={() => { setDateFrom(undefined); setCurrentPage(1); }}>
                          จาก: {format(dateFrom, "dd/MM/yy")}
                          <X className="h-3 w-3" />
                        </Badge>
                      )}
                      {dateTo && (
                        <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/15 hover:text-destructive transition-colors" onClick={() => { setDateTo(undefined); setCurrentPage(1); }}>
                          ถึง: {format(dateTo, "dd/MM/yy")}
                          <X className="h-3 w-3" />
                        </Badge>
                      )}
                      {searchQuery.trim() && (
                        <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/15 hover:text-destructive transition-colors" onClick={() => { setSearchQuery(""); setCurrentPage(1); }}>
                          ค้นหา: {searchQuery}
                          <X className="h-3 w-3" />
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">Clear all</Button>
                    </div>
                  </>
                )}

                {pagination && (
                  <>
                    <div className="h-6 w-px bg-border ml-auto" />
                    <span className="text-xs sm:text-sm text-muted-foreground">{pagination.total} jobs total</span>
                  </>
                )}
              </div>

              {/* Row 2: Advanced Filters (Collapsible) */}
              {showAdvancedFilters && (
                <div className="flex flex-col gap-3 p-3 rounded-lg border bg-muted/30 sm:flex-row sm:flex-wrap sm:items-end sm:p-4">
                  {/* Month — เลือกทั้งเดือนในคลิกเดียว (ตั้ง dateFrom/dateTo ให้อัตโนมัติ) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">เดือน</Label>
                    <Popover open={openMonthFilter} onOpenChange={setOpenMonthFilter}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full sm:w-[160px] justify-start text-left font-normal", !selectedMonth && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedMonth ? formatMonthLabel(selectedMonth) : "เลือกเดือน"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <MonthPicker selected={selectedMonth} onSelect={handleMonthSelect} />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Date From */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">วันที่เริ่มต้น</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full sm:w-[160px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: th }) : "เลือก"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setCurrentPage(1); }} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Date To */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">วันที่สิ้นสุด</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full sm:w-[160px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: th }) : "เลือก"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setCurrentPage(1); }} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* District Manager */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">ผู้จัดการเขต</Label>
                    <Select value={districtManagerFilter} onValueChange={(v) => { setDistrictManagerFilter(v); setCurrentPage(1); }}>
                      <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        {districtManagers.map((u) => (
                          <SelectItem key={u.UserID} value={u.UserID}>{u.Fullname}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Branch Manager */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">ผู้จัดการสาขา</Label>
                    <Popover open={openBranchManager} onOpenChange={setOpenBranchManager}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openBranchManager}
                          className="w-full sm:w-[220px] justify-between font-normal"
                        >
                          <span className="truncate">
                            {branchManagerFilter === "all"
                              ? "ทั้งหมด"
                              : (branchManagers.find((u) => u.UserID === branchManagerFilter)?.Fullname ?? branchManagerFilter)
                            }
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="ค้นหาผู้จัดการสาขา..."
                            value={bmSearch}
                            onValueChange={setBmSearch}
                          />
                          <CommandList>
                            <CommandEmpty>ไม่พบข้อมูล</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="all"
                                onSelect={() => { setBranchManagerFilter("all"); setCurrentPage(1); setOpenBranchManager(false); setBmSearch(""); }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", branchManagerFilter === "all" ? "opacity-100" : "opacity-0")} />
                                ทั้งหมด
                              </CommandItem>
                              {branchManagers
                                .filter((u) => {
                                  if (!bmSearch) return true;
                                  const s = bmSearch.toLowerCase();
                                  return (
                                    u.Fullname?.toLowerCase().includes(s) ||
                                    u.UserCode?.toLowerCase().includes(s)
                                  );
                                })
                                .map((u) => (
                                  <CommandItem
                                    key={u.UserID}
                                    value={u.UserID}
                                    onSelect={() => { setBranchManagerFilter(u.UserID); setCurrentPage(1); setOpenBranchManager(false); setBmSearch(""); }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", branchManagerFilter === u.UserID ? "opacity-100" : "opacity-0")} />
                                    {u.UserCode}
                                  </CommandItem>
                                ))
                              }
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Draft Card */}
        {hasDraft && draftInfo && (
          <Card className="mb-6 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg shrink-0"><FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" /></div>
                  <div>
                    <CardTitle className="text-base flex flex-wrap items-center gap-2 sm:text-lg">
                      Draft - กำลังสร้างงานตรวจสอบ
                      <Badge variant="outline" className="text-orange-600 border-orange-600">Draft</Badge>
                    </CardTitle>
                    <CardDescription>บันทึกเมื่อ: {format(new Date(draftInfo.timestamp), "dd/MM/yyyy HH:mm", { locale: th })}</CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => router.push("/audit/create")}><Edit className="mr-2 h-4 w-4" />แก้ไข Header</Button>
                  <Button variant="default" size="sm" onClick={() => router.push("/audit/create/add_items?mode=draft")}>เพิ่มรายการต่อ</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteDraftDialog(true)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3 sm:gap-4">
                <div><p className="text-muted-foreground">สาขา</p><p className="font-medium">{draftInfo.branchName}</p></div>
                <div><p className="text-muted-foreground">วันที่ตรวจ</p><p className="font-medium">{format(new Date(draftInfo.auditDate), "dd/MM/yyyy", { locale: th })}</p></div>
                <div><p className="text-muted-foreground">รายการตรวจสอบ</p><p className="font-medium">{draftInfo.itemCount} รายการ</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* DataTable */}
        {pagination === null && isLoading ? (
          /* First load — ยังไม่มีข้อมูลเลย แสดง full-page spinner */
          <div className="flex items-center justify-center py-16">
            <div className="text-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" /><p className="text-sm text-muted-foreground">Loading jobs...</p></div>
          </div>
        ) : (
          /* หลัง load ครั้งแรก — DataTable ค้างไว้เสมอ ใช้ skeleton/overlay ใน DataTable แทน */
          <>
            <DataTable
              columns={createAuditListColumns(setDeleteJobId, userPersonalCodes)}
              data={jobs}
              searchKey="jobNo"
              searchPlaceholder="ค้นหา Job No, สาขา..."
              Loading={isLoading}
              pagination={{ pageIndex: currentPage - 1, pageSize: itemsPerPage }}
              pageCount={pagination?.totalPages || 0}
              totalRows={pagination?.total || 0}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              rowSelection={selectedRows}
              onRowSelectionChange={setSelectedRows}
              onSearchChange={handleSearchChange}
              searchValue={searchQuery}
              scrollable={false}
            />
            {!isLoading && jobs.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No jobs found</p>
                {hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters} size="sm">Clear Filters</Button>
                ) : (
                  <Button variant="outline" onClick={() => router.push("/audit/create")} size="sm"><Plus className="mr-2 h-4 w-4" />Create First Job</Button>
                )}
              </div>
            )}
          </>
        )}

        {/* Delete Draft Confirmation */}
        <AlertDialog
          open={showDeleteDraftDialog}
          onOpenChange={setShowDeleteDraftDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันการลบ Draft</AlertDialogTitle>
              <AlertDialogDescription>
                คุณต้องการลบ Draft นี้หรือไม่?
                <br />
                ข้อมูลทั้งหมดที่บันทึกไว้จะถูกลบและไม่สามารถกู้คืนได้
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteDraft}
                className="bg-destructive hover:bg-destructive/90"
              >
                ลบ Draft
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog
          open={showBulkDeleteDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowBulkDeleteDialog(false);
              setBulkDeleteNote("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ยืนยันการลบ {selectedCount} รายการ</DialogTitle>
              <DialogDescription>
                การลบนี้ไม่สามารถย้อนกลับได้ กรุณาระบุหมายเหตุก่อนดำเนินการ
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              <Label htmlFor="bulk-delete-note">
                หมายเหตุ <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="bulk-delete-note"
                placeholder="กรอกหมายเหตุการลบ..."
                value={bulkDeleteNote}
                onChange={(e) => setBulkDeleteNote(e.target.value)}
                rows={3}
                disabled={isBulkDeleting}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkDeleteDialog(false);
                  setBulkDeleteNote("");
                }}
                disabled={isBulkDeleting}
              >
                ยกเลิก
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting || !bulkDeleteNote.trim()}
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังลบ...
                  </>
                ) : (
                  `ยืนยันลบ ${selectedCount} รายการ`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              <Label htmlFor="delete-note">
                หมายเหตุ <span className="text-red-500">*</span>
              </Label>
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