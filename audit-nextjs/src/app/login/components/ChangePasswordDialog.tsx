// app/(auth)/login/components/ChangePasswordDialog.tsx
// Version: 2.0.0 | Date: 2025-05-20 | Updated: Refactor to RHF + Zod + Controller/Field
"use client";

import { useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  CircleCheck,
  CircleX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";

// ── Password Rules ──────────────────────────────────────────────────────────

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

const PASSWORD_RULES: PasswordRule[] = [
  { label: "อย่างน้อย 8 ตัวอักษร", test: (pw) => pw.length >= 8 },
  { label: "มีตัวพิมพ์เล็ก (a-z)", test: (pw) => /[a-z]/.test(pw) },
  { label: "มีตัวพิมพ์ใหญ่ (A-Z)", test: (pw) => /[A-Z]/.test(pw) },
  { label: "มีตัวเลข (0-9)", test: (pw) => /\d/.test(pw) },
  { label: "มีตัวอักษรพิเศษ (!@#$%^&*)", test: (pw) => SPECIAL_CHAR_REGEX.test(pw) },
];

// ── Zod Schema ──────────────────────────────────────────────────────────────

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
    newPassword: z
      .string()
      .min(8, "อย่างน้อย 8 ตัวอักษร")
      .regex(/[a-z]/, "ต้องมีตัวพิมพ์เล็ก (a-z)")
      .regex(/[A-Z]/, "ต้องมีตัวพิมพ์ใหญ่ (A-Z)")
      .regex(/\d/, "ต้องมีตัวเลข (0-9)")
      .regex(SPECIAL_CHAR_REGEX, "ต้องมีตัวอักษรพิเศษ (!@#$%^&*)"),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านเดิม",
    path: ["newPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// ── Types ───────────────────────────────────────────────────────────────────

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userCode: string;
  onSuccess: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function ChangePasswordDialog({
  open,
  onOpenChange,
  userCode,
  onSuccess,
}: ChangePasswordDialogProps) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── React Hook Form ──────────────────────────────────────────────────────

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    mode: "onChange",
  });

  const { isSubmitting } = form.formState;
  const watchedNew = useWatch({ control: form.control, name: "newPassword" });
  const watchedConfirm = useWatch({ control: form.control, name: "confirmPassword" });
  const confirmTouched = form.formState.touchedFields.confirmPassword;
  const isPasswordMatch = watchedNew === watchedConfirm && watchedConfirm.length > 0;

  // Strength
  const passedCount = PASSWORD_RULES.filter((r) => r.test(watchedNew)).length;
  const strength =
    passedCount === 0 ? 0 : passedCount <= 2 ? 1 : passedCount <= 4 ? 2 : 3;
  const strengthLabels = ["", "อ่อน", "ปานกลาง", "แข็งแรง"];
  const strengthColors = ["bg-muted", "bg-red-500", "bg-yellow-500", "bg-green-500"];

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setSubmitError("");
    try {
      const response = await client.post(
        "/user/change-password",
        {
          userCode,
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        },
        { headers: dataConfig().headers }
      );

      if (response.data.success) {
        toast.success("เปลี่ยนรหัสผ่านสำเร็จ", {
          description: "กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่",
        });
        resetForm();
        onSuccess();
      } else {
        setSubmitError(response.data.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
      }
    } catch (err: unknown) {
      console.error("Change password error:", err);
      const errorMessage =
        err instanceof Error && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setSubmitError(errorMessage || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  };

  const resetForm = () => {
    form.reset();
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setSubmitError("");
  };

  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <ShieldCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <DialogTitle className="text-lg">เปลี่ยนรหัสผ่าน</DialogTitle>
              <DialogDescription className="text-sm">
                รหัสผ่านของคุณหมดอายุแล้ว กรุณาตั้งรหัสผ่านใหม่
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4 py-2">
          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Current Password */}
          <Controller
            name="currentPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>รหัสผ่านปัจจุบัน</FieldLabel>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...field}
                    id={field.name}
                    type={showCurrent ? "text" : "password"}
                    placeholder="กรอกรหัสผ่านปัจจุบัน"
                    className="pl-10 pr-10 h-11"
                    disabled={isSubmitting}
                    autoFocus
                    aria-invalid={fieldState.invalid}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                รหัสผ่านใหม่
              </span>
            </div>
          </div>

          {/* New Password */}
          <Controller
            name="newPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>รหัสผ่านใหม่</FieldLabel>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...field}
                    id={field.name}
                    type={showNew ? "text" : "password"}
                    placeholder="กรอกรหัสผ่านใหม่"
                    className="pl-10 pr-10 h-11"
                    disabled={isSubmitting}
                    aria-invalid={fieldState.invalid}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}

                {/* Strength + Rules */}
                {watchedNew.length > 0 && (
                  <div className="space-y-2.5 mt-1">
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={cn(
                              "h-1.5 flex-1 rounded-full transition-colors",
                              strength >= level ? strengthColors[strength] : "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                      {strength > 0 && (
                        <p className={cn(
                          "text-xs",
                          strength === 1 && "text-red-500",
                          strength === 2 && "text-yellow-600",
                          strength === 3 && "text-green-600"
                        )}>
                          ความแข็งแรง: {strengthLabels[strength]}
                        </p>
                      )}
                    </div>
                    <ul className="space-y-1">
                      {PASSWORD_RULES.map((rule, idx) => {
                        const passed = rule.test(watchedNew);
                        return (
                          <li key={idx} className={cn(
                            "flex items-center gap-2 text-xs transition-colors",
                            passed ? "text-green-600" : "text-muted-foreground"
                          )}>
                            {passed
                              ? <CircleCheck className="h-3.5 w-3.5 shrink-0" />
                              : <CircleX className="h-3.5 w-3.5 shrink-0" />}
                            {rule.label}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </Field>
            )}
          />

          {/* Confirm Password */}
          <Controller
            name="confirmPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>ยืนยันรหัสผ่านใหม่</FieldLabel>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...field}
                    id={field.name}
                    type={showConfirm ? "text" : "password"}
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    className={cn(
                      "pl-10 pr-10 h-11",
                      confirmTouched && watchedConfirm.length > 0 &&
                        (isPasswordMatch
                          ? "border-green-500 focus-visible:ring-green-500"
                          : "border-red-500 focus-visible:ring-red-500")
                    )}
                    disabled={isSubmitting}
                    aria-invalid={fieldState.invalid}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                {isPasswordMatch && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CircleCheck className="h-3.5 w-3.5" />
                    รหัสผ่านตรงกัน
                  </p>
                )}
              </Field>
            )}
          />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !form.formState.isValid}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              "เปลี่ยนรหัสผ่าน"
            )}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}