"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export interface UserRole {
  userRoleId: number;
  userId: number;
  userCode: string;
  roleId: number;
  roleName: string;
  fullname?: string;
  email?: string;
  position?: string;
  BranchName?: string;
  createdBy: number | null;
  createdAt: string | null;
  updatedBy: number | null;
  updatedAt: string | null;
  active: number | boolean;
}

export function createPermissionColumns(
  onEdit: (userRole: UserRole) => void,
  onDelete: (userRole: UserRole) => void,
  onReactivate: (userRole: UserRole) => void
): ColumnDef<UserRole>[] {
  return [
    {
      accessorKey: "userCode",
      header: "User Code",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.userCode}</span>
      ),
    },
    {
      accessorKey: "fullname",
      header: "ชื่อ-นามสกุล",
      cell: ({ row }) => row.original.fullname || "-",
    },
    {
      accessorKey: "position",
      header: "ตำแหน่ง",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.position || "-"}
        </span>
      ),
    },
    {
      accessorKey: "roleName",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.roleName}</Badge>
      ),
    },
    {
      accessorKey: "BranchName",
      header: "สาขา",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.BranchName || "-"}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      enableHiding: true,
    },
    {
      accessorKey: "active",
      header: "สถานะ",
      cell: ({ row }) =>
        row.original.active ? (
          <Badge variant="default" className="bg-green-500">
            Active
          </Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        ),
    },
    {
      accessorKey: "createdAt",
      header: "วันที่สร้าง",
      cell: ({ row }) =>
        row.original.createdAt
          ? format(new Date(row.original.createdAt), "dd/MM/yyyy", {
              locale: th,
            })
          : "-",
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const ur = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onEdit(ur)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  แก้ไข Role
                </DropdownMenuItem>
                {ur.active ? (
                  <DropdownMenuItem
                    onClick={() => onDelete(ur)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    ปิดใช้งาน
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => onReactivate(ur)}
                    className="text-green-600 focus:text-green-600"
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    เปิดใช้งาน
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
