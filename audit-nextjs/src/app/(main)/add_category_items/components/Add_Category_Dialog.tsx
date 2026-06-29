"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import * as z from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { auditCategoriesApi, type AuditCategory } from "@/lib/api/audit-categories";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSession } from "next-auth/react";

interface AddCategoryItemsPageProps {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  editingCategory?: AuditCategory | null;
  onSuccess?: () => void;
}

const formSchema = z.object({
  categoryName: z.string().min(1, "กรุณากรอกชื่อหมวดหมู่"),
  categoryCode: z.number().nullable().optional(),
  positionType: z.string().min(1, "กรุณาเลือกประเภทการตรวจสอบ"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddCategoryItemsPage({
  isDialogOpen,
  setIsDialogOpen,
  editingCategory,
  onSuccess,
}: AddCategoryItemsPageProps) {
  const isEditing = !!editingCategory;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryName: "",
      categoryCode: null,
      positionType: "",
      description: "",
    },
  });

  const { isSubmitting } = form.formState;
  const { data: session } = useSession();

  useEffect(() => {
    if (editingCategory) {
      form.reset({
        categoryName: editingCategory.categoryName,
        categoryCode: editingCategory.categoryCode != null ? Number(editingCategory.categoryCode) : null,
        positionType: editingCategory.positionType ?? "",
        description: editingCategory.description ?? "",
      });
    } else {
      form.reset({ categoryName: "", categoryCode: null, positionType: "", description: "" });
    }
  }, [editingCategory, isDialogOpen, form]);

  const onSubmit = async (data: FormValues) => {
    try {
      if (isEditing && editingCategory) {
        const trimmedDescription = data.description?.trim() ?? "";
        const payload = {
          categoryName: data.categoryName,
          categoryCode: data.categoryCode ?? undefined,
          description: trimmedDescription === "" ? null : trimmedDescription,
          positionType: data.positionType || undefined,
          createBy: session?.user.UserID,
        };

        await auditCategoriesApi.update(editingCategory.categoryItemId, payload);
        toast.success("แก้ไขหมวดหมู่เรียบร้อยแล้ว");
      } else {
        const trimmedDescription = data.description?.trim() ?? "";
        const payload = {
          categoryName: data.categoryName,
          categoryCode: data.categoryCode ?? undefined,
          description: trimmedDescription === "" ? undefined : trimmedDescription,
          positionType: data.positionType || undefined,
          createBy: session?.user.UserID,
        };

        await auditCategoriesApi.create(payload);
        toast.success("เพิ่มหมวดหมู่เรียบร้อยแล้ว");
      }
      setIsDialogOpen(false);
      onSuccess?.();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}</DialogTitle>
          <DialogDescription>กรอกข้อมูลหมวดหมู่รายการตรวจสอบ</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="py-2">
            <Controller
              name="categoryName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldContent>
                    <FieldLabel htmlFor="categoryName">
                      ชื่อหมวดหมู่ <span className="text-destructive">*</span>
                    </FieldLabel>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </FieldContent>
                  <Input
                    id="categoryName"
                    placeholder="เช่น ระบบไฟฟ้า"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                </Field>
              )}
            />

            <Controller
              name="categoryCode"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldContent>
                    <FieldLabel htmlFor="categoryCode">รหัสหมวดหมู่</FieldLabel>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </FieldContent>
                  <Input
                    id="categoryCode"
                    type="number"
                    placeholder="เช่น 101"
                    aria-invalid={fieldState.invalid}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? null : Number(value));
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </Field>
              )}
            />

            <Controller
              name="positionType"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldContent>
                    <FieldLabel htmlFor="positionType">ประเภทการตรวจสอบ</FieldLabel>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </FieldContent>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="visit" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                              <SelectItem value="visit">visit</SelectItem>
                              <SelectItem value="online">online</SelectItem>
                              <SelectItem value="cctv">cctv</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Field>
              )}
            />

            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldContent>
                    <FieldLabel htmlFor="description">คำอธิบาย</FieldLabel>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </FieldContent>
                  <Textarea
                    id="description"
                    placeholder="รายละเอียดเพิ่มเติม..."
                    rows={3}
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "บันทึก" : "เพิ่มหมวดหมู่"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
