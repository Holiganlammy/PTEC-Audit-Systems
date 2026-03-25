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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Field, FieldLabel } from "@/components/ui/field";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { cn } from "@/lib/utils";

interface Role {
  roleId: number;
  roleName: string;
}

interface User {
  UserID: string;
  UserCode: string;
  Fullname: string;
  Position: string;
  BranchName: string;
}

interface AddPermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Role[];
  onAdded: () => void;
}

export default function AddPermissionModal({
  open,
  onOpenChange,
  roles,
  onAdded,
}: AddPermissionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [openUserSelect, setOpenUserSelect] = useState(false);

  const [formData, setFormData] = useState({
    userId: "",
    userCode: "",
    roleId: "",
  });

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!open) return;

      try {
        setIsLoadingUsers(true);
        const response = await client.get("/users", {
          headers: dataConfig().headers,
        });

        if (Array.isArray(response.data)) {
          setUsers(response.data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("ไม่สามารถโหลดรายชื่อผู้ใช้ได้");
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [open]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.userId || !formData.roleId) {
      toast.error("กรุณาเลือกผู้ใช้และ Role");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        userId: parseInt(formData.userId),
        userCode: formData.userCode,
        roleId: parseInt(formData.roleId),
        createdBy: 410, // TODO: Get from session
      };

      console.log("📤 Creating permission:", payload);

      await client.post("/audit-user-roles", payload, {
        headers: dataConfig().headers,
      });

      toast.success("เพิ่ม Permission สำเร็จ");

      // Reset form
      setFormData({
        userId: "",
        userCode: "",
        roleId: "",
      });

      onAdded();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error creating permission:", error);

      const errorMsg =
        error instanceof Error && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || "ไม่สามารถเพิ่ม Permission ได้"
          : "ไม่สามารถเพิ่ม Permission ได้";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedUserText = () => {
    if (!formData.userId) return "เลือกผู้ใช้";
    const user = users.find((u) => u.UserID === formData.userId);
    return user ? `${user.Fullname} (${user.UserCode})` : "เลือกผู้ใช้";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>เพิ่ม Permission</DialogTitle>
          <DialogDescription>
            กำหนดสิทธิ์การเข้าถึงระบบ Audit ให้กับผู้ใช้
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Selection */}
          <Field>
            <FieldLabel>
              ผู้ใช้ <span className="text-red-500">*</span>
            </FieldLabel>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openUserSelect}
                    className="w-full justify-between"
                  >
                    {getSelectedUserText()}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="ค้นหาผู้ใช้..." />
                    <CommandList>
                      <CommandEmpty>ไม่พบข้อมูลผู้ใช้</CommandEmpty>
                      <CommandGroup>
                        {users.map((user) => (
                          <CommandItem
                            key={user.UserID}
                            value={`${user.Fullname} ${user.UserCode} ${user.Position}`}
                            onSelect={() => {
                              setFormData({
                                ...formData,
                                userId: user.UserID,
                                userCode: user.UserCode,
                              });
                              setOpenUserSelect(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.userId === user.UserID
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{user.Fullname}</span>
                              <span className="text-xs text-muted-foreground">
                                {user.UserCode} - {user.Position} ({user.BranchName})
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </Field>

          {/* Role Selection */}
          <Field>
            <FieldLabel>
              Role <span className="text-red-500">*</span>
            </FieldLabel>
            <Select
              value={formData.roleId}
              onValueChange={(value) =>
                setFormData({ ...formData, roleId: value })
              }
            >
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