// app/audit/create/page.tsx
// Version: 2.0.0 | Date: 2024-05-18 | Updated: Added Draft Stage with SessionStorage
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { dataConfig } from "@/config/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Paperclip,
  ImageIcon,
  FileText,
  FileSpreadsheet,
  X,
  AlertCircle,
  FileWarning,
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
import { useSession } from "next-auth/react";
import Branch from "./components/Branch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { saveDraft, loadDraft, clearDraft, updateDraftHeader } from "@/utils/audit-draft";

const formSchema = z.object({
  Branch: z.string().nonempty("กรุณาเลือกสาขา"),
  Firstname: z.string().optional(),
  Lastname: z.string().optional(),
  Date: z.date().refine((date) => !isNaN(date.getTime()), {
    message: "กรุณาเลือกวันที่",
  }),
  PMCode: z.string().min(1, "กรุณาเลือก PM Code"),
  Address: z.string().optional(),
  Auditor: z.string().nonempty("กรุณาเลือกผู้ตรวจสอบ"),
  DistrictManager: z.string().nonempty("กรุณาเลือกผู้จัดการเขต"),
  BranchManager: z.string().optional(),
  AdditionalNotes: z.string().optional(),
  Type: z.enum(["visit", "online"]).refine((val) => val !== undefined, { message: "กรุณาเลือกประเภทการตรวจ" }),
});

const getFileIcon = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  if (ext === "xlsx" || ext === "xls") {
    return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  }
  if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) {
    return <ImageIcon className="h-4 w-4 text-blue-500" />;
  }

  return <Paperclip className="h-4 w-4 text-muted-foreground" />;
};

export default function CreateAuditJobPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingPMCodes, setIsLoadingPMCodes] = useState(true);
  const [jobHeaderFiles, setJobHeaderFiles] = useState<File[]>([]);
  const jobHeaderFileInputRef = useRef<HTMLInputElement>(null);

  // Popover states
  const [openBranch, setOpenBranch] = useState(false);
  const [openAuditor, setOpenAuditor] = useState(false);
  const [openDistrictManager, setOpenDistrictManager] = useState(false);
  const [openPMCode, setOpenPMCode] = useState(false);
  const [pmSearch, setPmSearch] = useState("");

  // Data from API
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userPersonalCodes, setUserPersonalCodes] = useState<User[]>([]);

  // Form state
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      Branch: "",
      Firstname: "",
      Lastname: "",
      Date: new Date(),
      PMCode: "",
      Address: "",
      Auditor: "",
      DistrictManager: "",
      BranchManager: "",
      AdditionalNotes: "",
      Type: undefined,
    },
  });

  // โหลด Draft เมื่อ Component Mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      toast.info("พบข้อมูล Draft", {
        description: "กำลังโหลดข้อมูลที่บันทึกไว้...",
      });

      // Restore form values
      form.setValue("Branch", draft.header.Branch);
      form.setValue("Firstname", draft.header.Firstname);
      form.setValue("Lastname", draft.header.Lastname);
      form.setValue("Date", new Date(draft.header.Date));
      form.setValue("PMCode", draft.header.PMCode);
      form.setValue("Address", draft.header.Address);
      form.setValue("Auditor", draft.header.Auditor);
      form.setValue("DistrictManager", draft.header.DistrictManager);
      form.setValue("BranchManager", draft.header.BranchManager || "");
      form.setValue("AdditionalNotes", draft.header.AdditionalNotes || "");
      form.setValue("Type", draft.header.Type);
    }
  }, [form]);

  // Fetch branches from API
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setIsLoadingBranches(true);
        const response = await client.get("/branch", {
          headers: dataConfig().headers,
        });

        if (response.data.success) {
          setBranches(response.data.data.filter((b: Branch) => b.name?.startsWith("สาขา")));
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
        } else if (
          response.data?.success &&
          Array.isArray(response.data?.data)
        ) {
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
  const auditors = users.filter((u) =>
    ["KKJ", "PWW", "WSR"].includes(u.UserCode)
  );

  const districtManagers = users.filter((u) =>
    ["TNM", "KTK", "PRH", "STJ", "TKA"].includes(u.UserCode)
  );

  const handleJobHeaderFilesChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);

      // เพิ่มไฟล์ใหม่ (ไม่ซ้ำ)
      setJobHeaderFiles((prev) => [
        ...prev,
        ...selectedFiles.filter(
          (newFile) =>
            !prev.some(
              (existingFile) =>
                existingFile.name === newFile.name &&
                existingFile.size === newFile.size
            )
        ),
      ]);

      // Reset input
      e.target.value = "";
    }
  };

  const removeJobHeaderFile = (index: number) => {
    setJobHeaderFiles((prev) => prev.filter((_, i) => i !== index));
  };

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

  /**
   * บันทึก Draft และไปหน้า Add Items
   */
  const handleSaveDraft = (values: z.infer<typeof formSchema>) => {
    try {
      // บันทึก Header ลง SessionStorage
      updateDraftHeader({
        Branch: values.Branch,
        Firstname: values.Firstname || "",
        Lastname: values.Lastname || "",
        Date: values.Date.toISOString(),
        PMCode: values.PMCode,
        Address: values.Address || "",
        Auditor: values.Auditor,
        DistrictManager: values.DistrictManager,
        BranchManager: values.BranchManager,
        AdditionalNotes: values.AdditionalNotes,
        Type: values.Type,
      });

      toast.success("บันทึก Draft แล้ว", {
        description: "กำลังไปหน้าเพิ่มรายการตรวจสอบ...",
      });

      // Redirect ไปหน้า Add Items (Draft Mode)
      router.push("/audit/create/add_items?mode=draft");
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("ไม่สามารถบันทึก Draft ได้", {
        description: "กรุณาลองใหม่อีกครั้ง",
      });
    }
  };

  const handleFormError = (
    errors: FieldErrors<z.infer<typeof formSchema>>
  ) => {
    console.error("Form validation errors:", errors);

    const firstError = Object.values(errors)[0];
    if (firstError?.message) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน", {
        description: firstError.message,
      });
    }
  };

  const handleCancel = () => {
    // ถ้ามี Draft ให้ถามก่อน
    const draft = loadDraft();
    if (draft) {
      if (confirm("ต้องการยกเลิกและลบ Draft หรือไม่?")) {
        clearDraft();
        toast.info("ลบ Draft แล้ว");
        router.back();
      }
    } else {
      router.back();
    }
  };

  return (
    <div className="">
      <div className="max-w-[1400px] mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={handleCancel} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Create JOB - Audit Report</h1>
              <p className="text-sm text-muted-foreground mt-1">
                สร้างงานตรวจสอบใหม่
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCancel}>
                ยกเลิก
              </Button>
              <Button
                onClick={form.handleSubmit(handleSaveDraft, handleFormError)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "เพิ่มรายการตรวจสอบ"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Warning: ไฟล์จะหายถ้า Refresh */}
        {jobHeaderFiles.length > 0 && (
          <Alert className="mb-6">
            <FileWarning className="h-4 w-4" />
            <AlertDescription>
              <strong>หมายเหตุ:</strong> ไฟล์แนบจะถูกบันทึกเมื่อกด{" "}
              <strong>&quot;เสร็จสิ้น&quot;</strong> เท่านั้น
              หาก Refresh หน้าเว็บหรือปิดแท็บ กรุณาเลือกไฟล์ใหม่
            </AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={form.handleSubmit(handleSaveDraft, handleFormError)}
          className="space-y-6"
        >
          {/* Main Card with all fields */}
          <Card>
            <CardContent className="pt-6">
              <FieldSet>
                <div className="flex items-center justify-between">
                  <div>
                    <FieldLegend>สร้าง Audit Report</FieldLegend>
                    <FieldDescription>
                      กรุณากรอกข้อมูลให้ครบถ้วนเพื่อสร้างงานตรวจสอบ
                    </FieldDescription>
                  </div>
                  <Controller
                    name="Type"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field className="mx-2 w-auto">
                        <FieldLabel className="justify-center">
                          ประเภทการตรวจ{" "}
                          <span className="text-red-500">*</span>
                        </FieldLabel>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex gap-6"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem
                              value="visit"
                              id="create-type-visit"
                            />
                            <Label
                              htmlFor="create-type-visit"
                              className="cursor-pointer font-normal"
                            >
                              Visit
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem
                              value="online"
                              id="create-type-online"
                            />
                            <Label
                              htmlFor="create-type-online"
                              className="cursor-pointer font-normal"
                            >
                              Online
                            </Label>
                          </div>
                        </RadioGroup>
                        {fieldState.error && (
                          <p className="text-sm text-red-500 mt-1">
                            {fieldState.error.message}
                          </p>
                        )}
                      </Field>
                    )}
                  />
                </div>

                <div className="space-y-6 mt-6">
                  {/* Row 1: PM Code, Branch, Date */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* PM Code */}
                    <Controller
                      name="PMCode"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel>
                            PM Code <span className="text-red-500">*</span>
                          </FieldLabel>
                          {isLoadingPMCodes ? (
                            <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <Popover
                              open={openPMCode}
                              onOpenChange={setOpenPMCode}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openPMCode}
                                  className="w-full justify-between"
                                >
                                  {field.value
                                    ? (() => {
                                        const u = userPersonalCodes.find(
                                          (u) => u.PersonalCode === field.value
                                        );
                                        return u
                                          ? `${u.PersonalCode} - ${u.fristName} ${u.lastName}`
                                          : field.value;
                                      })()
                                    : "เลือก PM Code"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-full p-0"
                                align="start"
                              >
                                <Command shouldFilter={false}>
                                  <CommandInput
                                    placeholder="ค้นหา PM Code..."
                                    value={pmSearch}
                                    onValueChange={setPmSearch}
                                  />
                                  <CommandList>
                                    <CommandEmpty>ไม่พบข้อมูล</CommandEmpty>
                                    <CommandGroup>
                                      {userPersonalCodes
                                        .filter((u) => {
                                          if (!u.UserCode) return false;
                                          if (!pmSearch) return true;
                                          const s = pmSearch.toLowerCase();
                                          return (
                                            u.PersonalCode?.toLowerCase().includes(
                                              s
                                            ) ||
                                            u.fristName
                                              ?.toLowerCase()
                                              .includes(s) ||
                                            u.lastName
                                              ?.toLowerCase()
                                              .includes(s) ||
                                            u.BranchName?.toLowerCase().includes(
                                              s
                                            )
                                          );
                                        })
                                        .map((u) => (
                                          <CommandItem
                                            key={u.UserID}
                                            value={`${u.PersonalCode} ${u.fristName} ${u.lastName} ${u.BranchName}`}
                                            onSelect={() => {
                                              field.onChange(u.PersonalCode);
                                              // Auto-fill Firstname and Lastname
                                              form.setValue(
                                                "Firstname",
                                                u.fristName || ""
                                              );
                                              form.setValue(
                                                "Lastname",
                                                u.lastName || ""
                                              );
                                              setPmSearch("");
                                              setOpenPMCode(false);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                field.value === u.PersonalCode
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              )}
                                            />
                                            {u.PersonalCode} - {u.fristName}{" "}
                                            {u.lastName}
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
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
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

                    {/* Firstname */}
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

                    {/* Lastname */}
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

                  {/* Row 3: Auditor, District Manager */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Auditor */}
                    <Controller
                      name="Auditor"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field>
                          <FieldLabel>
                            ผู้ตรวจสอบ{" "}
                            <span className="text-red-500">*</span>
                          </FieldLabel>
                          {isLoadingUsers ? (
                            <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <Popover
                              open={openAuditor}
                              onOpenChange={setOpenAuditor}
                            >
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
                              <PopoverContent
                                className="w-full p-0"
                                align="start"
                              >
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
                            ผู้จัดการเขต{" "}
                            <span className="text-red-500">*</span>
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
                              <PopoverContent
                                className="w-full p-0"
                                align="start"
                              >
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
                      <FieldLabel>แนบไฟล์เอกสาร (Header)</FieldLabel>
                      <FieldDescription>
                        รองรับไฟล์รูปภาพ, PDF, Excel (สูงสุด 10 ไฟล์, แต่ละไฟล์ไม่เกิน 10MB)
                      </FieldDescription>

                      {/* Hidden file input */}
                      <input
                        ref={jobHeaderFileInputRef}
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.gif,.pdf,.xlsx,.xls"
                        onChange={handleJobHeaderFilesChange}
                        className="hidden"
                      />

                      {/* Upload button */}
                      <button
                        type="button"
                        onClick={() =>
                          jobHeaderFileInputRef.current?.click()
                        }
                        className="flex items-center gap-2 w-full border border-dashed border-muted-foreground/40 rounded-md px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        <Upload className="h-4 w-4" />
                        คลิกเพื่อเลือกไฟล์
                      </button>

                      {/* File list */}
                      {jobHeaderFiles.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm text-muted-foreground">
                            ไฟล์ที่เลือก ({jobHeaderFiles.length})
                          </p>
                          <ul className="space-y-2">
                            {jobHeaderFiles.map((file, idx) => (
                              <li
                                key={idx}
                                className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {getFileIcon(file.name)}
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="truncate font-medium">
                                      {file.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {(file.size / 1024).toFixed(1)} KB
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeJobHeaderFile(idx)}
                                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
                                  title="ลบไฟล์"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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
              onClick={handleCancel}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                "เพิ่มรายการตรวจสอบ"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}