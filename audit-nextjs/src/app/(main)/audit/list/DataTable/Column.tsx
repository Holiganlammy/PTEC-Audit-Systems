"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Status color config (key = audit_status_id)
const statusColorConfig: Record<number, string> = {
  1: "bg-blue-100 text-blue-800",
  2: "bg-green-100 text-green-800",
};

export const createAuditListColumns = (onDelete: (jobId: number) => void): ColumnDef<AuditList>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex justify-center items-center w-8">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value: boolean) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center items-center w-8">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: "jobNo",
    id: "jobNo",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold text-sm"
        >
          Job No
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="font-medium text-primary">
        {row.getValue("jobNo")}
      </div>
    ),
  },
  {
    accessorKey: "branchName",
    header: "สาขา",
    cell: ({ row }) => (
      <div className="text-sm">
        {row.getValue("branchName") || "-"}
      </div>
    ),
  },
  {
    accessorKey: "auditDate",
    id: "auditDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold"
        >
          Audit Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = row.getValue("auditDate") as string;
      return (
        <div className="text-sm">
          {date ? format(new Date(date), "dd/MM/yyyy", { locale: th }) : "-"}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    id: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold"
        >
          Status
        </Button>
      )
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as number;
      const statusInfo = row.original.statusInfo;
      const label = statusInfo?.statusName || (status === 2 ? "ดำเนินการเสร็จสิ้น" : "อยู่ระหว่างดำเนินการ");
      const color = statusColorConfig[status] || "bg-gray-100 text-gray-800";
      return (
        <Badge className={color}>
          {label}
        </Badge>
      );
    },
  },
  {
    // ใช้ accessorFn แทน accessorKey สำหรับ nested object
    accessorFn: (row) => row.auditor?.userCode,
    id: "auditorCode",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold text-sm"
        >
          Auditor
        </Button>
      )
    },
    cell: ({ row }) => {
      const auditor = row.original.auditor;
      return (
        <div className="text-sm">
          {auditor ? (
            <div className="flex flex-col">
              <span className="font-medium">{auditor.userCode}</span>
              <span className="text-xs text-muted-foreground">
                {auditor.fullname}
              </span>
            </div>
          ) : (
            "-"
          )}
        </div>
      );
    },
  },
  {
    // ใช้ accessorFn สำหรับ District Manager
    accessorFn: (row) => row.districtManager?.userCode,
    id: "districtManagerCode",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold"
        >
          ผู้จัดการเขต
        </Button>
      )
    },
    cell: ({ row }) => {
      const districtManager = row.original.districtManager;
      return (
        <div className="text-sm">
          {districtManager ? (
            <div className="flex flex-col">
              <span className="font-medium">{districtManager.userCode}</span>
              <span className="text-xs text-muted-foreground">
                {districtManager.fullname}
              </span>
            </div>
          ) : (
            "-"
          )}
        </div>
      );
    },
  },
  {
    // ใช้ accessorFn สำหรับ Branch Manager
    accessorFn: (row) => row.branchManager?.userCode,
    id: "branchManagerCode",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold"
        >
          ผู้จัดการสาขา
        </Button>
      )
    },
    cell: ({ row }) => {
      const branchManager = row.original.branchManager;
      return (
        <div className="text-sm">
          {branchManager ? (
            <div className="flex flex-col">
              <span className="font-medium">{branchManager.userCode}</span>
              <span className="text-xs text-muted-foreground">
                {branchManager.fullname}
              </span>
            </div>
          ) : (
            "-"
          )}
        </div>
      );
    },
  },
  {
    // ใช้ accessorFn สำหรับ Created By
    accessorFn: (row) => row.createdByUser?.userCode,
    id: "createdByCode",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold"
        >
          ผู้ทำรายการ
        </Button>
      )
    },
    cell: ({ row }) => {
      const createdBy = row.original.createdByUser;
      return (
        <div className="text-sm">
          {createdBy ? (
            <div className="flex flex-col">
              <span className="font-medium">{createdBy.userCode}</span>
              <span className="text-xs text-muted-foreground">
                {createdBy.fullname}
              </span>
            </div>
          ) : (
            "-"
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    id: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold"
        >
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as string;
      return (
        <div className="text-sm text-muted-foreground">
          {date ? format(new Date(date), "dd/MM/yyyy HH:mm", { locale: th }) : "-"}
        </div>
      );
    },
  },
    {
    accessorKey: "updatedAt",
    id: "updatedAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold"
        >
          Updated At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = row.getValue("updatedAt") as string;
      return (
        <div className="text-sm text-muted-foreground">
          {date ? format(new Date(date), "dd/MM/yyyy HH:mm", { locale: th }) : "-"}
        </div>
      );
    },
  },
 {
    id: "actions",
    header: ({ column }) => (
      <div className="text-[13px] 3xl:text-sm text-center">การจัดการ</div>
    ),
    cell: ({ row }) => {
      const AuditList = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 mx-auto">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/audit/edit_document?jobNo=${AuditList.jobNo}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => onDelete(AuditList.jobId)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Audit Jobs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]