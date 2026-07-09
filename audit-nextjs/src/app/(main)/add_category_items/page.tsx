// app/settings/categories/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { auditCategoriesApi, type AuditCategory } from "@/lib/api/audit-categories";
import { getErrorMessage } from "@/lib/utils";
import AddCategoryDialog from "./components/Add_Category_Dialog";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<AuditCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AuditCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<AuditCategory | null>(null);
  useEffect(() => {
    fetchCategories(page, limit);
  }, [page, limit]);

  const fetchCategories = async (currentPage: number, currentLimit: number) => {
    try {
      setLoading(true);
      const result = await auditCategoriesApi.getAll(currentPage, currentLimit);
      setCategories(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error("Failed to load categories", {
        description: getErrorMessage(error, "Failed to load categories"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category?: AuditCategory) => {
    setEditingCategory(category ?? null);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    try {
      await auditCategoriesApi.delete(deletingCategory.categoryItemId, 1); // TODO: Get actual user ID
      toast.success("Category deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingCategory(null);
      // ถ้าหน้าปัจจุบันไม่มีข้อมูลแล้ว ให้ถอยกลับ 1 หน้า
      const newPage = categories.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      if (newPage === page) fetchCategories(page, limit);
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast.error("Failed to delete category", {
        description: getErrorMessage(error, "Failed to delete category"),
      });
    }
  };

  const totalPages = Math.ceil(total / limit);

  const filteredCategories = categories.filter(
    (cat) =>
      cat.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.categoryCode?.toString().includes(searchTerm)
  );

  if (loading) {
    return <CategoriesPageSkeleton />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            จัดการหมวดหมู่
          </h1>
          <p className="text-muted-foreground">
            จัดการหมวดหมู่รายการตรวจสอบ
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มหมวดหมู่
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหาหมวดหมู่..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">รหัส</TableHead>
              <TableHead>ชื่อหมวดหมู่</TableHead>
              <TableHead>คำอธิบาย</TableHead>
              <TableHead>ประเภทการตรวจสอบ</TableHead>
              <TableHead className="w-[100px]">สถานะ</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">ไม่พบข้อมูล</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category) => (
                <TableRow key={category.categoryItemId}>
                  <TableCell className="font-medium">
                    {category.categoryCode || "-"}
                  </TableCell>
                  <TableCell>{category.categoryName}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {category.description || "-"}
                  </TableCell>
                  <TableCell>
                    {category.positionType ? (
                      <Badge variant="outline">{category.positionType}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={category.active ? "secondary" : "destructive"}
                    >
                      {category.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleOpenDialog(category)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          แก้ไข
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setDeletingCategory(category);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          ลบ
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <AddCategoryDialog
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingCategory(null);
        }}
        editingCategory={editingCategory}
        onSuccess={() => fetchCategories(page, limit)}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            แสดง {categories.length === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, total)} จาก {total} รายการ
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">แถว/หน้า</span>
            <Select
              value={String(limit)}
              onValueChange={(val) => {
                setLimit(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            หน้า {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AddCategoryDialog
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingCategory(null);
        }}
        editingCategory={editingCategory}
        onSuccess={() => fetchCategories(page, limit)}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่{" "}
              <strong>{deletingCategory?.categoryName}</strong>?
              <br />
              การลบนี้จะทำให้หมวดหมู่ถูกปิดการใช้งาน (Soft Delete)
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingCategory(null);
              }}
            >
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              ลบหมวดหมู่
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoriesPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-10 w-80" />
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}