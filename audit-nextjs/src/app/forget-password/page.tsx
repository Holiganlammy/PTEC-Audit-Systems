// app/(auth)/forgot-password/page.tsx
// Version: 1.0.0 | Date: 2025-05-19 | Updated: Initial creation
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { passwordResetApi } from "@/lib/api/password-reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email.trim()) {
      setError("กรุณากรอกอีเมล");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }

    try {
      setLoading(true);
      const result = await passwordResetApi.requestReset(email);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || "ไม่พบอีเมลนี้ในระบบ");
      }
    } catch (err: unknown) {
      console.error("Failed to request password reset:", err);
      const errorMessage =
        err instanceof Error && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setError(errorMessage || "ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 dark:border dark:border-slate-800">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/login">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <CardTitle className="text-2xl font-bold">ลืมรหัสผ่าน</CardTitle>
          </div>
          <CardDescription className="text-sm">
            กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับรีเซ็ตรหัสผ่าน
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="test@rpcthai.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังส่งอีเมล...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    ส่งลิงก์รีเซ็ตรหัสผ่าน
                  </>
                )}
              </Button>

              <div className="text-center text-sm">
                <Link href="/login" className="text-primary hover:underline">
                  กลับไปหน้าเข้าสู่ระบบ
                </Link>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center py-4">
                <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  ส่งอีเมลเรียบร้อยแล้ว!
                </h3>
                <p className="text-sm text-muted-foreground">
                  เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยัง
                </p>
                <p className="text-sm font-medium mt-1">{email}</p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  หมายเหตุ:
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1.5 list-disc list-inside">
                  <li>
                    ลิงก์จะหมดอายุใน <strong>30 นาที</strong>
                  </li>
                  <li>ตรวจสอบโฟลเดอร์ Spam/Junk หากไม่พบอีเมล</li>
                  <li>สามารถขอส่งใหม่ได้หากไม่ได้รับอีเมล</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSuccess(false);
                    setEmail("");
                  }}
                  className="flex-1"
                >
                  ส่งอีกครั้ง
                </Button>
                <Button
                  onClick={() => router.push("/login")}
                  className="flex-1"
                >
                  กลับไปเข้าสู่ระบบ
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}