"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { DataTable } from "@/components/DataTable";
import AddPermissionModal from "./component/Addpermission";
import EditPermissionModal from "./component/Editpermission";
import { createPermissionColumns, UserRole } from "./component/Column";

interface Role {
  roleId: number;
  roleName: string;
}

export default function PermissionsPage() {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("1");
  const [pageIndex, setPageIndex] = useState(0); // 0-based
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedUserRole, setSelectedUserRole] = useState<UserRole | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UserRole | null>(null);

  // Fetch roles for filter dropdown
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await client.get("/audit-user-roles/roles", {
          headers: dataConfig().headers,
        });
        if (response.data.success) {
          setRoles(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching roles:", error);
        toast.error("ไม่สามารถโหลดรายการ Role ได้");
      }
    };
    fetchRoles();
  }, []);

  const fetchUserRoles = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: { page: number; limit: number; active: string; roleId?: string } = {
        page: pageIndex + 1, // API is 1-based
        limit: pageSize,
        active: activeFilter,
      };
      if (roleFilter !== "all") {
        params.roleId = roleFilter;
      }
      const response = await client.get("/audit-user-roles", {
        params,
        headers: dataConfig().headers,
      });
      if (response.data.success) {
        setUserRoles(response.data.data);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error("Error fetching user roles:", error);
      toast.error("ไม่สามารถโหลดข้อมูล Permissions ได้");
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, pageSize, roleFilter, activeFilter]);

  useEffect(() => {
    fetchUserRoles();
  }, [fetchUserRoles]);

  const handleEdit = (userRole: UserRole) => {
    setSelectedUserRole(userRole);
    setOpenEditModal(true);
  };

  const handleDelete = (userRole: UserRole) => {
    setPendingDelete(userRole);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await client.delete(`/audit-user-roles/${pendingDelete.userRoleId}`, {
        params: { updatedBy: 410 },
        headers: dataConfig().headers,
      });
      toast.success("ปิดใช้งาน Permission สำเร็จ");
      fetchUserRoles();
    } catch (error) {
      console.error("Error deleting user role:", error);
      toast.error("ไม่สามารถปิดใช้งาน Permission ได้");
    } finally {
      setPendingDelete(null);
    }
  };

  const handleReactivate = async (userRole: UserRole) => {
    try {
      await client.post(
        `/audit-user-roles/${userRole.userRoleId}/reactivate`,
        { updatedBy: 410 }, // TODO: Get from session
        { headers: dataConfig().headers }
      );
      toast.success("เปิดใช้งาน Permission สำเร็จ");
      fetchUserRoles();
    } catch (error) {
      console.error("Error reactivating user role:", error);
      const errorMsg =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        "ไม่สามารถเปิดใช้งาน Permission ได้";
      toast.error(errorMsg);
    }
  };

  const columns = createPermissionColumns(handleEdit, handleDelete, handleReactivate);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">จัดการ Permissions</h1>
            <p className="text-muted-foreground mt-1">กำหนดสิทธิ์การเข้าถึงระบบ Audit</p>
          </div>
          <Button onClick={() => setOpenAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            เพิ่ม Permission
          </Button>
        </div>

        {/* External filters (Role + Active status) */}
        <div className="flex flex-wrap gap-2">
          <Select
            value={roleFilter}
            onValueChange={(v) => { setRoleFilter(v); setPageIndex(0); }}
          >
            <SelectTrigger className="w-50">
              <SelectValue placeholder="กรอง Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.roleId} value={role.roleId.toString()}>
                  {role.roleName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={activeFilter}
            onValueChange={(v) => { setActiveFilter(v); setPageIndex(0); }}
          >
            <SelectTrigger className="w-37.5">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Active</SelectItem>
              <SelectItem value="0">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchUserRoles}
            disabled={isLoading}
          >
            <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={userRoles}
        searchKeys={["userCode", "fullname", "email"]}
        searchPlaceholder="ค้นหา User Code, ชื่อ, Email..."
        pagination={{ pageIndex, pageSize }}
        onPageChange={setPageIndex}
        onPageSizeChange={(size) => { setPageSize(size); setPageIndex(0); }}
        Loading={isLoading}
        pageCount={Math.ceil(total / pageSize)}
        totalRows={total}
      />

      <AddPermissionModal
        open={openAddModal}
        onOpenChange={setOpenAddModal}
        roles={roles}
        onAdded={fetchUserRoles}
      />

      <EditPermissionModal
        open={openEditModal}
        onOpenChange={setOpenEditModal}
        userRole={selectedUserRole}
        roles={roles}
        onUpdated={fetchUserRoles}
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการปิดใช้งาน</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการปิดใช้งาน Permission ของ{" "}
              <span className="font-semibold">
                {pendingDelete?.fullname || pendingDelete?.userCode}
              </span>{" "}
              ใช่หรือไม่? สามารถเปิดใช้งานใหม่ได้ในภายหลัง
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              ปิดใช้งาน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}