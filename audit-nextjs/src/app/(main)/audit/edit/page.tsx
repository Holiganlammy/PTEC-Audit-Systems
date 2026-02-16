"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Types
interface Branch {
  branchid: number;
  name: string;
  address?: string;
  code?: string;
}

interface User {
  UserID: string;
  UserCode: string;
  Fullname: string;
  BranchID: number;
  Position: string;
  PositionCode: string;
  Email: string;
}

interface AuditJobData {
  jobId: number;
  jobNo: string;
  branchId: number;
  branchName: string;
  auditDate: string;
  address: string;
  pmCode: string;
  auditorUserId: number;
  districtManagerUserId: number;
  branchManagerUserId: number;
  additionalNotes: string;
  status: number;
  active: boolean;
}

const formSchema = z.object({
  Branch: z.string().nonempty("กรุณาเลือกสาขา"),
  Date: z.date("กรุณาเลือกวันที่"),
  PMCode: z.string().optional(),
  Address: z.string().optional(),
  Auditor: z.string().nonempty("กรุณาเลือกผู้ตรวจสอบ"),
  DistrictManager: z.string().nonempty("กรุณาเลือกผู้จัดการเขต"),
  BranchManager: z.string().nonempty("กรุณาเลือกผู้จัดการสาขา"),
  AdditionalNotes: z.string().optional(),
});

export default function EditAuditJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Popover states
  const [openBranch, setOpenBranch] = useState(false);
  const [openAuditor, setOpenAuditor] = useState(false);
  const [openDistrictManager, setOpenDistrictManager] = useState(false);
  const [openBranchManager, setOpenBranchManager] = useState(false);

  // Data from API
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [jobData, setJobData] = useState<AuditJobData | null>(null);

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
      Date: undefined,
      PMCode: "",
      Address: "",
      Auditor: "",
      DistrictManager: "",
      BranchManager: "",
      AdditionalNotes: "",
    },
  });

  // Fetch existing job data
  useEffect(() => {
    const fetchJobData = async () => {
      try {
        setIsLoadingData(true);
        setLoadError(null);
        const response = await client.get(`/audit-jobs/${jobId}`, {
          headers: dataConfig().headers,
        });

        const data: AuditJobData = response.data;
        setJobData(data);

        // Set form values
        form.setValue("Branch", data.branchId.toString());
        form.setValue("Date", new Date(data.auditDate));
        form.setValue("PMCode", data.pmCode || "");
        form.setValue("Address", data.address || "");
        form.setValue("Auditor", data.auditorUserId.toString());
        form.setValue("DistrictManager", data.districtManagerUserId.toString());
        form.setValue("BranchManager", data.branchManagerUserId.toString());
        form.setValue("AdditionalNotes", data.additionalNotes || "");

        // Set formData
        setFormData({
          branchId: data.branchId.toString(),
          branchName: data.branchName,
          address: data.address || "",
        });
      } catch (error: unknown) {
        console.error("Error fetching job data:", error);
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
    };

    if (jobId) {
      fetchJobData();
    }
  }, [jobId]);

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
        toast.error("ไม่สามารถโหลดข้อมูลสาขาได้");
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
  const auditors = users.filter((u) => u.BranchID === 901);

  const districtManagers = users.filter(
    (u) =>
      u.Position?.toLowerCase().includes("ผู้จัดการเขต") ||
      u.PositionCode === "DM"
  );

  const branchManagers = users.filter(
    (u) =>
      u.Position?.toLowerCase().includes("ผู้จัดการสาขา") ||
      u.PositionCode === "BM"
  );

  // Handle branch selection
  const handleBranchChange = (value: string) => {
    const branch = branches.find((b) => b.branchid.toString() === value);
    if (branch) {
      form.setValue("Branch", value);
      form.setValue("Address", branch.address || "");
      setFormData({
        ...formData,
        branchId: value,
        branchName: `${branch.code || branch.branchid} / ${branch.name}`,
        address: branch.address || "",
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
      const payload = {
        branchId: parseInt(values.Branch),
        branchName: formData.branchName,
        auditDate: format(values.Date, "yyyy-MM-dd"),
        address: values.Address || "",
        pmCode: values.PMCode || "",
        auditorUserId: parseInt(values.Auditor),
        districtManagerUserId: parseInt(values.DistrictManager),
        branchManagerUserId: parseInt(values.BranchManager),
        additionalNotes: values.AdditionalNotes || "",
        updatedBy: "current_user", // TODO: Get from auth context
      };

      // Call API
      await client.put(`/audit-jobs/${jobId}`, payload, {
        headers: dataConfig().headers,
      });

      // TODO: Upload excel file if exists
      if (excelFile) {
        console.log("File to upload:", excelFile.name);
      }

      toast.success("อัพเดทงานสำเร็จ", {
        description: "ข้อมูลงานถูกอัพเดทเรียบร้อยแล้ว",
      });

      router.push("/audit-jobs");
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

  // Show loading state
  if (isLoadingData) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Loading Job Data...</h2>
              <p className="text-sm text-muted-foreground">
                กำลังโหลดข้อมูลงาน กรุณารอสักครู่
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (loadError || !jobData) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            ย้อนกลับ
          </Button>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {loadError || "ไม่พบข้อมูลงาน"}
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.push("/audit-jobs")}>
              กลับไปหน้ารายการ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            ย้อนกลับ
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Edit Audit Job</h1>
              <p className="text-muted-foreground mt-2">
                แก้ไขข้อมูลงานตรวจสอบ: {jobData.jobNo}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.back()}>
                ยกเลิก
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังอัพเดท...
                  </>
                ) : (
                  "อัพเดทงาน"
                )}
              </Button>
            </div>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field>
                      <FieldLabel>Job No</FieldLabel>
                      <Input
                        value={jobData.jobNo}
                        disabled
                        className="bg-muted"
                      />
                      <FieldDescription>
                        หมายเลขงานไม่สามารถแก้ไขได้
                      </FieldDescription>
                    </Field>
                  </div>

                  {/* Row 1: Branch, Date, PM Code */}
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

                    {/* PM Code */}
                    <Controller
                      name="PMCode"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>PM Code</FieldLabel>
                          <Input
                            {...field}
                            placeholder="PM600005"
                            className="w-full"
                          />
                        </Field>
                      )}
                    />
                  </div>

                  {/* Row 2: Address (Full Width) */}
                  <div className="grid grid-cols-1">
                    <Controller
                      name="Address"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Address</FieldLabel>
                          <Input
                            {...field}
                            placeholder="ที่อยู่สาขา"
                            className="w-full"
                          />
                        </Field>
                      )}
                    />
                  </div>

                  {/* Row 3: Personnel (Same as create) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                    {/* Branch Manager */}
                    <Controller
                      name="BranchManager"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel>
                            ผู้จัดการสาขา <span className="text-red-500">*</span>
                          </FieldLabel>
                          {isLoadingUsers ? (
                            <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <Popover
                              open={openBranchManager}
                              onOpenChange={setOpenBranchManager}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openBranchManager}
                                  className={cn(
                                    "w-full justify-between",
                                    fieldState.error && "border-red-500"
                                  )}
                                >
                                  {getSelectedUserText(
                                    field.value,
                                    branchManagers,
                                    "เลือกผู้จัดการสาขา"
                                  )}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="ค้นหาผู้จัดการสาขา..." />
                                  <CommandList>
                                    <CommandEmpty>
                                      ไม่พบข้อมูลผู้จัดการสาขา
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {branchManagers.map((user) => (
                                        <CommandItem
                                          key={user.UserID}
                                          value={`${user.Fullname} ${user.Position}`}
                                          onSelect={() => {
                                            field.onChange(user.UserID);
                                            setOpenBranchManager(false);
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
                "อัพเดทงาน"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}