// components/audit/AddItemModal.tsx
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";

interface CategoryItem {
  category_item_id: number;
  category_name: string;
  category_code: string;
  description: string;
  active: boolean;
}

interface AuditItem {
  item_id?: number;
  job_id?: number;
  category_item_id: number;
  category_name?: string;
  inspection_date: Date;
  item_status: number;
  remarks: string;
  jobNo: string;
}

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobNo: string;
  onItemAdded: () => void;
}

export default function AddItemModal({
  open,
  onOpenChange,
  jobNo,
  onItemAdded,
}: AddItemModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const [formData, setFormData] = useState<AuditItem>({
    job_id: undefined,
    jobNo: jobNo,
    category_item_id: 0,
    inspection_date: new Date(),
    item_status: 1,
    remarks: "",
  });

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await client.get("/audit-category-items", {
          headers: dataConfig().headers,
        });

        if (response.data.success) {
          setCategories(response.data.data.filter((c: CategoryItem) => c.active));
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("ไม่สามารถโหลดหมวดหมู่ได้");
      } finally {
        setIsLoadingCategories(false);
      }
    };

    if (open) {
      fetchCategories();
    }
  }, [open]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.category_item_id) {
      toast.error("กรุณาเลือกหมวดหมู่");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        jobNo: jobNo,
        category_item_id: formData.category_item_id,
        inspection_date: format(formData.inspection_date, "yyyy-MM-dd"),
        item_status: formData.item_status,
        remarks: formData.remarks,
        created_by: "current_user", // TODO: Get from auth
      };

      await client.post("/audit-items", payload, {
        headers: dataConfig().headers,
      });

      toast.success("เพิ่มรายการสำเร็จ");
      
      // Reset form
      setFormData({
        jobNo: jobNo,
        category_item_id: 0,
        inspection_date: new Date(),
        item_status: 1,
        remarks: "",
      });

      onItemAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("ไม่สามารถเพิ่มรายการได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    { value: 1, label: "ปกติ" },
    { value: 2, label: "ผิดปกติ" },
    { value: 3, label: "ไม่มีข้อมูล" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>เพิ่มรายการตรวจสอบ</DialogTitle>
          <DialogDescription>
            เพิ่มรายการตรวจสอบใหม่ในงาน Audit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category */}
          <Field>
            <FieldLabel>
              หมวดหมู่ <span className="text-red-500">*</span>
            </FieldLabel>
            {isLoadingCategories ? (
              <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <Select
                value={formData.category_item_id.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, category_item_id: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem
                      key={cat.category_item_id}
                      value={cat.category_item_id.toString()}
                    >
                      {cat.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          {/* Inspection Date */}
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
                    !formData.inspection_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.inspection_date ? (
                    format(formData.inspection_date, "dd/MM/yyyy", { locale: th })
                  ) : (
                    <span>เลือกวันที่</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.inspection_date}
                  onSelect={(date) =>
                    setFormData({ ...formData, inspection_date: date || new Date() })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </Field>

          {/* Status */}
          <Field>
            <FieldLabel>
              สถานะ <span className="text-red-500">*</span>
            </FieldLabel>
            <Select
              value={formData.item_status.toString()}
              onValueChange={(value) =>
                setFormData({ ...formData, item_status: parseInt(value) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกสถานะ" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value.toString()}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Remarks */}
          <Field>
            <FieldLabel>หมายเหตุ</FieldLabel>
            <Textarea
              value={formData.remarks}
              onChange={(e) =>
                setFormData({ ...formData, remarks: e.target.value })
              }
              placeholder="กรอกหมายเหตุ..."
              rows={3}
              className="resize-none"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
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