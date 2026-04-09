"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { dataConfig } from "@/config/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  CalendarIcon,
  Upload,
  ArrowLeft,
  Loader2,
  Check,
  ChevronsUpDown,
  Lock,
  ShieldCheck,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, FieldErrors } from "react-hook-form";
import * as z from "zod";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import DataTableItemList from "./components/DataTableItemList/DataTable";
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"



const formSchema = z.object({
  Branch: z.string().nonempty("กรุณาเลือกสาขา"),
  Firstname: z.string().optional(),
  Lastname: z.string().optional(),
  Date: z.date({ error: "กรุณาเลือกวันที่" }),
  PMCode: z.string().min(1, "กรุณาเลือก PM Code"),
  Address: z.string().optional(),
  Auditor: z.string().nonempty("กรุณาเลือกผู้ตรวจสอบ"),
  DistrictManager: z.string().nonempty("กรุณาเลือกผู้จัดการเขต"),
  BranchManager: z.string().optional(),
  AdditionalNotes: z.string().optional(),
  Type: z.enum(["visit", "online"]),
});

export default function EditAuditJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobNo = searchParams.get("jobNo") ?? "";
  const { data: session } = useSession();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);

  // Popover states
  const [openBranch, setOpenBranch] = useState(false);
  const [openAuditor, setOpenAuditor] = useState(false);
  const [openDistrictManager, setOpenDistrictManager] = useState(false);
  const [openPMCode, setOpenPMCode] = useState(false);

  // Data from API
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [jobData, setJobData] = useState<AuditJobData | null>(null);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    branchId: "",
    branchName: "",
    address: "",
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      Branch: "",
      Firstname: "",
      Lastname: "",
      Date: undefined,
      PMCode: "",
      Address: "",
      Auditor: "",
      DistrictManager: "",
      BranchManager: "",
      AdditionalNotes: "",
      Type: "visit",
    },
  });

  const [watchFirstname, watchLastname] = form.watch(["Firstname", "Lastname"]);

  // Fetch existing job data
  const fetchJobData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      setLoadError(null);
        
        // console.log('🔍 Fetching audit job with jobNo:', jobNo); // jobNo ในที่นี้คือ jobNo จาก URL
        
        // เรียก API ด้วย query parameter
        const response = await client.get('/audit-jobs/detail', {
          params: { jobNo: jobNo },
          headers: dataConfig().headers,
        });


        // ดึง data ออกมา
        const jobData = response.data.data;
        

        setJobData(jobData);

        // Set form values
        if (jobData.branchId) {
          form.setValue("Branch", jobData.branchId.toString());
        }
        
        if (jobData.auditDate) {
          form.setValue("Date", new Date(jobData.auditDate));
        }
        
        form.setValue("PMCode", jobData.pmCode || "");
        form.setValue("Address", jobData.address || "");

        // ใช้ข้อมูล branchManager จาก detail API โดยตรง
        form.setValue("Firstname", jobData.branchManager?.firstName || "");
        form.setValue("Lastname", jobData.branchManager?.lastName || "");

        // ใช้ userId จาก detail API โดยตรง ไม่ต้อง lookup จาก users list
        if (jobData.auditor?.userId) {
          form.setValue("Auditor", jobData.auditor.userId.toString());
        }

        if (jobData.districtManager?.userId) {
          form.setValue("DistrictManager", jobData.districtManager.userId.toString());
        }

        if (jobData.branchManager?.userId) {
          form.setValue("BranchManager", jobData.branchManager.userId.toString());
        }
        
        form.setValue("AdditionalNotes", jobData.additionalNotes || "");
        form.setValue("Type", jobData.positionType === "online" ? "online" : "visit");

        // Set formData
        setFormData({
          branchId: jobData.branchId?.toString() || "",
          branchName: jobData.branchName || "",
          address: jobData.address || "",
        })

      } catch (error: unknown) {
        console.error("Error fetching job data:", error);
        
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { data?: { message?: string; code?: number } } };
          console.error('Response error:', axiosError.response?.data);
        }
        
        const errorMessage =
          error instanceof Error && "response" in error
            ? (error as { response?: { data?: { message?: string } } })
                .response?.data?.message
            : undefined;
            
        setLoadError(errorMessage || "ไม่สามารถโหลดข้อมูลงานได้");
        
        toast.error("ไม่สามารถโหลดข้อมูลงานได้", {
          description: errorMessage || "กรุณาลองใหม่อีกครั้ง",
        });
      } finally {
        setIsLoadingData(false);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobNo, form, users]);

  useEffect(() => {
    // เรียก fetchJobData หลังจากโหลด users เสร็จแล้ว
    if (jobNo && !isLoadingUsers && users.length > 0) {
      fetchJobData();
    }
  }, [jobNo, fetchJobData, isLoadingUsers, users.length]);

   useEffect(() => {
    const fetchAuditItems = async () => {
      if (!jobData?.jobId) return; // รอให้ jobData โหลดเสร็จก่อน
      
      try {
        setIsLoadingItems(true);
        
        // console.log('Fetching audit items for job:', jobData.jobId);
        
        const response = await client.get(`/audit-items/job/${jobData.jobId}`, {
          headers: dataConfig().headers,
        });
 
        if (response.data.success) {
          // Transform data to match frontend structure
          const items = response.data.data.map((item: AuditItemData) => ({
            item_id: item.itemId,
            job_id: item.jobId,
            category_item_id: item.categoryItemId,
            category_name: item.categoryItem?.categoryName,
            inspection_date: item.inspectionDate,
            item_status: item.itemStatus,
            item_status_edit: item.itemStatusEdit,
            remarks: item.remarks || "",
            
            // Comments from different sources (transformed to Comment shape)
            note_1: (item.auditDetails || []).map((c: auditDetails) => ({
              id: c.auditDetailId,
              itemId: c.itemId,
              userId: c.createdBy,
              author: c.OwnerCommentUser?.fullname || "Unknown",
              authorPosition: c.OwnerCommentUser?.position,
              text: c.note,
              approverStatus: c.approverStatus ?? null,
              approverBy: c.approverBy ?? undefined,
              approverName: c.approverByUser?.fullname,
              approverUsername: c.approverByUser?.userCode,
              approverPosition: c.approverByUser?.position,
              approverDate: c.approverDate ?? undefined,
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
            })),
            note_2: (item.amDetails || []).map((c: amDetails) => ({
              id: c.amDetailId,
              itemId: c.itemId,
              userId: c.createdBy,
              author: c.OwnerCommentUser?.fullname || "Unknown",
              authorPosition: c.OwnerCommentUser?.position,
              text: c.note,
              approverStatus: c.approverStatus ?? null,
              approverBy: c.approverBy ?? undefined,
              approverName: c.approverByUser?.fullname,
              approverUsername: c.approverByUser?.userCode,
              approverPosition: c.approverByUser?.position,
              approverDate: c.approverDate ?? undefined,
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
            })),
            note_3: (item.otherDetails || []).map((c: OtherDetails) => ({
              id: c.otherDetailId,
              itemId: c.itemId,
              userId: c.createdBy,
              author: c.OwnerCommentUser?.fullname || "Unknown",
              authorPosition: c.OwnerCommentUser?.position,
              text: c.note,
              approverStatus: c.approverStatus ?? null,
              approverBy: c.approverBy ?? undefined,
              approverName: c.approverByUser?.fullname,
              approverUsername: c.approverByUser?.userCode,
              approverPosition: c.approverByUser?.position,
              approverDate: c.approverDate ?? undefined,
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
            })),
            
            amChecklistStatus: item.amChecklistStatus ?? null,
            amChecklistDetail: item.amChecklistDetail,
            amChecklistBy: item.amChecklistBy,
            amChecklistAt: item.amChecklistAt,
            created_at: item.createdAt,
            updated_at: item.updatedAt,
            active: item.active,
          }));
 
          setAuditItems(items);
        }
      } catch (error) {
        console.error("Error fetching audit items:", error);
        toast.error("ไม่สามารถโหลดรายการตรวจสอบได้");
      } finally {
        setIsLoadingItems(false);
      }
    };
 
    fetchAuditItems();
  }, [jobData?.jobId]);

    const handleItemsChange = async () => {
    // Refetch items
    if (!jobData?.jobId) return;
    
    try {
      const response = await client.get(`/audit-items/job/${jobData.jobId}`, {
        headers: dataConfig().headers,
      });
 
      if (response.data.success) {
        const items = response.data.data.map((item: AuditItemData) => ({
          item_id: item.itemId,
          job_id: item.jobId,
          category_item_id: item.categoryItemId,
          category_name: item.categoryItem?.categoryName,
          inspection_date: item.inspectionDate,
          item_status: item.itemStatus,
          item_status_edit: item.itemStatusEdit,
          remarks: item.remarks || "",
          note_1: (item.auditDetails || []).map((c: auditDetails) => ({
            id: c.auditDetailId,
            itemId: c.itemId,
            userId: c.createdBy,
            author: c.OwnerCommentUser?.fullname || "Unknown",
            authorPosition: c.OwnerCommentUser?.position,
            text: c.note,
            approverStatus: c.approverStatus ?? null,
            approverBy: c.approverBy ?? undefined,
            approverName: c.approverByUser?.fullname,
            approverUsername: c.approverByUser?.userCode,
            approverPosition: c.approverByUser?.position,
            approverDate: c.approverDate ?? undefined,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          })),
          note_2: (item.amDetails || []).map((c: amDetails) => ({
            id: c.amDetailId,
            itemId: c.itemId,
            userId: c.createdBy,
            author: c.OwnerCommentUser?.fullname || "Unknown",
            authorPosition: c.OwnerCommentUser?.position,
            text: c.note,
            approverStatus: c.approverStatus ?? null,
            approverBy: c.approverBy ?? undefined,
            approverName: c.approverByUser?.fullname,
            approverUsername: c.approverByUser?.userCode,
            approverPosition: c.approverByUser?.position,
            approverDate: c.approverDate ?? undefined,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          })),
          note_3: (item.otherDetails || []).map((c: OtherDetails) => ({
            id: c.otherDetailId,
            itemId: c.itemId,
            userId: c.createdBy,
            author: c.OwnerCommentUser?.fullname || "Unknown",
            authorPosition: c.OwnerCommentUser?.position,
            text: c.note,
            approverStatus: c.approverStatus ?? null,
            approverBy: c.approverBy ?? undefined,
            approverName: c.approverByUser?.fullname,
            approverUsername: c.approverByUser?.userCode,
            approverPosition: c.approverByUser?.position,
            approverDate: c.approverDate ?? undefined,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          })),
          amChecklistStatus: item.amChecklistStatus ?? null,
          amChecklistDetail: item.amChecklistDetail,
          amChecklistBy: item.amChecklistBy,
          amChecklistAt: item.amChecklistAt,
          created_at: item.createdAt,
          updated_at: item.updatedAt,
          active: item.active,
        }));
        console.log('Refreshed audit items:', items);
        setAuditItems(items);
      }
    } catch (error) {
      console.error("Error refreshing items:", error);
    }
  };

  // Fetch branches from API
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setIsLoadingBranches(true);
        const response = await client.get("/branch", {
          headers: dataConfig().headers,
        });

        if (response.data.success) {
          setBranches(response.data.data);
        }
      } catch (error: unknown) {
        console.error("Error fetching branches:", error);
        const errorMessage =
          error instanceof Error && "response" in error
            ? (error as { response?: { data?: { message?: string } } })
                .response?.data?.message
            : undefined;
        toast.error("ไม่สามารถโหลดข้อมูลสาขาได้", {
          description: errorMessage || "กรุณาลองใหม่อีกครั้ง",
        });
      } finally {
        setIsLoadingBranches(false);
      }
    };

    fetchBranches();
  }, []);

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const response = await client.get("/users", {
          headers: dataConfig().headers,
        });

        if (Array.isArray(response.data)) {
          setUsers(response.data);
        }
      } catch (error: unknown) {
        console.error("Error fetching users:", error);
        toast.error("ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter users by position/role
  const auditors = users.filter((u) => ["KKJ", "PWW", "WSR"].includes(u.UserCode));

  const districtManagers = users.filter((u) =>
    ["TNM", "KTK", "PRH", "STJ", "TKA"].includes(u.UserCode)
  );

  const branchManagers = users.filter(
    (u) =>
      u.Position?.toLowerCase().includes("ผู้จัดการสาขา") ||
      u.PositionCode === "BM"
  );

  const { isDirty } = form.formState;

  const isFormLocked = jobData?.status === 2;

  const canConfirm =
    !isLoadingItems &&
    !isDirty &&
    auditItems.length > 0 &&
    auditItems.every((item) => item.item_status_edit === 4);

  // Handle branch selection
  const handleBranchChange = (value: string) => {
    const branch = branches.find((b) => b.branchid.toString() === value);
    if (branch) {
      form.setValue("Branch", value);
      form.setValue("Address", branch.FullAddress || "");
      setFormData({
        ...formData,
        branchId: value,
        branchName: `${branch.code || branch.branchid} / ${branch.name}`,
        address: branch.FullAddress || "",
      });
    }
    setOpenBranch(false);
  };

  // Get display text for selected values
  const getSelectedBranchText = () => {
    const branchId = form.watch("Branch");
    if (!branchId) return "เลือกสาขา";
    const branch = branches.find((b) => b.branchid.toString() === branchId);
    return branch ? `${branch.name}` : "เลือกสาขา";
  };

  const getSelectedUserText = (
    fieldValue: string,
    usersList: User[],
    placeholder: string
  ) => {
    if (!fieldValue) return placeholder;
    const user = usersList.find((u) => u.UserID === fieldValue);
    return user ? `${user.Fullname}` : placeholder;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      const selectedBranch = branches.find((b) => b.branchid.toString() === values.Branch);
      const branchManager = branchManagers.find((u) => u.BranchID === selectedBranch?.branchid);

      const payload = {
        branchId: parseInt(values.Branch),
        branchName: formData.branchName,
        auditDate: format(values.Date, "yyyy-MM-dd"),
        address: values.Address || "",
        pmCode: values.PMCode || "",
        auditorUserId: parseInt(values.Auditor),
        districtManagerUserId: parseInt(values.DistrictManager),
        branchManagerUserId: parseInt(branchManager?.UserID || "0"),
        additionalNotes: values.AdditionalNotes || "",
        positionType: values.Type,
        updatedBy: session?.user?.UserID,
      };

      await client.put(`/audit-jobs/${jobData?.jobId}`, payload, {
        headers: dataConfig().headers,
      });

      if (excelFile) {
        console.log("File to upload:", excelFile.name);
      }

      toast.success("อัพเดทงานสำเร็จ", {
        description: "ข้อมูลงานถูกอัพเดทเรียบร้อยแล้ว",
      });

      await fetchJobData();

    } catch (error: unknown) {
      console.error("Error updating audit job:", error);
      const errorMessage =
        error instanceof Error && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      toast.error("เกิดข้อผิดพลาด", {
        description: errorMessage || "ไม่สามารถอัพเดทงานได้",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setExcelFile(e.target.files[0]);
    }
  };

  const handleFormError = (errors: FieldErrors<z.infer<typeof formSchema>>) => {
    console.error("Form validation errors:", errors);
    const firstError = Object.values(errors)[0];
    if (firstError?.message) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน", {
        description: firstError.message,
      });
    }
  };

  const handleConfirm = async () => {
    if (!jobData?.jobId) return;
    setIsConfirming(true);
    try {
      await client.patch(`/audit-jobs/${jobData.jobId}/confirm`, {
        confirmedBy: session?.user?.UserID || 0,
      }, { headers: dataConfig().headers });

      setJobData((prev) => prev ? { ...prev, status: 2 } : prev);
      toast.success("ยืนยันเอกสารสำเร็จ", {
        description: "เอกสารถูก lock เรียบร้อยแล้ว",
      });
    } catch (error) {
      console.error("Error confirming audit job:", error);
      toast.error("เกิดข้อผิดพลาด", {
        description: "ไม่สามารถยืนยันเอกสารได้",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // Show loading state
  // if (isLoadingData) {
  //   return (
  //     <div className="min-h-screen py-8">
  //       <div className="container mx-auto px-4 max-w-7xl">
  //         <div className="flex items-center justify-center py-32">
  //           <div className="text-center">
  //             <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto mb-4" />
  //             <h2 className="text-xl font-semibold mb-2">Loading Job Data...</h2>
  //             <p className="text-sm text-muted-foreground">
  //               กำลังโหลดข้อมูลงาน กรุณารอสักครู่
  //             </p>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  // Show error state
  // if (loadError || !jobData) {
  //   return (
  //     <div className="min-h-screen py-8">
  //       <div className="container mx-auto px-4 max-w-7xl">
  //         <Button
  //           variant="ghost"
  //           onClick={() => router.back()}
  //           className="mb-6"
  //         >
  //           <ArrowLeft className="mr-2 h-4 w-4" />
  //           ย้อนกลับ
  //         </Button>
  //         <Alert variant="destructive">
  //           <AlertCircle className="h-4 w-4" />
  //           <AlertTitle>Error</AlertTitle>
  //           <AlertDescription>
  //             {loadError || "ไม่พบข้อมูลงาน"}
  //           </AlertDescription>
  //         </Alert>
  //         <div className="mt-4">
  //           <Button onClick={() => router.push("/audit-jobs")}>
  //             กลับไปหน้ารายการ
  //           </Button>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }
  return (
    <div className="mb-10">
      <div className="max-w-[1400px] mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">Edit Audit Job</h1>
                {!isLoadingData && jobData?.status === 2 && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-700 border-green-300">
                    <Lock className="h-3 w-3" />
                    Confirmed / Locked
                  </Badge>
                )}
              </div>
              {isLoadingData ? (
                <Skeleton className="h-4 w-48 mt-2" />
              ) : (
                <p className="text-muted-foreground mt-2">
                  แก้ไขข้อมูลงานตรวจสอบ: {jobData?.jobNo}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.back()}>
                Back
              </Button>
              {jobData?.status !== 2 && (
                <>
                  <Button
                    variant="outline"
                    onClick={form.handleSubmit(onSubmit, handleFormError)}
                    disabled={isSubmitting || isLoadingData}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังอัพเดท...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  {!isLoadingData && <AlertDialog>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={!canConfirm ? 0 : undefined}>
                            <AlertDialogTrigger asChild>
                              <Button
                                disabled={isConfirming || !canConfirm}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <ShieldCheck className=" h-4 w-4" />
                                Confirm
                              </Button>
                            </AlertDialogTrigger>
                          </span>
                        </TooltipTrigger>
                        {!canConfirm && (
                          <TooltipContent>
                            <p>
                              {isDirty
                                ? "กรุณา Save Changes ก่อนยืนยันเอกสาร"
                                : "รายการตรวจสอบทั้งหมดต้องมีสถานะ \"ปิดเคส\" ก่อนยืนยันเอกสาร"}
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันเอกสาร</AlertDialogTitle>
                        <AlertDialogDescription>
                          การยืนยันเอกสารจะ <strong>lock</strong> เอกสารนี้ทั้งหมด
                          และจะไม่สามารถแก้ไขข้อมูลใดๆ ได้อีก
                          คุณต้องการดำเนินการต่อหรือไม่?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleConfirm}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isConfirming ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                          ยืนยัน
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>}
                </>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit, handleFormError)} className="space-y-6">
          <fieldset disabled={isFormLocked} className="contents">
          {/* Main Card with all fields */}
          <Card>
            <CardContent className="pt-6">
              <FieldSet>
                <FieldLegend>แก้ไข Audit Report</FieldLegend>
                <FieldDescription>
                  แก้ไขข้อมูลงานตรวจสอบตามต้องการ
                </FieldDescription>

                <div className="space-y-6 mt-6">
                  {/* Job No (Read Only) */}
                  <div className="flex justify-between items-start">
                    <Field className="w-[30%]">
                      <FieldLabel>Job No</FieldLabel>
                      {isLoadingData ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <Input
                          value={jobData?.jobNo || ""}
                          disabled
                          className="bg-muted"
                        />
                      )}
                      <FieldDescription>
                        หมายเลขงานไม่สามารถแก้ไขได้
                      </FieldDescription>
                    </Field>
                    <Controller
                      name="Type"
                      control={form.control}
                      render={({ field }) => (
                        <Field className="mx-2 w-auto text-center">
                          <FieldLabel className="mb-2 justify-center">ประเภทการตรวจ</FieldLabel>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex gap-6 mt-1"
                            disabled
                          >
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value="visit" id="type-visit" />
                              <Label htmlFor="type-visit" className="cursor-pointer">Visit</Label>
                            </div>
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value="online" id="type-online" />
                              <Label htmlFor="type-online" className="cursor-pointer">Online</Label>
                            </div>
                          </RadioGroup>
                        </Field>
                      )}
                    />
                  </div>

                  {/* Row 1: Branch, Date, PM Code */}
                  {isLoadingData ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Branch */}
                    <Controller
                      name="Branch"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel>
                            Branch <span className="text-red-500">*</span>
                          </FieldLabel>
                          {isLoadingBranches ? (
                            <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <Popover open={openBranch} onOpenChange={setOpenBranch}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openBranch}
                                  className={cn(
                                    "w-full justify-between",
                                    fieldState.error && "border-red-500"
                                  )}
                                >
                                  {getSelectedBranchText()}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="ค้นหาสาขา..." />
                                  <CommandList>
                                    <CommandEmpty>ไม่พบข้อมูลสาขา</CommandEmpty>
                                    <CommandGroup>
                                      {branches.map((branch) => (
                                        <CommandItem
                                          key={branch.branchid}
                                          value={`${branch.code || branch.branchid} ${branch.name}`}
                                          onSelect={() =>
                                            handleBranchChange(
                                              branch.branchid.toString()
                                            )
                                          }
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              field.value ===
                                                branch.branchid.toString()
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />
                                          {branch.name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )}
                          {fieldState.error && (
                            <p className="text-sm text-red-500 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </Field>
                      )}
                    />

                     {/* PM Code */}
                    <Controller
                      name="PMCode"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel>
                            PM Code <span className="text-red-500">*</span>
                          </FieldLabel>
                            <Popover open={openPMCode} onOpenChange={setOpenPMCode}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openPMCode}
                                  className={cn("w-full justify-between", fieldState.error && "border-red-500")}
                                >
                                  {field.value
                                    ? (() => {
                                        const name = [watchFirstname, watchLastname].filter(Boolean).join(" ");
                                        return name ? `${field.value} - ${name}` : field.value;
                                      })()
                                    : "เลือก PM Code"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="ค้นหา PM Code..." />
                                  <CommandList>
                                    <CommandEmpty>ไม่พบข้อมูล</CommandEmpty>
                                    <CommandGroup>
                                      {users
                                        .filter((u) => u.PersonalCode)
                                        .sort((a, b) => {
                                          if (a.PersonalCode === field.value && a.BranchID?.toString() === formData.branchId && a.Actived == true) return -1;
                                          if (b.PersonalCode === field.value && b.BranchID?.toString() === formData.branchId && b.Actived == true) return 1;
                                          return 0;
                                        })
                                        .map((u) => (
                                          <CommandItem
                                            key={u.UserID}
                                            value={`${u.PersonalCode} ${u.fristName} ${u.lastName} ${u.BranchName}`}
                                            onSelect={() => {
                                              field.onChange(u.PersonalCode);
                                              const matchedBranch = branches.find((b) => b.branchid === u.BranchID);
                                              if (matchedBranch) {
                                                form.setValue("Branch", matchedBranch.branchid.toString());
                                                form.setValue("Address", matchedBranch.FullAddress || "");
                                                setFormData({
                                                  branchId: matchedBranch.branchid.toString(),
                                                  branchName: `${matchedBranch.code || matchedBranch.branchid} / ${matchedBranch.name}`,
                                                  address: matchedBranch.FullAddress || "",
                                                });
                                              }
                                              form.setValue("Firstname", u.fristName || "");
                                              form.setValue("Lastname", u.lastName || "");
                                              setOpenPMCode(false);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                field.value === u.PersonalCode && u.BranchID?.toString() === formData.branchId ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {u.PersonalCode} - {u.fristName} {u.lastName}
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          {fieldState.error && (
                            <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>
                          )}
                        </Field>
                      )}
                    />

                    {/* Date */}
                    <Controller
                      name="Date"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel>
                            Date <span className="text-red-500">*</span>
                          </FieldLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                  fieldState.error && "border-red-500"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy", {
                                    locale: th,
                                  })
                                ) : (
                                  <span>เลือกวันที่</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          {fieldState.error && (
                            <p className="text-sm text-red-500 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name="Firstname"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>ชื่อ</FieldLabel>
                          <Input {...field} placeholder="ชื่อ" className="w-full" disabled />
                        </Field>
                      )}
                    />

                    <Controller
                      name="Lastname"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>นามสกุล</FieldLabel>
                          <Input {...field} placeholder="นามสกุล" className="w-full" disabled />
                        </Field>
                      )}
                    />

                  </div>
                  )}

                  {/* Row 2: Address (Full Width) */}
                  <div className="grid grid-cols-1">
                    <Controller
                      name="Address"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>ที่อยู่</FieldLabel>
                          {isLoadingData ? (
                            <Skeleton className="h-10 w-full" />
                          ) : (
                          <Input
                            {...field}
                            placeholder="ที่อยู่สาขา"
                            className="w-full"
                            disabled
                          />
                          )}
                        </Field>
                      )}
                    />
                  </div>

                  {/* Row 3: Personnel (Same as create) */}
                  {isLoadingData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Auditor */}
                    <Controller
                      name="Auditor"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel>
                            Audit <span className="text-red-500">*</span>
                          </FieldLabel>
                          {isLoadingUsers ? (
                            <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <Popover open={openAuditor} onOpenChange={setOpenAuditor}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openAuditor}
                                  className={cn(
                                    "w-full justify-between",
                                    fieldState.error && "border-red-500"
                                  )}
                                >
                                  {getSelectedUserText(
                                    field.value,
                                    auditors,
                                    "เลือกผู้ตรวจสอบ"
                                  )}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="ค้นหาผู้ตรวจสอบ..." />
                                  <CommandList>
                                    <CommandEmpty>
                                      ไม่พบข้อมูลผู้ตรวจสอบ
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {auditors.map((user) => (
                                        <CommandItem
                                          key={user.UserID}
                                          value={`${user.Fullname} ${user.Position}`}
                                          onSelect={() => {
                                            field.onChange(user.UserID);
                                            setOpenAuditor(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              field.value === user.UserID
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />
                                          {user.Fullname} ({user.Position})
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )}
                          {fieldState.error && (
                            <p className="text-sm text-red-500 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </Field>
                      )}
                    />

                    {/* District Manager */}
                    <Controller
                      name="DistrictManager"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel>
                            ผู้จัดการเขต <span className="text-red-500">*</span>
                          </FieldLabel>
                          {isLoadingUsers ? (
                            <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <Popover
                              open={openDistrictManager}
                              onOpenChange={setOpenDistrictManager}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openDistrictManager}
                                  className={cn(
                                    "w-full justify-between",
                                    fieldState.error && "border-red-500"
                                  )}
                                >
                                  {getSelectedUserText(
                                    field.value,
                                    districtManagers,
                                    "เลือกผู้จัดการเขต"
                                  )}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="ค้นหาผู้จัดการเขต..." />
                                  <CommandList>
                                    <CommandEmpty>
                                      ไม่พบข้อมูลผู้จัดการเขต
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {districtManagers.map((user) => (
                                        <CommandItem
                                          key={user.UserID}
                                          value={`${user.Fullname} ${user.Position}`}
                                          onSelect={() => {
                                            field.onChange(user.UserID);
                                            setOpenDistrictManager(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              field.value === user.UserID
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />
                                          {user.Fullname} ({user.Position})
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )}
                          {fieldState.error && (
                            <p className="text-sm text-red-500 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </Field>
                      )}
                    />

                  </div>
                  )}

                  {/* Row 4: Additional Notes (Full Width) */}
                  <div className="grid grid-cols-1">
                    <Controller
                      name="AdditionalNotes"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>รายละเอียดเพิ่มเติม</FieldLabel>
                          <Textarea
                            {...field}
                            placeholder="กรอกรายละเอียดเพิ่มเติม..."
                            rows={4}
                            className="resize-none w-full"
                          />
                        </Field>
                      )}
                    />
                  </div>

                  {/* Row 5: Excel File (Full Width) */}
                  <div className="grid grid-cols-1">
                    <Field>
                      <FieldLabel>ไฟล์ Excel</FieldLabel>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            className="cursor-pointer"
                          />
                        </div>
                        {excelFile && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md">
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{excelFile.name}</span>
                          </div>
                        )}
                      </div>
                      <FieldDescription>
                        อัพโหลดไฟล์ใหม่เพื่อแทนที่ไฟล์เดิม (ถ้ามี)
                      </FieldDescription>
                    </Field>
                  </div>
                </div>
              </FieldSet>
            </CardContent>
          </Card>

          {/* Action Buttons - Mobile */}
          {jobData?.status !== 2 && (
            <div className="flex gap-3 md:hidden">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
              >
                ยกเลิก
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังอัพเดท...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          )}
          </fieldset>
        </form>

        {/* Audit Items */}
        <div className="mt-6">
          <DataTableItemList
            items={auditItems}
            jobNo={jobNo}
            jobData={jobData ?? undefined}
            isLoading={isLoadingItems}
            jobId={jobData?.jobId || 0}
            isLocked={jobData?.status === 2}
            onItemsChange={handleItemsChange}
          />
        </div>
      </div>
    </div>
  );
}