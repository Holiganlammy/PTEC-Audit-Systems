// components/auth/mfa-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Shield, Mail } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { zodResolver } from "@hookform/resolvers/zod"
import client from "@/lib/axios/interceptors";
import { useRouter } from "next/navigation";

interface MFADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userCode: string;
  onSuccess: (data: { access_token: string; user: object }) => void;
  onCancel: () => void;
  redirectPath: string;
}

const formSchema = z.object({
  otp: z.string().min(6, "กรุณากรอกรหัส OTP ให้ครบ 6 หลัก").max(6, "กรุณากรอกรหัส OTP ให้ครบ 6 หลัก"),
  trustDevice: z.boolean().optional(),
});

export function MFADialog({
  open,
  onOpenChange,
  userCode,
  onSuccess,
  onCancel,
  redirectPath
}: MFADialogProps) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      otp: "",
      trustDevice: true,
    },
  });

  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [mfaError, setMfaError] = useState("");

  // Countdown timer
  useEffect(() => {
    if (countdown > 0 && open) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, open]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      form.reset();
      setError("");
      setCountdown(300);
    }
  }, [open, form]);

  // Handle Verify OTP
  const handleVerifyOTP = async (value: { otp: string; trustDevice?: boolean }) => {
    setError("");
    setIsLoading(true);

    try {
      const response = await client.post(
        `/verify-otp`,
        {
          usercode: userCode,
          otpCode: value.otp,
          trustDevice: value.trustDevice,
        }
      );

      if (response.data.error === "OTP_INVALID") {
        setMfaError("OTP ไม่ถูกต้อง หรือหมดอายุ");
          
        return;
      }
      console.log("MFA verify response:", response.data);
      if (!response.data.success) {
        throw new Error(response.data.message || "รหัส OTP ไม่ถูกต้อง");
      }

      // Sign in with NextAuth
      const signInResult = await signIn("credentials", {
        response: JSON.stringify(response.data),
        redirect: false,
      });

      console.log("SignIn result:", signInResult);

      if (signInResult?.ok === true && !signInResult?.error) {
        toast.success("เข้าสู่ระบบสำเร็จ");
        console.log("Redirecting to:", redirectPath);
        onOpenChange(false);
        
        // Delay redirect slightly to ensure dialog closes and state updates
        setTimeout(() => {
          router.push(redirectPath);
          router.refresh();
        }, 100);
      } else {
        throw new Error(signInResult?.error || "เข้าสู่ระบบไม่สำเร็จ");
      }
    } catch (err) {
      console.error("MFA verification error:", err);
      const errorMessage = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setError(errorMessage);
      toast.error("ยืนยัน OTP ไม่สำเร็จ", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOTP = async () => {
    setError("");
    setIsResending(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/resend-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usercode: userCode,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "ไม่สามารถส่ง OTP ได้");
      }

      form.setValue("otp", "");
      setCountdown(300); // Reset to 5 minutes
      toast.success("รหัส OTP ใหม่ถูกส่งแล้ว");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setError(errorMessage);
      toast.error("ส่ง OTP ไม่สำเร็จ", {
        description: errorMessage,
      });
    } finally {
      setIsResending(false);
    }
  };

  // Handle Cancel
  const handleCancel = () => {
    form.reset();
    setError("");
    setCountdown(0);
    onCancel();
    onOpenChange(false);
  };

  // Format countdown time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-white dark:text-black" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">ยืนยันตัวตน</DialogTitle>
          <DialogDescription className="text-center">
            กรุณากรอกรหัส OTP ที่ส่งไปยังอีเมลของคุณ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info Alert */}
          <Alert className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <Mail className="h-4 w-4" />
            <AlertDescription>
              รหัส OTP ถูกส่งไปยังอีเมลของผู้ใช้{" "}
              <strong className="text-black dark:text-white">{userCode}</strong>
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* OTP Form */}
          <form onSubmit={form.handleSubmit(handleVerifyOTP)} className="space-y-4">
            <FieldGroup className="space-y-2">
              <Controller
                name="otp"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="mfa-otp">รหัส OTP</FieldLabel>
                    <Input
                      id="mfa-otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        field.onChange(value);
                      }}
                      required
                      maxLength={6}
                      disabled={isLoading || countdown === 0}
                      className="h-12 text-center text-xl tracking-widest font-mono"
                      autoComplete="one-time-code"
                      autoFocus
                    />
                    {countdown > 0 ? (
                      <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
                        หมดอายุใน <strong>{formatTime(countdown)}</strong>
                      </p>
                    ) : (
                        <p className="text-xs text-center text-red-600 font-medium">
                          รหัส OTP หมดอายุแล้ว
                        </p>
                      )}
                      {fieldState.error && (
                        <FieldError>{fieldState.error.message}</FieldError>
                      )}
                    </Field>
                  )}
                />
            </FieldGroup>
            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full h-11 bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200"
                disabled={isLoading || form.watch("otp").length !== 6 || countdown === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังตรวจสอบ...
                  </>
                ) : (
                  "ยืนยัน OTP"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendOTP}
                disabled={isResending || countdown > 280}
              >
                {countdown > 280 ? (
                  `ส่ง OTP ใหม่ (${300 - countdown}s)`
                ) : isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังส่ง...
                  </>
                ) : (
                  "ส่งรหัส OTP ใหม่"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-zinc-500"
                onClick={handleCancel}
                disabled={isLoading || isResending}
              >
                ยกเลิก
              </Button>
            </div>
            <FieldGroup>
              <Controller
                  name="trustDevice"
                  control={form.control}
                  defaultValue={false}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-black has-[[aria-checked=true]]:bg-gray-200 dark:has-[[aria-checked=true]]:border-gray-400 dark:has-[[aria-checked=true]]:bg-gray-950">
                      <Checkbox
                        id="trustDevice"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-black dark:data-[state=checked]:bg-black"
                      />
                      <div className="grid gap-1.5 font-normal">
                        <p className="text-sm leading-none font-medium">
                          Trust Device
                        </p>
                        <p className="text-muted-foreground text-sm">
                          เลือกตัวเลือกนี้หากคุณต้องการให้ระบบจดจำอุปกรณ์นี้เพื่อไม่ต้องยืนยัน MFA ในครั้งถัดไป
                        </p>
                      </div>
                    </FieldLabel>
                  </Field>
                )}
              />
            </FieldGroup>
          </form>

          {/* Help Text */}
          <div className="pt-2 border-t dark:border-zinc-800">
            <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
              ไม่ได้รับรหัส OTP?{" "}
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isResending || countdown > 280}
                className="text-black dark:text-white hover:underline disabled:opacity-50 disabled:no-underline"
              >
                คลิกที่นี่เพื่อส่งใหม่
              </button>
            </p>
          </div>
        </div>
        {mfaError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm font-medium">{mfaError}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}