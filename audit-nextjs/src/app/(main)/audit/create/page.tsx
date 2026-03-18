"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
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
import { getSession } from "next-auth/react";
import Branch from "./components/Branch"


const formSchema = z.object({
  Branch: z.string().nonempty("กรุณาเลือกสาขา"),
  Firstname: z.string().optional(),
  Lastname: z.string().optional(),
  Date: z.date({ error: "กรุณาเลือกวันที่" }),
  PMCode: z.string().min(1, "กรุณาเลือก PM Code"),
  Address: z.string().optional(),
  Auditor: z.string().nonempty("กรุณาเลือกผู้ตรวจสอบ"),
  DistrictManager: z.string().nonempty("กรุณาเลือกผู้จัดการเขต"),
  BranchManager: z.string().optional(), // ✅ ลบออกถ้าไม่มีใน form
  AdditionalNotes: z.string().optional(),
});

export default function CreateAuditJobPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingPMCodes, setIsLoadingPMCodes] = useState(true);

  // Popover states
  const [openBranch, setOpenBranch] = useState(false);
  const [openAuditor, setOpenAuditor] = useState(false);
  const [openDistrictManager, setOpenDistrictManager] = useState(false);
  const [openPMCode, setOpenPMCode] = useState(false);

  // Data from API
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userPersonalCodes, setUserPersonalCodes] = useState<User[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  // Form state
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
    },
  });

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
      } finally{
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
        const errorMessage =
          error instanceof Error && "response" in error
            ? (error as { response?: { data?: { message?: string } } })
                .response?.data?.message
            : undefined;
        toast.error("ไม่สามารถโหลดข้อมูลผู้ใช้ได้", {
          description: errorMessage || "กรุณาลองใหม่อีกครั้ง",
        });
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchUserPersonalCodes = async () => {
      try {
        setIsLoadingPMCodes(true);
        const response = await client.get("/users-personal-code", {
          headers: dataConfig().headers,
        });

        if (Array.isArray(response.data)) {
          setUserPersonalCodes(response.data);
        } else if (response.data?.success && Array.isArray(response.data?.data)) {
          setUserPersonalCodes(response.data.data);
        } else if (Array.isArray(response.data?.data)) {
          setUserPersonalCodes(response.data.data);
        }
      } catch (error: unknown) {
        console.error("Error fetching user personal codes:", error);
        const errorMessage =
          error instanceof Error && "response" in error
            ? (error as { response?: { data?: { message?: string } } })
                .response?.data?.message
            : undefined;
        toast.error("ไม่สามารถโหลดข้อมูลรหัสส่วนตัวผู้ใช้ได้", {
          description: errorMessage || "กรุณาลองใหม่อีกครั้ง",
        });
      } finally {
        setIsLoadingPMCodes(false);
      }
    };

    fetchUserPersonalCodes();
  }, []);

  // Filter users by position/role
  const auditors = users.filter((u) => ["KKJ", "PWW", "WSR"].includes(u.UserCode));

  const districtManagers = users.filter(
    (u) =>
      u.Position?.toLowerCase().includes("ผู้จัดการเขต") ||
      u.PositionCode === "AM"
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
      form.setValue("Address", branch.FullAddress || "");
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
    console.log('🎯 Form submitted with values:', values); 
    
    setIsSubmitting(true);
    const session = await getSession();
    
    try {
      
      const selectedBranch = branches.find((b) => b.branchid.toString() === values.Branch);
      const branchManager = branchManagers.find((u) => u.BranchID === selectedBranch?.branchid);

      const payload = {
        branchId: parseInt(values.Branch),
        branchName: selectedBranch?.name || "",
        auditDate: format(values.Date, "yyyy-MM-dd"),
        address: values.Address || "",
        pmCode: values.PMCode || "",
        auditorUserId: parseInt(values.Auditor),
        districtManagerUserId: parseInt(values.DistrictManager),
        branchManagerUserId: parseInt(branchManager?.UserID || "0"),
        additionalNotes: values.AdditionalNotes || "",
        status: 1,
        createdBy: session?.user?.UserID, 
      };
  
      // console.log('Payload:', payload);
  
      const result = await client.post("/audit-jobs/create", payload, {
        headers: dataConfig().headers,
      });
  
      // console.log('Result:', result.data);
  
      if (excelFile) {
        console.log("File to upload:", excelFile.name);
      }
  
      const createdJobNo = result.data.jobNo ?? result.data.data?.jobNo ?? "";
      const createdJobId = result.data.jobId ?? result.data.data?.jobId ?? "";
  
      toast.success("สร้างงานสำเร็จ", {
        description: `งาน ${createdJobNo} ถูกสร้างเรียบร้อยแล้ว`,
      });
  
      router.push(
        `/audit/create/add_items?jobNo=${encodeURIComponent(createdJobNo)}&jobId=${createdJobId}`
      );
    } catch (error: unknown) {
      console.error("Error creating audit job:", error);
     
      const errorMessage =
        error instanceof Error && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
          
      toast.error("เกิดข้อผิดพลาด", {
        description: errorMessage || "ไม่สามารถสร้างงานได้",
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
    console.error('Form validation errors:', errors);
    
    const firstError = Object.values(errors)[0];
    if (firstError?.message) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน", {
        description: firstError.message,
      });
    }
  };

  return (
    <div className="">
      <div className="max-w-[1400px] mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            ย้อนกลับ
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Create JOB - Audit Report</h1>
              <p className="text-sm text-muted-foreground mt-1">
                สร้างงานตรวจสอบใหม่
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
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึก"
                )}
              </Button>
            </div>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit, handleFormError)} className="space-y-6">
          {/* Main Card with all fields */}
          <Card>
            <CardContent className="pt-6">
              <FieldSet>
                <FieldLegend>สร้าง Audit Report</FieldLegend>
                <FieldDescription>
                  กรุณากรอกข้อมูลให้ครบถ้วนเพื่อสร้างงานตรวจสอบ
                </FieldDescription>

                <div className="space-y-6 mt-6">
                  {/* Row 1: Branch, Date, PM Code */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Branch */}
                    <Controller
                      name="Branch"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel>
                            สาขา <span className="text-red-500">*</span>
                          </FieldLabel>
                          {isLoadingBranches ? (
                            <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <Branch
                              openBranch={openBranch}
                              setOpenBranch={setOpenBranch}
                              branches={branches}
                              fieldState={fieldState}
                              field={field}
                              handleBranchChange={handleBranchChange}
                              getSelectedBranchText={getSelectedBranchText}
                            />
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
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>
                            PM Code <span className="text-red-500">*</span>
                          </FieldLabel>
                          {isLoadingPMCodes ? (
                            <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <Popover open={openPMCode} onOpenChange={setOpenPMCode}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openPMCode}
                                  className="w-full justify-between"
                                >
                                  {field.value
                                    ? (() => {
                                        const u = userPersonalCodes.find((u) => u.UserCode === field.value);
                                        return u ? `${u.PersonalCode} - ${u.fristName} ${u.lastName}` : field.value;
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
                                      {userPersonalCodes
                                        .filter((u) => u.UserCode)
                                        .map((u) => (
                                          <CommandItem
                                            key={u.UserID}
                                            value={`${u.PersonalCode} ${u.fristName} ${u.lastName} ${u.BranchName}`}
                                            onSelect={() => {
                                              field.onChange(u.PersonalCode);
                                              // Auto-fill Branch and Address from user's BranchID
                                              const matchedBranch = branches.find((b) => b.branchid === u.BranchID);
                                              if (matchedBranch) {
                                                form.setValue("Branch", matchedBranch.branchid.toString());
                                                form.setValue("Address", matchedBranch.FullAddress || "");
                                              }
                                              // Auto-fill Firstname and Lastname
                                              form.setValue("Firstname", u.fristName || "");
                                              form.setValue("Lastname", u.lastName || "");
                                              setOpenPMCode(false);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                field.value === u.UserCode
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              )}
                                            />
                                            {u.PersonalCode} - {u.fristName} {u.lastName} {u.BranchName}
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
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
                            วันที่ <span className="text-red-500">*</span>
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
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel>
                            ชื่อ <span className="text-red-500">*</span>
                          </FieldLabel>
                          <Input
                            {...field}
                            placeholder="ชื่อ"
                            className="w-full"
                            disabled
                          />
                          {fieldState.error && (
                            <p className="text-sm text-red-500 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name="Lastname"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel>
                            นามสกุล <span className="text-red-500">*</span>
                          </FieldLabel>
                          <Input
                            {...field}
                            placeholder="นามสกุล"
                            className="w-full"
                            disabled
                          />
                          {fieldState.error && (
                            <p className="text-sm text-red-500 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
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
                          <FieldLabel>ที่อยู่</FieldLabel>
                          <Input
                            {...field}
                            placeholder="ที่อยู่สาขา"
                            className="w-full"
                            disabled
                          />
                        </Field>
                      )}
                    />
                  </div>

                  {/* Row 3: Auditor, District Manager, Branch Manager */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Auditor */}
                    <Controller
                      name="Auditor"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel>
                            ผู้ตรวจสอบ <span className="text-red-500">*</span>
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
                                      {auditors
                                      .map((user) => (
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
                        รองรับไฟล์ .xlsx หรือ .xls เท่านั้น
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
            <Button type="submit" className="flex-1" disabled={isSubmitting} onClick={form.handleSubmit(onSubmit, handleFormError)}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                "บันทึก"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}