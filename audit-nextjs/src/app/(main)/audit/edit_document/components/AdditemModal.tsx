"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel } from "@/components/ui/field";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { auditCategoriesApi, type AuditCategory } from "@/lib/api/audit-categories";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import * as z from "zod";

const formSchema = z.object({
  categoryItemIds: z
    .array(z.string())
    .min(1, "กรุณาเลือกหมวดหมู่อย่างน้อย 1 รายการ")
    .max(20, "เลือกได้สูงสุด 20 รายการ"),
  itemStatus: z.string().min(1, "กรุณาเลือกสถานะ"),
  remarks: z.string().optional(),
  auditCommentStatus: z.enum(["0", "null"]),
});

export interface DraftAddItem {
  category_item_id: number;
  category_name: string;
  inspection_date: string;
  item_status: number;
  item_status_edit: number | null;
  remarks: string;
  auditCommentStatus: string; // "0" = อนุมัติ, "null" = ยังไม่อนุมัติ
}

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobNo: string;
  jobId: number;
  jobData?: AuditJobData;
  onItemAdded: () => void;
  // Draft mode
  isDraftMode?: boolean;
  inspectionDate?: string;
  onDraftItemAdd?: (items: DraftAddItem[]) => void;
  /** ใช้ใน Draft mode แทน jobData?.positionType เพื่อกรอง category items ให้ถูกประเภท */
  positionType?: string;
}

export default function AddItemModal({
  open,
  onOpenChange,
  jobNo,
  jobId,
  jobData,
  onItemAdded,
  isDraftMode = false,
  inspectionDate,
  onDraftItemAdd,
  positionType,
}: AddItemModalProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<AuditCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryItemIds: [],
      itemStatus: "1",
      remarks: "",
      auditCommentStatus: "null",
    },
  });

  const watchedItemStatus = form.watch("itemStatus");
  const watchedCategoryIds = form.watch("categoryItemIds");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        // ใช้ positionType prop ก่อน (Draft mode), ถ้าไม่มีค่อยใช้ jobData?.positionType
        const resolvedPositionType = positionType ?? jobData?.positionType;
        const filtered = await auditCategoriesApi.getForSelect(resolvedPositionType);
        setCategories(filtered);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("ไม่สามารถโหลดหมวดหมู่ได้");
      } finally {
        setIsLoadingCategories(false);
      }
    };
  
    if (open) {
      fetchCategories();
      form.reset({
        categoryItemIds: [],
        itemStatus: "1",
        remarks: "",
        auditCommentStatus: "null",
      });
      setCategorySearch("");
      setOpenCombobox(false);
    }
  }, [open, form, jobData, positionType]); 

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Draft mode: add items locally without API call
    if (isDraftMode && onDraftItemAdd) {
      const draftItems: DraftAddItem[] = values.categoryItemIds.map((categoryItemId) => {
        const selectedCategory = categories.find(
          (c) => c.categoryItemId.toString() === categoryItemId
        );
        return {
          category_item_id: parseInt(categoryItemId),
          category_name: selectedCategory?.categoryName ?? "",
          inspection_date: inspectionDate ?? new Date().toISOString(),
          item_status: parseInt(values.itemStatus),
          item_status_edit: null,
          remarks: values.remarks?.trim() ?? "",
          auditCommentStatus: values.auditCommentStatus,
        };
      });
      onDraftItemAdd(draftItems);
      onOpenChange(false);
      toast.success(`เพิ่ม ${values.categoryItemIds.length} รายการสำเร็จ`);
      return;
    }

    try {
      setIsSubmitting(true);

      for (const categoryItemId of values.categoryItemIds) {
        const payload = {
          jobId: jobId,
          categoryItemId: parseInt(categoryItemId),
          inspectionDate: jobData?.auditDate,
          itemStatus: parseInt(values.itemStatus),
          remarks: null,
          createdBy: session?.user?.UserID,
        };

        const response = await client.post("/audit-items", payload, {
          headers: dataConfig().headers,
        });

        // Post remarks as first audit comment if provided
        const newItemId = response.data?.data?.itemId ?? response.data?.itemId;
        if (values.remarks?.trim() && newItemId) {
          const approverStatus = values.auditCommentStatus === "0" ? 0 : null;
          await client.post(
            `/audit-items/${newItemId}/audit-comments`,
            {
              itemId: newItemId,
              note: values.remarks.trim(),
              userId: jobData?.auditor.userId,
              createdBy: session?.user?.UserID,
              approverStatus,
            },
            { headers: dataConfig().headers }
          );
        }
      }

      toast.success(`เพิ่ม ${values.categoryItemIds.length} รายการสำเร็จ`);
      onItemAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding item:", error);
      
      const errorMessage =
        error instanceof Error && "response" in error
          ? (error as { response?: { data?: { message?: string } } })
              .response?.data?.message
          : undefined;
          
      toast.error("ไม่สามารถเพิ่มรายการได้", {
        description: errorMessage || "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

const statusOptions = [
  { value: "1", label: "ปกติ" },
  // { value: "2", label: "อยู่ระหว่างดำเนินการ" },
  { value: "3", label: "ผิดปกติ" },
];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>เพิ่มรายการตรวจสอบ</DialogTitle>
          <DialogDescription>
            เพิ่มรายการตรวจสอบใหม่ในงาน Audit: {jobNo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category */}
          <Controller
            name="categoryItemIds"
            control={form.control}
            render={({ field, fieldState }) => {
              const selected = field.value as string[];
              const filteredCategories = categories.filter(
                (cat) =>
                  !categorySearch ||
                  cat.categoryName
                    .toLowerCase()
                    .includes(categorySearch.toLowerCase())
              );
              return (
                <Field>
                  <FieldLabel>
                    หมวดหมู่ <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      {selected.length}/20 รายการ
                    </span>
                  </FieldLabel>
                  {isLoadingCategories ? (
                    <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <Popover open={openCombobox} onOpenChange={setOpenCombobox} modal={true}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between font-normal",
                              fieldState.error && "border-red-500"
                            )}
                          >
                            <span className="truncate text-muted-foreground">
                              {selected.length === 0
                                ? "เลือกหมวดหมู่..."
                                : `เลือกแล้ว ${selected.length} รายการ — คลิกเพื่อเพิ่ม`}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-w-[500px] w-[500px]" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="ค้นหาหมวดหมู่..."
                              value={categorySearch}
                              onValueChange={setCategorySearch}
                            />
                            <CommandList className="max-h-[240px]">
                              <CommandEmpty>ไม่พบหมวดหมู่</CommandEmpty>
                              <CommandGroup>
                                {filteredCategories.map((cat) => {
                                  const idStr = cat.categoryItemId.toString();
                                  const isSelected = selected.includes(idStr);
                                  const isDisabled =
                                    !isSelected && selected.length >= 20;
                                  return (
                                    <CommandItem
                                      key={cat.categoryItemId}
                                      value={idStr}
                                      disabled={isDisabled}
                                      onSelect={() => {
                                        if (isSelected) {
                                          field.onChange(
                                            selected.filter((id) => id !== idStr)
                                          );
                                        } else if (!isDisabled) {
                                          field.onChange([...selected, idStr]);
                                        }
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4 shrink-0",
                                          isSelected ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <span
                                        className={cn(
                                          isDisabled && "text-muted-foreground/50"
                                        )}
                                      >
                                        {cat.categoryName}
                                      </span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {/* Selected badges */}
                      {selected.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {selected.map((id) => {
                            const cat = categories.find(
                              (c) => c.categoryItemId.toString() === id
                            );
                            return (
                              <Badge
                                key={id}
                                variant="secondary"
                                className="gap-1 pr-1 max-w-full"
                              >
                                <span className="text-xs truncate max-w-[200px]">
                                  {cat?.categoryName ?? id}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    field.onChange(selected.filter((s) => s !== id))
                                  }
                                  className="rounded-full hover:bg-muted-foreground/20 p-0.5 shrink-0"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                  {fieldState.error && (
                    <p className="text-sm text-red-500 mt-1">
                      {fieldState.error.message}
                    </p>
                  )}
                </Field>
              );
            }}
          />

          {/* Inspection Date */}
          {/* <Controller
            name="inspectionDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>
                  วันที่ตรวจสอบ <span className="text-red-500">*</span>
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
                        format(field.value, "dd/MM/yyyy", { locale: th })
                      ) : (
                        <span>เลือกวันที่</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => field.onChange(date || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {fieldState.error && (
                  <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>
                )}
              </Field>
            )}
          /> */}

          {/* Status */}
          <Controller
            name="itemStatus"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>
                  สถานะที่ตรวจพบ <span className="text-red-500">*</span>
                </FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={cn(fieldState.error && "border-red-500")}>
                    <SelectValue placeholder="เลือกสถานะ" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error && (
                  <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>
                )}
              </Field>
            )}
          />

          {/* Remarks + Audit Comment Status */}
          <Controller
            name="remarks"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel>หมายเหตุ / Comment Audit แรก</FieldLabel>
                <Textarea
                  {...field}
                  placeholder="กรอกหมายเหตุ (จะถูกบันทึกเป็น Comment Audit แรก)..."
                  rows={3}
                  className="resize-none"
                />
              </Field>
            )}
          />

          {/* Audit Comment Approval Status - แสดงเฉพาะเมื่อเลือก ผิดปกติ */}
          {watchedItemStatus === "3" && <Controller
            name="auditCommentStatus"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel className="text-xs text-muted-foreground">
                  สถานะ Comment Audit
                </FieldLabel>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex gap-6 mt-1"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="0" id="comment-approved" />
                    <Label
                      htmlFor="comment-approved"
                      className={cn(
                        "cursor-pointer text-sm font-medium",
                        field.value === "0" ? "text-green-600" : "text-muted-foreground"
                      )}
                    >
                      อนุมัติ
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="null" id="comment-rejected" />
                    <Label
                      htmlFor="comment-rejected"
                      className={cn(
                        "cursor-pointer text-sm font-medium",
                        field.value === "null" ? "text-red-500" : "text-muted-foreground"
                      )}
                    >
                      ไม่อนุมัติ
                    </Label>
                  </div>
                </RadioGroup>
              </Field>
            )}
          />}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
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
            ) : watchedCategoryIds.length > 0 ? (
              `เพิ่ม ${watchedCategoryIds.length} รายการ`
            ) : (
              "เพิ่มรายการ"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}