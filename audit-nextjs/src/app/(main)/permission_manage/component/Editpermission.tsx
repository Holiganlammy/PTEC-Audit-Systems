// ==========================================
// EditPermissionModal.tsx
// ==========================================

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
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";

interface Role {
  roleId: number;
  roleName: string;
}

interface UserRole {
  userRoleId: number;
  userId: number;
  userCode: string;
  roleId: number;
  roleName: string;
  fullname?: string;
  position?: string;
}

interface EditPermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: UserRole | null;
  roles: Role[];
  onUpdated: () => void;
}

export default function EditPermissionModal({
  open,
  onOpenChange,
  userRole,
  roles,
  onUpdated,
}: EditPermissionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState("");

  // Load user role data when modal opens
  useEffect(() => {
    if (userRole && open) {
      setSelectedRoleId(userRole.roleId.toString());
    }
  }, [userRole, open]);

  const handleSubmit = async () => {
    if (!userRole) return;

    // Validation
    if (!selectedRoleId) {
      toast.error("กรุณาเลือก Role");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        roleId: parseInt(selectedRoleId),
        updatedBy: 410, // TODO: Get from session
      };

      console.log("📤 Updating permission:", userRole.userRoleId, payload);

      await client.put(`/audit-user-roles/${userRole.userRoleId}`, payload, {
        headers: dataConfig().headers,
      });

      toast.success("อัพเดท Permission สำเร็จ");
      onUpdated();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error updating permission:", error);

      const errorMsg =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message || "ไม่สามารถอัพเดท Permission ได้";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!userRole) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>แก้ไข Permission</DialogTitle>
          <DialogDescription>
            เปลี่ยน Role ของผู้ใช้ในระบบ Audit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Info (Read-only) */}
          <Field>
            <FieldLabel>User Code</FieldLabel>
            <Input value={userRole.userCode} disabled className="bg-muted" />
          </Field>

          <Field>
            <FieldLabel>ชื่อ-นามสกุล</FieldLabel>
            <Input
              value={userRole.fullname || "-"}
              disabled
              className="bg-muted"
            />
          </Field>

          <Field>
            <FieldLabel>ตำแหน่ง</FieldLabel>
            <Input
              value={userRole.position || "-"}
              disabled
              className="bg-muted"
            />
          </Field>

          {/* Role Selection (Editable) */}
          <Field>
            <FieldLabel>
              Role <span className="text-red-500">*</span>
            </FieldLabel>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือก Role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.roleId} value={role.roleId.toString()}>
                    {role.roleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              "บันทึก"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}