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
import { Loader2 } from "lucide-react";
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
  categoryItemId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  itemStatus: z.string().min(1, "กรุณาเลือกสถานะ"),
  remarks: z.string().optional(),
  auditCommentStatus: z.enum(["0", "null"]),
});

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobNo: string;
  jobId: number;
  jobData?: AuditJobData;
  onItemAdded: () => void;
}

export default function AddItemModal({
  open,
  onOpenChange,
  jobNo,
  jobId,
  jobData,
  onItemAdded,
}: AddItemModalProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<AuditCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryItemId: "",
      itemStatus: "1",
      remarks: "",
      auditCommentStatus: "null",
    },
  });

  const watchedItemStatus = form.watch("itemStatus");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const filtered = await auditCategoriesApi.getForSelect(jobData?.positionType);
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
        categoryItemId: "",
        itemStatus: "1",
        remarks: "",
        auditCommentStatus: "null",
      });
    }
  }, [open, form, jobData]); 

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);

      const payload = {
        jobId: jobId,
        categoryItemId: parseInt(values.categoryItemId),
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

      toast.success("เพิ่มรายการสำเร็จ");
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>เพิ่มรายการตรวจสอบ</DialogTitle>
          <DialogDescription>
            เพิ่มรายการตรวจสอบใหม่ในงาน Audit: {jobNo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
                  <Select value={field.value} onValueChange={field.onChange}>
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
            ) : (
              "เพิ่มรายการ"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}