// components/ChangePasswordDialog.tsx
// Version: 1.0.0 | Date: 2025-05-20 | Updated: Initial creation - Reusable Change Password Modal
"use client";

import { useState } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CircleCheck,
  CircleX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";

// ── Password Rules ──────────────────────────────────────────────────────────

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "อย่างน้อย 8 ตัวอักษร", test: (pw) => pw.length >= 8 },
  { label: "มีตัวพิมพ์เล็ก (a-z)", test: (pw) => /[a-z]/.test(pw) },
  { label: "มีตัวพิมพ์ใหญ่ (A-Z)", test: (pw) => /[A-Z]/.test(pw) },
  { label: "มีตัวเลข (0-9)", test: (pw) => /\d/.test(pw) },
  { label: "มีอักษรพิเศษ (!@#$%^&*...)", test: (pw) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw) },
];

// ── Props ───────────────────────────────────────────────────────────────────

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userCode?: string;
  onSuccess?: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function ChangePasswordDialog({
  open,
  onOpenChange,
  userCode,
  onSuccess,
}: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isNewPasswordValid = PASSWORD_RULES.every((r) => r.test(newPassword));
  const isPasswordMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = currentPassword.length > 0 && isNewPasswordValid && isPasswordMatch && !loading;

  const passedCount = PASSWORD_RULES.filter((r) => r.test(newPassword)).length;
  const strength = passedCount === 0 ? 0 : passedCount <= 2 ? 1 : passedCount <= 3 ? 2 : passedCount <= 4 ? 3 : 4;
  const strengthLabels = ["", "อ่อน", "ปานกลาง", "แข็งแรง", "แข็งแรงมาก"];
  const strengthColors = ["bg-muted", "bg-red-500", "bg-yellow-500", "bg-green-500", "bg-emerald-600"];

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setError("");
  };

  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const handleSubmit = async () => {
    setError("");

    if (!currentPassword.trim()) { setError("กรุณากรอกรหัสผ่านปัจจุบัน"); return; }
    if (!isNewPasswordValid) { setError("รหัสผ่านใหม่ไม่ตรงตามเงื่อนไข"); return; }
    if (!isPasswordMatch) { setError("รหัสผ่านใหม่ไม่ตรงกัน"); return; }
    if (currentPassword === newPassword) { setError("รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านเดิม"); return; }

    try {
      setLoading(true);
      const response = await client.post(
        "/user/change-password",
        { userCode, currentPassword, newPassword, confirmPassword },
        { headers: dataConfig().headers }
      );

      if (response.data.success) {
        toast.success("เปลี่ยนรหัสผ่านสำเร็จ");
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError(response.data.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
      }
    } catch (err: unknown) {
      console.error("Change password error:", err);
      const errorMessage =
        err instanceof Error && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(errorMessage || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">เปลี่ยนรหัสผ่าน</DialogTitle>
          <DialogDescription>กรอกรหัสผ่านปัจจุบันและตั้งรหัสผ่านใหม่</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="cp-current">รหัสผ่านปัจจุบัน</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="cp-current" type={showCurrent ? "text" : "password"} placeholder="กรอกรหัสผ่านปัจจุบัน" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="pl-10 pr-10 h-11" disabled={loading} autoFocus />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">รหัสผ่านใหม่</span></div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="cp-new">รหัสผ่านใหม่</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="cp-new" type={showNew ? "text" : "password"} placeholder="กรอกรหัสผ่านใหม่" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-10 pr-10 h-11" disabled={loading} />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {newPassword.length > 0 && (
              <div className="space-y-2.5 mt-2">
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div key={level} className={cn("h-1.5 flex-1 rounded-full transition-colors", strength >= level ? strengthColors[strength] : "bg-muted")} />
                    ))}
                  </div>
                  {strength > 0 && (
                    <p className={cn("text-xs", strength === 1 && "text-red-500", strength === 2 && "text-yellow-600", strength === 3 && "text-green-600")}>
                      ความแข็งแรง: {strengthLabels[strength]}
                    </p>
                  )}
                </div>
                <ul className="space-y-1">
                  {PASSWORD_RULES.map((rule, idx) => {
                    const passed = rule.test(newPassword);
                    return (
                      <li key={idx} className={cn("flex items-center gap-2 text-xs transition-colors", passed ? "text-green-600" : "text-muted-foreground")}>
                        {passed ? <CircleCheck className="h-3.5 w-3.5 shrink-0" /> : <CircleX className="h-3.5 w-3.5 shrink-0" />}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="cp-confirm">ยืนยันรหัสผ่านใหม่</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="cp-confirm" type={showConfirm ? "text" : "password"} placeholder="กรอกรหัสผ่านใหม่อีกครั้ง" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn("pl-10 pr-10 h-11", confirmPassword.length > 0 && (isPasswordMatch ? "border-green-500 focus-visible:ring-green-500" : "border-red-500 focus-visible:ring-red-500"))}
                disabled={loading} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !isPasswordMatch && <p className="text-xs text-red-500">รหัสผ่านไม่ตรงกัน</p>}
            {isPasswordMatch && <p className="text-xs text-green-600 flex items-center gap-1"><CircleCheck className="h-3.5 w-3.5" />รหัสผ่านตรงกัน</p>}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={loading} className="w-full sm:w-auto">ยกเลิก</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full sm:w-auto">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังบันทึก...</> : "เปลี่ยนรหัสผ่าน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}