"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller ,useForm } from "react-hook-form";
import * as z from "zod";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useState, useEffect, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye,
  EyeOff,
  Loader2,
  User,
  Lock,
  Mail,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { MFADialog } from "./components/MFAConfirm";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";

const formSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(10, "Username must be at most 10 characters.")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores."
    ),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export default function LoginPage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const redirectPath = redirectParam?.startsWith('/') ? redirectParam : '/home';
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // MFA Dialog State
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [mfaUserCode, setMfaUserCode] = useState("");

  // OTP Login State (OTP Tab - ไม่ใช่ MFA)
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Check for errors from URL
  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "SessionExpired") {
      toast.error("เซสชันหมดอายุ", {
        description: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
      });
    }
  }, [searchParams]);

  // Countdown timer for OTP tab
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setError("");
    setIsLoading(true);

    try {
      const response = await client.post('/login', {
        loginname: data.username,
        password: data.password,
      },{ headers: dataConfig().headers});

      const result = response.data;
      console.log("Login response:", result);

      // เช็ค error ก่อน
      if (!result.success) {
        throw new Error(result.message || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }

      if (result.request_Mfa === true) {
        // Show MFA Dialog
        setMfaUserCode(result.userCode);
        setShowMFADialog(true);
        setError("");
        toast.success("รหัส OTP ถูกส่งไปที่อีเมลของคุณแล้ว", {
          description: result.message,
        });
      } else if (result.success && result.access_token) {
        // Trusted Device - Login directly
        await handleLoginSuccess(result);
      } else {
        throw new Error(result.message || "เข้าสู่ระบบไม่สำเร็จ");
      }
    } catch (err) {
      console.error("Login error:", err);
      const errorMessage = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setError(errorMessage);
      toast.error("เข้าสู่ระบบไม่สำเร็จ", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async (data: {
    access_token: string;
    user: object;
  }) => {
    try {
      const signInResult = await signIn("credentials", {
        redirect: false,
        responseCondition: 'pass',
        responseLogin: JSON.stringify(data),
      });

      if (signInResult?.error) {
        throw new Error("เข้าสู่ระบบไม่สำเร็จ");
      }

      toast.success("เข้าสู่ระบบสำเร็จ");
      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      console.error("Sign in error:", err);
      toast.error("เข้าสู่ระบบไม่สำเร็จ");
    }
  };


  const handleMFACancel = () => {
    setShowMFADialog(false);
    setMfaUserCode("");
    form.reset();
  };

  // Handle Send OTP (for OTP tab)
  const handleSendOTP = async () => {
    setError("");
    setOtpLoading(true);

    try {
      const response = await client.post('/send-otp',{ email },{
        headers: dataConfig().headers
      });

      if (!response.data.ok) {
        const errorData = response.data;
        throw new Error(errorData.message || "ไม่พบอีเมลในระบบ");
      }

      setOtpSent(true);
      setCountdown(120);
      setError("");
      toast.success(`รหัส OTP ถูกส่งไปที่ ${email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle OTP Login (for OTP tab)
  const handleOTPLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await client.post(`/verify-otp`,{ email, otp },
        {
          headers: dataConfig().headers
        }
      );

      if (!response.data.ok) {
        const errorData = response.data;
        throw new Error(errorData.message || "รหัส OTP ไม่ถูกต้อง");
      }

      const data = response.data;
      const result = await signIn("credentials", {
        response: JSON.stringify(data),
        redirect: false,
      });

      if (result?.error) throw new Error("เข้าสู่ระบบไม่สำเร็จ");

      toast.success("เข้าสู่ระบบสำเร็จ");
      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* ✅ MFA Dialog */}
      <MFADialog
        open={showMFADialog}
        onOpenChange={setShowMFADialog}
        userCode={mfaUserCode}
        onSuccess={handleLoginSuccess}
        onCancel={handleMFACancel}
        redirectPath={redirectPath}
      />

      {/* Main Login UI */}
      <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-black p-4">
        <Card className="w-full max-w-md border dark:border-white/10 shadow-sm dark:bg-zinc-950">
          <CardHeader className="space-y-4 pb-8">

            {/* Title */}
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-black dark:text-white">
                PTEC Audit System
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                ระบบตรวจสอบภายใน
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="password">รหัสผ่าน</TabsTrigger>
                <TabsTrigger value="otp">OTP</TabsTrigger>
              </TabsList>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Password Login Tab */}
              <TabsContent value="password" className="space-y-4 mt-0">
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FieldGroup>
                    <Controller
                      name="username"
                      control={form.control}
                      render={({ field , fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="username">ชื่อผู้ใช้</FieldLabel>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                              id="username"
                              type="text"
                              placeholder="กรอกชื่อผู้ใช้"
                              {...field}
                              disabled={isLoading}
                              className="pl-9 h-11"
                              autoComplete="username"
                            />
                          </div>
                          {fieldState.error && (
                            <p className="text-sm text-red-600 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </Field>
                      )
                    }
                    />

                    <Controller
                      name="password"
                      control={form.control}
                      render={({ field , fieldState }) => (
                        <Field>
                          <FieldLabel htmlFor="password">รหัสผ่าน</FieldLabel>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="กรอกรหัสผ่าน"
                              {...field}
                              disabled={isLoading}
                              className="pl-9 pr-9 h-11"
                              autoComplete="current-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          {fieldState.error && (
                            <p className="text-sm text-red-600 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </Field>
                        )
                      }
                    />

                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded" />
                        <span className="text-zinc-600 dark:text-zinc-400">
                          จดจำฉันไว้
                        </span>
                      </label>

                      <a
                        href="/forgot-password"
                        className="text-black dark:text-white hover:underline"
                      >
                        ลืมรหัสผ่าน?
                      </a>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          กำลังเข้าสู่ระบบ...
                        </>
                      ) : (
                        "เข้าสู่ระบบ"
                      )}
                    </Button>
                  </FieldGroup>
                </form>
              </TabsContent>

              {/* OTP Login Tab */}
              <TabsContent value="otp" className="space-y-4 mt-0">
                {!otpSent ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendOTP();
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="email">อีเมล</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="example@ptec.co.th"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={otpLoading}
                          className="pl-9 h-11"
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200"
                      disabled={otpLoading || !email}
                    >
                      {otpLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          กำลังส่ง OTP...
                        </>
                      ) : (
                        "ส่งรหัส OTP"
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleOTPLogin} className="space-y-4">
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-lg border dark:border-zinc-800">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        รหัส OTP ถูกส่งไปที่{" "}
                        <strong className="text-black dark:text-white">
                          {email}
                        </strong>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="otp">รหัส OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => {
                          const value = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6);
                          setOtp(value);
                        }}
                        required
                        maxLength={6}
                        disabled={isLoading}
                        className="h-12 text-center text-xl tracking-widest font-mono"
                        autoComplete="one-time-code"
                      />
                      {countdown > 0 ? (
                        <p className="text-xs text-center text-zinc-500">
                          หมดอายุใน {Math.floor(countdown / 60)}:
                          {(countdown % 60).toString().padStart(2, "0")}
                        </p>
                      ) : (
                        <p className="text-xs text-center text-red-600">
                          รหัส OTP หมดอายุแล้ว
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Button
                        type="submit"
                        className="w-full h-11 bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200"
                        disabled={
                          isLoading || otp.length !== 6 || countdown === 0
                        }
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
                        variant="ghost"
                        className="w-full"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp("");
                          setError("");
                          setCountdown(0);
                        }}
                        disabled={countdown > 110}
                      >
                        {countdown > 110
                          ? `ส่ง OTP ใหม่ (${120 - countdown}s)`
                          : "ส่งรหัส OTP ใหม่"}
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            {/* Footer */}
            <div className="pt-4 border-t dark:border-zinc-800">
              <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
                ติดปัญหา?{" "}
                <a
                  href="mailto:it@ptec.co.th"
                  className="text-black dark:text-white hover:underline"
                >
                  ติดต่อฝ่าย IT
                </a>
              </p>
            </div>
          </CardContent>

          <div className="border-t dark:border-zinc-800 px-6 py-4 bg-zinc-50 dark:bg-zinc-950/50">
            <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
              © 2025 Pure Thai Energy Co., Ltd.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}