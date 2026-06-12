// app/areamanage/create/page.tsx
// Version: 1.0.0 | Date: 2025-06-08 | Updated: AM Create Page - AM User + RM User labels
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { dataConfig } from "@/config/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  CalendarIcon, Upload, ArrowLeft, Loader2, Check, ChevronsUpDown,
  Paperclip, ImageIcon, FileText, FileSpreadsheet, X, FileWarning,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, FieldErrors } from "react-hook-form";
import * as z from "zod";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { useSession } from "next-auth/react";
import Branch from "./components/Branch";
import {
  loadDraft,
  clearDraft,
  updateDraftHeader,
  saveDraftHeaderFiles,
  loadDraftHeaderFiles,
} from "@/utils/am-audit-draft";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formSchema = z.object({
  Branch: z.string().nonempty("กรุณาเลือกสาขา"),
  Firstname: z.string().optional(),
  Lastname: z.string().optional(),
  Date: z.date().refine((date) => !isNaN(date.getTime()), { message: "กรุณาเลือกวันที่" }),
  PMCode: z.string().min(1, "กรุณาเลือก PM Code"),
  Address: z.string().optional(),
  Auditor: z.string().nonempty("กรุณาเลือกผู้ตรวจสอบ"),
  DistrictManager: z.string().nonempty("กรุณาเลือกผู้อนุมัติ"),
  BranchManager: z.string().optional(),
  AdditionalNotes: z.string().optional(),
});

const getFileIcon = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileText className="h-4 w-4 text-red-500" />;
  if (ext === "xlsx" || ext === "xls") return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) return <ImageIcon className="h-4 w-4 text-blue-500" />;
  return <Paperclip className="h-4 w-4 text-muted-foreground" />;
};

export default function CreateAMJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingPMCodes, setIsLoadingPMCodes] = useState(true);
  const [jobHeaderFiles, setJobHeaderFiles] = useState<File[]>([]);
  const jobHeaderFileInputRef = useRef<HTMLInputElement>(null);

  const [openBranch, setOpenBranch] = useState(false);
  const [openAuditor, setOpenAuditor] = useState(false);         // AM User
  const [openDistrictManager, setOpenDistrictManager] = useState(false); // RM User
  const [openPMCode, setOpenPMCode] = useState(false);
  const [pmSearch, setPmSearch] = useState("");
  const initialFormType = searchParams.get("formType") === "AA" ? "AA" : "AM";
  const [roleFormTab, setRoleFormTab] = useState<"AM" | "AA">(initialFormType);
  const roleTabApplied = useRef(false);

  // ตั้ง default tab ตาม role เมื่อ session พร้อม (ใช้เฉพาะเมื่อ URL ไม่ได้กำหนด formType)
  useEffect(() => {
    if (!session?.user?.role_id) return;
    if (roleTabApplied.current) return;
    if (searchParams.get("formType")) return;
    roleTabApplied.current = true;
    if (Number(session.user.role_id) === 8) setRoleFormTab("AA");
  }, [session?.user?.role_id, searchParams]);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userPersonalCodes, setUserPersonalCodes] = useState<User[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      Branch: "", Firstname: "", Lastname: "", Date: new Date(),
      PMCode: "", Address: "", Auditor: "", DistrictManager: "",
      BranchManager: "", AdditionalNotes: "",
    },
  });

  // โหลด Draft
  useEffect(() => {
    let isActive = true;

    const loadDraftData = async () => {
      const draft = loadDraft(roleFormTab);
      if (draft) {
        toast.info("พบข้อมูล Draft", { description: "กำลังโหลดข้อมูลที่บันทึกไว้..." });
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

        const savedFiles = await loadDraftHeaderFiles(roleFormTab);
        if (isActive) {
          setJobHeaderFiles(savedFiles);
        }
      } else {
        // เปลี่ยน tab แต่ไม่มี draft ของ tab ใหม่ → reset เฉพาะ field ที่ต่างกันระหว่าง tab
        form.setValue("Auditor", "");
        form.setValue("DistrictManager", "");
      }
    };

    void loadDraftData();

    return () => {
      isActive = false;
    };
  }, [form, roleFormTab]);

  // Fetch branches
  useEffect(() => {
    client.get("/branch", { headers: dataConfig().headers })
      .then((res) => { if (res.data.success) setBranches(res.data.data.filter((b: Branch) => b.name?.startsWith("สาขา"))); })
      .catch(() => { toast.error("ไม่สามารถโหลดข้อมูลสาขาได้"); })
      .finally(() => setIsLoadingBranches(false));
  }, []);

  // Fetch users
  useEffect(() => {
    client.get("/users", { headers: dataConfig().headers })
      .then((res) => { if (Array.isArray(res.data)) setUsers(res.data); })
      .catch(() => { toast.error("ไม่สามารถโหลดข้อมูลผู้ใช้ได้"); })
      .finally(() => setIsLoadingUsers(false));
  }, []);

  // Fetch PM codes
  useEffect(() => {
    client.get("/users-personal-code", { headers: dataConfig().headers })
      .then((res) => {
        if (Array.isArray(res.data)) setUserPersonalCodes(res.data);
        else if (res.data?.success && Array.isArray(res.data?.data)) setUserPersonalCodes(res.data.data);
        else if (Array.isArray(res.data?.data)) setUserPersonalCodes(res.data.data);
      })
      .catch(() => { toast.error("ไม่สามารถโหลดข้อมูลรหัสส่วนตัวผู้ใช้ได้"); })
      .finally(() => setIsLoadingPMCodes(false));
  }, []);

  // ── User filters (เปลี่ยนตาม AM system) ──────────────────────────────────
  // AM Users = ผู้จัดการเขต (คนตรวจสอบ)
  const amUsers = users.filter((u) =>
    ["TNM", "KTK", "PRH", "STJ", "TKA"].includes(u.UserCode)
  );

  // RM Users = หัวหน้าคนตรวจ
  // TODO: เปลี่ยน filter ตาม UserCode ของ RM จริง
  const rmUsers = users.filter((u) =>
    ["TNM", "PRT"].includes(u.UserCode)
  );

  // AA Users = Area Assistant
  const aaUsers = users.filter((u) =>
    ["PM48000005",
      "PM64000001",
      "PM58000003",
      "PM48000005",
      "PM61000014",
      "PM59000001",
      "PM63000012",
      "PM65000010",
      "PM58000011",
      "PM64000002",
      "PM62000033",
      "PM59000003",
    ].includes(u.UserCode)
  );


  const branchManagers = users.filter(
    (u) => u.Position?.toLowerCase().includes("ผู้จัดการสาขา") || u.PositionCode === "BM"
  );

  // Handlers
  const handleBranchChange = (value: string) => {
    const branch = branches.find((b) => b.branchid.toString() === value);
    if (branch) { form.setValue("Branch", value); form.setValue("Address", branch.FullAddress || ""); }
    setOpenBranch(false);
  };

  const getSelectedBranchText = () => {
    const branchId = form.watch("Branch");
    if (!branchId) return "เลือกสาขา";
    const branch = branches.find((b) => b.branchid.toString() === branchId);
    return branch ? `${branch.name}` : "เลือกสาขา";
  };

  const getSelectedUserText = (fieldValue: string, usersList: User[], placeholder: string) => {
    if (!fieldValue) return placeholder;
    const user = usersList.find((u) => u.UserID === fieldValue);
    return user ? `${user.Fullname}` : placeholder;
  };

  const handleJobHeaderFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setJobHeaderFiles((prev) => [...prev, ...selectedFiles.filter((newFile) => !prev.some((ef) => ef.name === newFile.name && ef.size === newFile.size))]);
      e.target.value = "";
    }
  };

  const removeJobHeaderFile = (index: number) => { setJobHeaderFiles((prev) => prev.filter((_, i) => i !== index)); };

  const handleSaveDraft = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
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
        RoleFormType: roleFormTab,
      }, roleFormTab);
      await saveDraftHeaderFiles(jobHeaderFiles, roleFormTab);
      toast.success("บันทึก Draft แล้ว", { description: "กำลังไปหน้าเพิ่มรายการตรวจสอบ..." });
      router.push(`/areamanage/create/add_items?mode=draft&formType=${roleFormTab}`);
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("ไม่สามารถบันทึก Draft ได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormError = (errors: FieldErrors<z.infer<typeof formSchema>>) => {
    const firstError = Object.values(errors)[0];
    if (firstError?.message) toast.error("กรุณากรอกข้อมูลให้ครบถ้วน", { description: firstError.message });
  };

  const handleCancel = () => {
    const draft = loadDraft(roleFormTab);
    if (draft) setShowCancelDialog(true);
    else router.back();
  };

  return (
    <div className="">
      <div className="max-w-[1400px] mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={handleCancel} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Create JOB - AM - AA Report</h1>
              <p className="text-sm text-muted-foreground mt-1">สร้างงานตรวจสอบ AM ใหม่</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCancel}>ยกเลิก</Button>
              <Button onClick={form.handleSubmit(handleSaveDraft, handleFormError)} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังบันทึก...</> : "เพิ่มรายการตรวจสอบ"}
              </Button>
            </div>
          </div>
        </div>

        {jobHeaderFiles.length > 0 && (
          <Alert className="mb-6">
            <FileWarning className="h-4 w-4" />
            <AlertDescription>
              <strong>หมายเหตุ:</strong> ไฟล์แนบจะถูกเก็บใน Draft และอัปโหลดเมื่อกด <strong>&quot;เสร็จสิ้น&quot;</strong> ในหน้ารายการตรวจสอบ
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(handleSaveDraft, handleFormError)} className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <FieldSet>
                <div className="flex items-center justify-between">
                  <div>
                    <FieldLegend>สร้าง AM - AA Report</FieldLegend>
                    <FieldDescription>กรุณากรอกข้อมูลให้ครบถ้วนเพื่อสร้างงานตรวจสอบ AM</FieldDescription>
                  </div>
                </div>

                <div className="space-y-6 mt-6">
                  {/* Row 1: PM Code, Branch, Date, Firstname, Lastname */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* PM Code */}
                    <Controller name="PMCode" control={form.control} render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel>PM Code <span className="text-red-500">*</span></FieldLabel>
                        {isLoadingPMCodes ? (
                          <div className="flex items-center justify-center h-10 border rounded-md bg-muted"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                        ) : (
                          <Popover open={openPMCode} onOpenChange={setOpenPMCode}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" className="w-full justify-between">
                                {field.value ? (() => { const u = userPersonalCodes.find((u) => u.PersonalCode === field.value); return u ? `${u.PersonalCode} - ${u.fristName} ${u.lastName}` : field.value; })() : "เลือก PM Code"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command shouldFilter={false}>
                                <CommandInput placeholder="ค้นหา PM Code..." value={pmSearch} onValueChange={setPmSearch} />
                                <CommandList>
                                  <CommandEmpty>ไม่พบข้อมูล</CommandEmpty>
                                  <CommandGroup>
                                    {userPersonalCodes.filter((u) => { if (!u.UserCode) return false; if (!pmSearch) return true; const s = pmSearch.toLowerCase(); return u.PersonalCode?.toLowerCase().includes(s) || u.fristName?.toLowerCase().includes(s) || u.lastName?.toLowerCase().includes(s) || u.BranchName?.toLowerCase().includes(s); }).map((u) => (
                                      <CommandItem key={u.UserID} value={`${u.PersonalCode} ${u.fristName} ${u.lastName} ${u.BranchName}`} onSelect={() => { field.onChange(u.PersonalCode); form.setValue("Firstname", u.fristName || ""); form.setValue("Lastname", u.lastName || ""); setPmSearch(""); setOpenPMCode(false); }}>
                                        <Check className={cn("mr-2 h-4 w-4", field.value === u.PersonalCode ? "opacity-100" : "opacity-0")} />
                                        {u.PersonalCode} - {u.fristName} {u.lastName}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                        {fieldState.error && <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>}
                      </Field>
                    )} />

                    {/* Branch */}
                    <Controller name="Branch" control={form.control} render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel>สาขา <span className="text-red-500">*</span></FieldLabel>
                        {isLoadingBranches ? (
                          <div className="flex items-center justify-center h-10 border rounded-md bg-muted"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                        ) : (
                          <Branch openBranch={openBranch} setOpenBranch={setOpenBranch} branches={branches} fieldState={fieldState} field={field} handleBranchChange={handleBranchChange} getSelectedBranchText={getSelectedBranchText} />
                        )}
                        {fieldState.error && <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>}
                      </Field>
                    )} />

                    {/* Date */}
                    <Controller name="Date" control={form.control} render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel>วันที่ <span className="text-red-500">*</span></FieldLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground", fieldState.error && "border-red-500")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "dd/MM/yyyy", { locale: th }) : <span>เลือกวันที่</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                        </Popover>
                        {fieldState.error && <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>}
                      </Field>
                    )} />

                    {/* Firstname */}
                    <Controller name="Firstname" control={form.control} render={({ field }) => (
                      <Field><FieldLabel>ชื่อ</FieldLabel><Input {...field} placeholder="ชื่อ" disabled /></Field>
                    )} />

                    {/* Lastname */}
                    <Controller name="Lastname" control={form.control} render={({ field }) => (
                      <Field><FieldLabel>นามสกุล</FieldLabel><Input {...field} placeholder="นามสกุล" disabled /></Field>
                    )} />
                  </div>

                  {/* Address */}
                  <Controller name="Address" control={form.control} render={({ field }) => (
                    <Field><FieldLabel>ที่อยู่</FieldLabel><Input {...field} placeholder="ที่อยู่สาขา" disabled /></Field>
                  )} />

                  <Tabs
                    value={roleFormTab}
                    onValueChange={(value) => {
                      setRoleFormTab(value as "AM" | "AA");
                      setOpenAuditor(false);
                      setOpenDistrictManager(false);
                      setOpenPMCode(false);
                    }}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="AM" disabled={![1, 3].includes(Number(session?.user?.role_id ?? -1))}>AM Form</TabsTrigger>
                      <TabsTrigger value="AA" disabled={![1, 8].includes(Number(session?.user?.role_id ?? -1))}>AA Form</TabsTrigger>
                    </TabsList>

                    <TabsContent value="AM" className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Controller name="Auditor" control={form.control} render={({ field, fieldState }) => (
                          <Field>
                            <FieldLabel>ผู้จัดการเขต (AM) <span className="text-red-500">*</span></FieldLabel>
                            {isLoadingUsers ? (
                              <div className="flex items-center justify-center h-10 border rounded-md bg-muted"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                            ) : (
                              <Popover open={openAuditor} onOpenChange={setOpenAuditor}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" className={cn("w-full justify-between", fieldState.error && "border-red-500")}>
                                    {getSelectedUserText(field.value, amUsers, "เลือกผู้จัดการเขต (AM)")}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="ค้นหาผู้จัดการเขต..." />
                                    <CommandList>
                                      <CommandEmpty>ไม่พบข้อมูล</CommandEmpty>
                                      <CommandGroup>
                                        {amUsers.map((user) => (
                                          <CommandItem key={user.UserID} value={`${user.Fullname} ${user.Position}`} onSelect={() => { field.onChange(user.UserID); setOpenAuditor(false); }}>
                                            <Check className={cn("mr-2 h-4 w-4", field.value === user.UserID ? "opacity-100" : "opacity-0")} />
                                            {user.Fullname}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            )}
                            {fieldState.error && <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>}
                          </Field>
                        )} />

                        <Controller name="DistrictManager" control={form.control} render={({ field, fieldState }) => (
                          <Field>
                            <FieldLabel>ผู้จัดการภาค RM <span className="text-red-500">*</span></FieldLabel>
                            {isLoadingUsers ? (
                              <div className="flex items-center justify-center h-10 border rounded-md bg-muted"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                            ) : (
                              <Popover open={openDistrictManager} onOpenChange={setOpenDistrictManager}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" className={cn("w-full justify-between", fieldState.error && "border-red-500")}>
                                    {getSelectedUserText(field.value, rmUsers, "เลือก RM")}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="ค้นหา RM..." />
                                    <CommandList>
                                      <CommandEmpty>ไม่พบข้อมูล</CommandEmpty>
                                      <CommandGroup>
                                        {rmUsers.map((user) => (
                                          <CommandItem key={user.UserID} value={`${user.Fullname} ${user.Position}`} onSelect={() => { field.onChange(user.UserID); setOpenDistrictManager(false); }}>
                                            <Check className={cn("mr-2 h-4 w-4", field.value === user.UserID ? "opacity-100" : "opacity-0")} />
                                            {user.Fullname}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            )}
                            {fieldState.error && <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>}
                          </Field>
                        )} />
                      </div>
                    </TabsContent>

                    <TabsContent value="AA" className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Controller name="Auditor" control={form.control} render={({ field, fieldState }) => (
                          <Field>
                            <FieldLabel>Area Assistant (AA) <span className="text-red-500">*</span></FieldLabel>
                            {isLoadingUsers ? (
                              <div className="flex items-center justify-center h-10 border rounded-md bg-muted"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                            ) : (
                              <Popover open={openAuditor} onOpenChange={setOpenAuditor}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" className={cn("w-full justify-between", fieldState.error && "border-red-500")}>
                                    {getSelectedUserText(field.value, aaUsers, "เลือก Area Assistant (AA)")}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="ค้นหา Area Assistant..." />
                                    <CommandList>
                                      <CommandEmpty>ไม่พบข้อมูล</CommandEmpty>
                                      <CommandGroup>
                                        {aaUsers.map((user) => (
                                          <CommandItem key={user.UserID} value={`${user.Fullname} ${user.Position}`} onSelect={() => { field.onChange(user.UserID); setOpenAuditor(false); }}>
                                            <Check className={cn("mr-2 h-4 w-4", field.value === user.UserID ? "opacity-100" : "opacity-0")} />
                                            {user.Fullname}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            )}
                            {fieldState.error && <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>}
                          </Field>
                        )} />

                        <Controller name="DistrictManager" control={form.control} render={({ field, fieldState }) => (
                          <Field>
                            <FieldLabel>ผู้จัดการเขต (AM) <span className="text-red-500">*</span></FieldLabel>
                            {isLoadingUsers ? (
                              <div className="flex items-center justify-center h-10 border rounded-md bg-muted"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                            ) : (
                              <Popover open={openDistrictManager} onOpenChange={setOpenDistrictManager}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" className={cn("w-full justify-between", fieldState.error && "border-red-500")}>
                                    {getSelectedUserText(field.value, amUsers, "เลือกผู้จัดการเขต (AM)")}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="ค้นหาผู้จัดการเขต..." />
                                    <CommandList>
                                      <CommandEmpty>ไม่พบข้อมูล</CommandEmpty>
                                      <CommandGroup>
                                        {amUsers.map((user) => (
                                          <CommandItem key={user.UserID} value={`${user.Fullname} ${user.Position}`} onSelect={() => { field.onChange(user.UserID); setOpenDistrictManager(false); }}>
                                            <Check className={cn("mr-2 h-4 w-4", field.value === user.UserID ? "opacity-100" : "opacity-0")} />
                                            {user.Fullname}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            )}
                            {fieldState.error && <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>}
                          </Field>
                        )} />
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Additional Notes */}
                  <Controller name="AdditionalNotes" control={form.control} render={({ field }) => (
                    <Field><FieldLabel>รายละเอียดเพิ่มเติม</FieldLabel><Textarea {...field} placeholder="กรอกรายละเอียดเพิ่มเติม..." rows={4} className="resize-none w-full" /></Field>
                  )} />

                  {/* File Upload */}
                  <Field>
                    <FieldLabel>แนบไฟล์เอกสาร (Header)</FieldLabel>
                    <FieldDescription>รองรับไฟล์รูปภาพ, PDF, Excel (สูงสุด 10 ไฟล์, แต่ละไฟล์ไม่เกิน 10MB)</FieldDescription>
                    <input ref={jobHeaderFileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif,.pdf,.xlsx,.xls" onChange={handleJobHeaderFilesChange} className="hidden" />
                    <button type="button" onClick={() => jobHeaderFileInputRef.current?.click()} className="flex items-center gap-2 w-full border border-dashed border-muted-foreground/40 rounded-md px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <Upload className="h-4 w-4" />คลิกเพื่อเลือกไฟล์
                    </button>
                    {jobHeaderFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm text-muted-foreground">ไฟล์ที่เลือก ({jobHeaderFiles.length})</p>
                        <ul className="space-y-2">
                          {jobHeaderFiles.map((file, idx) => (
                            <li key={idx} className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                              <div className="flex items-center gap-2 min-w-0 flex-1">{getFileIcon(file.name)}<div className="flex flex-col min-w-0 flex-1"><span className="truncate font-medium">{file.name}</span><span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span></div></div>
                              <button type="button" onClick={() => removeJobHeaderFile(idx)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"><X className="h-4 w-4" /></button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Field>
                </div>
              </FieldSet>
            </CardContent>
          </Card>

          {/* Mobile buttons */}
          <div className="flex gap-3 md:hidden">
            <Button type="button" variant="outline" className="flex-1" onClick={handleCancel}>ยกเลิก</Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังบันทึก...</> : "เพิ่มรายการตรวจสอบ"}
            </Button>
          </div>
        </form>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>ยืนยันการยกเลิก</AlertDialogTitle><AlertDialogDescription>ต้องการยกเลิกและลบ Draft หรือไม่?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ไม่ใช่</AlertDialogCancel>
            <AlertDialogAction onClick={() => { clearDraft(roleFormTab); toast.info("ลบ Draft แล้ว"); router.push("/areamanage/list"); }}>ตกลง</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}