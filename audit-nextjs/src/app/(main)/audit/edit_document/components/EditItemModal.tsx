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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";

import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn, getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { auditCategoriesApi, type AuditCategory } from "@/lib/api/audit-categories";
import { useSession } from "next-auth/react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  categoryItemId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  inspectionDate: z.date(),
  itemStatus: z.string().min(1, "กรุณาเลือกสถานะ"),
  itemStatusEdit: z.string().min(1, "กรุณาเลือกสถานะอัพเดทและแก้ไข"),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AuditItem | null;
  jobData?: AuditJobData;
  hasBranchScore?: boolean;
  onItemUpdated: () => void;
}

const statusOptions = [
  { value: "1", label: "ปกติ" },
  // { value: "2", label: "อยู่ระหว่างดำเนินการ" },
  { value: "3", label: "ผิดปกติ" },
  // { value: "4", label: "ปิดเคส" },
];

const statusEditOptions = [
  { value: "2", label: "อยู่ระหว่างดำเนินการ" },
  { value: "4", label: "ปิดเคส" },
];

export default function EditItemModal({
  open,
  onOpenChange,
  item,
  jobData,
  hasBranchScore = false,
  onItemUpdated,
}: EditItemModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<AuditCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const { data: session } = useSession();

  const hasPendingApprovals = [
    ...(item?.note_1 ?? []),
    ...(item?.note_2 ?? []),
    ...(item?.note_3 ?? []),
  ].some((c) => c.approverStatus === 0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryItemId: "",
      inspectionDate: new Date(),
      itemStatus: "1",
      itemStatusEdit: "",
      remarks: "",
    },
  });

  // Populate form when item / modal opens
  useEffect(() => {
    if (item && open) {
      form.reset({
        categoryItemId: item.category_item_id.toString(),
        inspectionDate: new Date(item.inspection_date),
        itemStatus: item.item_status.toString(),
        itemStatusEdit: item.item_status_edit != null ? item.item_status_edit.toString() : "",
        remarks: item.remarks || "",
      });
    }
  }, [item, open, form]);

  // Fetch categories
  useEffect(() => {
    if (!open) return;
    
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const filtered = await auditCategoriesApi.getForSelect(jobData?.positionType);
        setCategories(filtered);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("ไม่สามารถโหลดหมวดหมู่ได้", { description: getErrorMessage(error, "กรุณาลองใหม่อีกครั้ง") });
      } finally {
        setIsLoadingCategories(false);
      }
    };
    
    fetchCategories();
  }, [open, jobData]);

  const onSubmit = async (values: FormValues) => {
    if (!item) return;
    if (values.itemStatusEdit === "4" && hasPendingApprovals) {
      toast.error("ไม่สามารถปิดเคสได้", {
        description: "ยังมีความเห็นที่รออนุมัติ — กรุณาอนุมัติให้ครบก่อน",
      });
      return;
    }
    if (values.itemStatusEdit === "4" && !hasBranchScore) {
      toast.error("ไม่สามารถปิดเคสได้", {
        description: "กรุณาให้คะแนนสาขา (branch score) ก่อนปิดเคส",
      });
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        categoryItemId: parseInt(values.categoryItemId),
        inspectionDate: format(values.inspectionDate, "yyyy-MM-dd"),
        itemStatus: parseInt(values.itemStatus),
        itemStatusEdit: parseInt(values.itemStatusEdit),
        remarks: values.remarks ?? "",
        updateBy: session?.user?.UserID,
      };

      await client.put(`/audit-items/${item.item_id}`, payload, {
        headers: dataConfig().headers,
      });

      toast.success("อัพเดทรายการสำเร็จ");
      onItemUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("ไม่สามารถอัพเดทรายการได้", { description: getErrorMessage(error, "กรุณาลองใหม่อีกครั้ง") });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>แก้ไขรายการตรวจสอบ</DialogTitle>
          <DialogDescription>
            แก้ไขข้อมูลรายการตรวจสอบในงาน Audit
          </DialogDescription>
        </DialogHeader>

        {/* Info Section */}
        {item && (
          <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">รหัสรายการ</span>
              <span className="font-medium">#{item.item_id}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">หมวดหมู่</span>
              <span className="font-medium">{item.category_name}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">วันที่แก้ไข(ล่าสุด)</span>
              <span className="font-medium">
                {format(new Date(item.updated_at), "dd MMM yyyy HH:mm", { locale: th })}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          {/* Category */}
          <Controller
            name="categoryItemId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>
                  หมวดหมู่ <span className="text-red-500">*</span>
                </FieldLabel>
                {isLoadingCategories ? (
                  <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <Select value={field.value} onValueChange={field.onChange} disabled>
                    <SelectTrigger className={cn(fieldState.error && "border-red-500")}>
                      <SelectValue placeholder="เลือกหมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem
                          key={cat.categoryItemId}
                          value={cat.categoryItemId.toString()}
                        >
                          {cat.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {fieldState.error && (
                  <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>
                )}
              </Field>
            )}
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
                      type="button"
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
                      onSelect={(date) => field.onChange(date ?? new Date())}
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
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!!jobData?.jobCreatedEmailSentAt}
                >
                  <SelectTrigger className={cn(fieldState.error && "border-red-500")}>
                    <SelectValue placeholder="เลือกสถานะ" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!!jobData?.jobCreatedEmailSentAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ไม่สามารถแก้ไขได้ เนื่องจากส่งเมลแจ้งเตือนแล้ว
                  </p>
                )}
                {fieldState.error && (
                  <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>
                )}
              </Field>
            )}
          />

          {/* Status Edit */}
          <Controller
            name="itemStatusEdit"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>
                  สถานะอัพเดทและแก้ไข (ล่าสุด) <span className="text-red-500">*</span>
                </FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={cn(fieldState.error && "border-red-500")}>
                    <SelectValue placeholder="เลือกสถานะ" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusEditOptions.map((s) => (
                      <SelectItem
                        key={s.value}
                        value={s.value}
                        disabled={s.value === "4" && (hasPendingApprovals || !hasBranchScore)}
                      >
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasPendingApprovals && (
                  <p className="text-xs text-amber-600 mt-1">
                    ยังมีความเห็นที่รออนุมัติ — ต้องอนุมัติให้ครบก่อนจึงจะสามารถปิดเคสได้
                  </p>
                )}
                {!hasPendingApprovals && !hasBranchScore && (
                  <p className="text-xs text-amber-600 mt-1">
                    ยังไม่ได้ให้คะแนนสาขา — ต้องให้คะแนน (branch score) ก่อนจึงจะสามารถปิดเคสได้
                  </p>
                )}
                {fieldState.error && (
                  <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>
                )}
              </Field>
            )}
          />

          {/* Remarks */}
          {/* <Controller
            name="remarks"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel>หมายเหตุ</FieldLabel>
                <Textarea
                  {...field}
                  placeholder="กรอกหมายเหตุ..."
                  rows={3}
                  className="resize-none"
                />
              </Field>
            )}
          /> */}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                "บันทึก"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}