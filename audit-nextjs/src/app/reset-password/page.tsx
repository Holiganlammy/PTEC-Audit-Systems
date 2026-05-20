// app/(auth)/reset-password/page.tsx
// Version: 2.0.0 | Date: 2025-05-20 | Updated: Refactor to RHF + Zod + shadcn Form
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  ShieldX,
  CircleCheck,
  CircleX,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { passwordResetApi } from "@/lib/api/password-reset";

// ── Zod Schema ──────────────────────────────────────────────────────────────

const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

const resetPasswordSchema = z
  .object({
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
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// ── Password Strength Rules ─────────────────────────────────────────────────

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "อย่างน้อย 8 ตัวอักษร", test: (pw) => pw.length >= 8 },
  { label: "มีตัวพิมพ์เล็ก (a-z)", test: (pw) => /[a-z]/.test(pw) },
  { label: "มีตัวพิมพ์ใหญ่ (A-Z)", test: (pw) => /[A-Z]/.test(pw) },
  { label: "มีตัวเลข (0-9)", test: (pw) => /\d/.test(pw) },
  { label: "มีตัวอักษรพิเศษ (!@#$%^&*)", test: (pw) => SPECIAL_CHAR_REGEX.test(pw) },
];

function PasswordStrengthIndicator({ password }: { password: string }) {
  const passedCount = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const strength =
    passedCount === 0
      ? 0
      : passedCount <= 2
        ? 1
        : passedCount <= 4
          ? 2
          : 3;
  const strengthLabels = ["", "อ่อน", "ปานกลาง", "แข็งแรง"];
  const strengthColors = [
    "bg-muted",
    "bg-red-500",
    "bg-yellow-500",
    "bg-green-500",
  ];

  if (!password) return null;

  return (
    <div className="space-y-3 mt-3">
      {/* Strength Bar */}
      <div className="space-y-1.5">
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
          <p
            className={cn(
              "text-xs",
              strength === 1 && "text-red-500",
              strength === 2 && "text-yellow-600",
              strength === 3 && "text-green-600"
            )}
          >
            ความแข็งแรง: {strengthLabels[strength]}
          </p>
        )}
      </div>

      {/* Rules Checklist */}
      <ul className="space-y-1">
        {PASSWORD_RULES.map((rule, idx) => {
          const passed = rule.test(password);
          return (
            <li
              key={idx}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors",
                passed ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {passed ? (
                <CircleCheck className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <CircleX className="h-3.5 w-3.5 shrink-0" />
              )}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // Token validation state
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");

  // Show/hide password toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Submit state
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  // ── React Hook Form ──────────────────────────────────────────────────────

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
    mode: "onChange",
  });

  const { isSubmitting } = form.formState;
  const watchedPassword = useWatch({ control: form.control, name: "newPassword" });
  const watchedConfirm = useWatch({ control: form.control, name: "confirmPassword" });
  const confirmTouched = form.formState.touchedFields.confirmPassword;
  const isPasswordMatch =
    watchedPassword === watchedConfirm && watchedConfirm.length > 0;

  // ── Validate Token on Mount ──────────────────────────────────────────────

  useEffect(() => {
    if (!token) {
      setTokenError("ไม่พบ Token กรุณาขอลิงก์รีเซ็ตรหัสผ่านใหม่");
      setValidating(false);
      return;
    }

    const validateToken = async () => {
      try {
        setValidating(true);
        const result = await passwordResetApi.validateToken(token);

        if (result.success && result.UserID) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setTokenError(result.message || "Token ไม่ถูกต้องหรือหมดอายุแล้ว");
        }
      } catch (err: unknown) {
        console.error("Failed to validate token:", err);
        setTokenValid(false);
        setTokenError("Token ไม่ถูกต้องหรือหมดอายุแล้ว");
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  // ── Form Submit ──────────────────────────────────────────────────────────

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setSubmitError("");
    try {
      const result = await passwordResetApi.resetPassword(token!, values.newPassword ,values.confirmPassword);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setSubmitError(result.message || "เกิดข้อผิดพลาด");
      }
    } catch (err: unknown) {
      console.error("Failed to reset password:", err);
      const errorMessage =
        err instanceof Error && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setSubmitError(errorMessage || "ไม่สามารถรีเซ็ตรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  // ── Loading State ────────────────────────────────────────────────────────

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-slate-900">
        <Card className="w-full max-w-md shadow-xl border-0 dark:border dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">
                กำลังตรวจสอบ Token...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Invalid Token State ──────────────────────────────────────────────────

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-slate-900 p-4">
        <Card className="w-full max-w-md shadow-xl border-0 dark:border dark:border-slate-800">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
                <ShieldX className="h-10 w-10 text-white" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-destructive">
                  ลิงก์ไม่ถูกต้องหรือหมดอายุ
                </h2>
                <p className="text-sm text-muted-foreground">
                  {tokenError || "Token อาจหมดอายุหรือถูกใช้งานไปแล้ว"}
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 w-full text-left">
                <p className="text-sm text-muted-foreground">สาเหตุที่เป็นไปได้:</p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>ลิงก์หมดอายุ (เกิน 30 นาที)</li>
                  <li>ลิงก์ถูกใช้งานแล้ว</li>
                  <li>ลิงก์ไม่ถูกต้อง</li>
                </ul>
              </div>

              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => router.push("/forgot-password")}
                  className="flex-1"
                >
                  ขอลิงก์ใหม่
                </Button>
                <Button
                  onClick={() => router.push("/login")}
                  className="flex-1"
                >
                  กลับไปเข้าสู่ระบบ
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Success State ────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-slate-900 p-4">
        <Card className="w-full max-w-md shadow-xl border-0 dark:border dark:border-slate-800">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                <ShieldCheck className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-green-700 dark:text-green-400">
                  รีเซ็ตรหัสผ่านสำเร็จ!
                </h2>
                <p className="text-sm text-muted-foreground">
                  คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...
              </p>

              <Button
                onClick={() => router.push("/login")}
                className="w-full"
              >
                เข้าสู่ระบบเลย
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Reset Password Form ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 dark:border dark:border-slate-800">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-bold">ตั้งรหัสผ่านใหม่</CardTitle>
          <CardDescription className="text-sm">
            กรอกรหัสผ่านใหม่ของคุณ
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

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
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        disabled={isSubmitting}
                        autoFocus
                        aria-invalid={fieldState.invalid}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                    <PasswordStrengthIndicator password={watchedPassword} />
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
                        placeholder="••••••••"
                        className={cn(
                          "pl-10 pr-10",
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
                        {showConfirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                    {isPasswordMatch && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CircleCheck className="h-3.5 w-3.5" />
                        รหัสผ่านตรงกัน
                      </p>
                    )}
                  </Field>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !form.formState.isValid}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "ตั้งรหัสผ่านใหม่"
                )}
              </Button>

              <div className="text-center text-sm">
                <Link href="/login" className="text-primary hover:underline">
                  กลับไปหน้าเข้าสู่ระบบ
                </Link>
              </div>
            </form>
        </CardContent>
      </Card>
    </div>
  );
}