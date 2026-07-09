// Version: 2.1.0 | Date: 2025-04-07 16:20:00 | Updated: เพิ่ม Preview Modal และ Download ให้ไฟล์ที่แนบ

"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Paperclip,
  X,
  Upload,
  Download,
  Eye,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface AMChecklistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AuditItem | null;
  onUpdated?: () => void;
}

// Helper - Get file icon
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  if (ext === 'pdf') {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  if (ext === 'xlsx' || ext === 'xls') {
    return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
    return <ImageIcon className="h-4 w-4 text-blue-500" />;
  }
  
  return <Paperclip className="h-4 w-4 text-muted-foreground" />;
};

// Helper - Check if file can preview
const canPreviewFile = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext || '');
};

// Preview Modal Component
function FilePreviewModal({
  open,
  onOpenChange,
  file,
  itemId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: { fileId: number; fileName: string } | null;
  itemId: number;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string>("");

  useEffect(() => {
    if (!open || !file) return;

    let objectUrl = "";

    client.get(`/audit-items/${itemId}/am-checklist/attachments/${file.fileId}/view`, {
        headers: dataConfig().headers,
        responseType: "blob",
      })
      .then((res) => {
        const ext = file.fileName.split('.').pop()?.toLowerCase();
        const mimeType = ext === 'pdf' ? 'application/pdf' : (res.data.type || 'application/octet-stream');
        objectUrl = URL.createObjectURL(new Blob([res.data], { type: mimeType }));
        setBlobUrl(objectUrl);
      })
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, file, itemId]);

  if (!file) return null;

  const isPdf = file.fileName.split('.').pop()?.toLowerCase() === 'pdf';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getFileIcon(file.fileName)}
            {file.fileName}
          </DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[70vh] bg-muted rounded-md overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-sm text-muted-foreground">ไม่สามารถแสดงตัวอย่างได้</p>
            </div>
          )}

          {!error && blobUrl && (
            <>
              {isPdf ? (
                <iframe
                  src={blobUrl}
                  className="w-full h-full border-0"
                  title={file.fileName}
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setError(true);
                    setIsLoading(false);
                  }}
                />
              ) : (
                <img
                  src={blobUrl}
                  alt={file.fileName}
                  className="w-full h-full object-contain"
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setError(true);
                    setIsLoading(false);
                  }}
                />
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AMChecklistModal({
  open,
  onOpenChange,
  item,
  onUpdated,
}: AMChecklistModalProps) {
  const { data: session } = useSession();
  const [status, setStatus] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [existingChecklist, setExistingChecklist] = useState<{
    status: number | null;
    detail: string | null;
    checkedBy: number | null;
    checkedAt: Date | null;
    checkedByUser?: {
      fullname: string;
      userCode: string;
    };
  } | null>(null);
  const [existingFiles, setExistingFiles] = useState<
    Array<{
      fileId: number;
      fileName: string;
      fileSize: number;
      uploadedAt: string;
    }>
  >([]);

  // Preview Modal State
  const [previewFile, setPreviewFile] = useState<{ fileId: number; fileName: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch existing checklist data
  useEffect(() => {
    if (open && item) {
      setIsLoading(true);

      Promise.all([
        client.get(`/audit-items/${item.item_id}/am-checklist`, {
          headers: dataConfig().headers,
        }),
        client.get(`/audit-items/${item.item_id}/am-checklist/attachments`, {
          headers: dataConfig().headers,
        }),
      ])
        .then(([checklistRes, filesRes]) => {
          if (checklistRes.data.success) {
            const data = checklistRes.data.data;
            setExistingChecklist(data);
            setStatus(data.status !== null ? String(data.status) : "");
            setDetail(data.detail || "");
          }

          if (filesRes.data.success) {
            setExistingFiles(filesRes.data.data);
          }
        })
        .catch((err) => {
          console.error("Error fetching AM checklist:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setStatus("");
      setDetail("");
      setExistingChecklist(null);
      setFiles([]);
      setExistingFiles([]);
    }
  }, [open, item]);

  const handlePreviewFile = (fileId: number, fileName: string) => {
    setPreviewFile({ fileId, fileName });
    setShowPreview(true);
  };

  const handleDownloadFile = async (fileId: number, fileName: string) => {
    if (!item) return;

    try {
      const response = await client.get(
        `/audit-items/${item.item_id}/am-checklist/attachments/${fileId}/download`,
        {
          headers: dataConfig().headers,
          responseType: 'blob',
        }
      );

      // สร้าง download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('ดาวน์โหลดไฟล์สำเร็จ');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('ไม่สามารถดาวน์โหลดไฟล์ได้', {
        description: getErrorMessage(error, 'ไม่สามารถดาวน์โหลดไฟล์ได้'),
      });
    }
  };

  const handleDeleteExistingFile = async (fileId: number) => {
    if (!item) return;

    try {
      await client.delete(
        `/audit-items/${item.item_id}/am-checklist/attachments/${fileId}`,
        { headers: dataConfig().headers }
      );

      setExistingFiles((prev) => prev.filter((f) => f.fileId !== fileId));
      toast.success("ลบไฟล์สำเร็จ");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("ไม่สามารถลบไฟล์ได้", {
        description: getErrorMessage(error, "ไม่สามารถลบไฟล์ได้"),
      });
    }
  };

  const handleSubmit = async () => {
    if (!item || !status) {
      toast.error("กรุณาเลือกสถานะ");
      return;
    }

    setIsSubmitting(true);
    try {
      await client.patch(
        `/audit-items/${item.item_id}/am-checklist`,
        {
          status: parseInt(status),
          detail: detail.trim() || undefined,
          checkedBy: session?.user?.UserID,
        },
        {
          headers: dataConfig().headers,
        }
      );

      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));
        formData.append("uploadedBy", String(session?.user?.UserID ?? ""));

        await client.post(
          `/audit-items/${item.item_id}/am-checklist/attachments`,
          formData,
          {
            headers: {
              ...dataConfig().headers,
              "Content-Type": "multipart/form-data",
            },
          }
        );
      }

      toast.success("บันทึก AM Checklist สำเร็จ");
      onUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating AM checklist:", error);
      toast.error("ไม่สามารถบันทึกได้", {
        description: getErrorMessage(error, "ไม่สามารถบันทึกได้"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (!item) return;

    if (!confirm("ต้องการล้างข้อมูล AM Checklist ใช่หรือไม่?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await client.delete(`/audit-items/${item.item_id}/am-checklist`, {
        headers: dataConfig().headers,
      });

      toast.success("ล้างข้อมูล AM Checklist สำเร็จ");
      onUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error clearing AM checklist:", error);
      toast.error("ไม่สามารถล้างข้อมูลได้", {
        description: getErrorMessage(error, "ไม่สามารถล้างข้อมูลได้"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checklist</DialogTitle>
            <DialogDescription>
              รายการ: <span className="font-medium text-foreground">{item.category_name}</span>
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {existingChecklist && existingChecklist.checkedBy && (
                <div className="rounded-md bg-muted p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">เช็คโดย:</span>
                    <span className="font-medium">
                      {existingChecklist.checkedByUser?.fullname || "Unknown"} (
                      {existingChecklist.checkedByUser?.userCode})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">เมื่อ:</span>
                    <span>
                      {existingChecklist.checkedAt
                        ? format(new Date(existingChecklist.checkedAt), "dd/MM/yyyy HH:mm", {
                            locale: th,
                          })
                        : "-"}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="status">
                  สถานะ <span className="text-red-500">*</span>
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="เลือกสถานะ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        รอตรวจสอบ
                      </div>
                    </SelectItem>
                    <SelectItem value="2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ผ่าน
                      </div>
                    </SelectItem>
                    <SelectItem value="3">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        ไม่ผ่าน
                      </div>
                    </SelectItem>
                    <SelectItem value="4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        ต้องแก้ไข
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="detail">รายละเอียด</Label>
                <Textarea
                  id="detail"
                  placeholder="กรอกรายละเอียดเพิ่มเติม..."
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* ไฟล์ที่แนบไว้ - เวอร์ชันใหม่พร้อมปุ่ม Preview/Download */}
              {existingFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>ไฟล์ที่แนบไว้</Label>
                  <ul className="space-y-2">
                    {existingFiles.map((file) => (
                      <li
                        key={file.fileId}
                        className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {getFileIcon(file.fileName)}
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="truncate font-medium">{file.fileName}</span>
                            <span className="text-xs text-muted-foreground">
                              {(file.fileSize / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Preview (รูป + PDF) */}
                          {canPreviewFile(file.fileName) && (
                            <button
                              type="button"
                              onClick={() => handlePreviewFile(file.fileId, file.fileName)}
                              className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded"
                              title="ดูไฟล์"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}

                          {/* Download */}
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(file.fileId, file.fileName)}
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded"
                            title="ดาวน์โหลด"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteExistingFile(file.fileId)}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
                            disabled={isSubmitting}
                            title="ลบ"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* File Upload */}
              <div className="space-y-2">
                <Label>แนบไฟล์ใหม่</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? []);
                    setFiles((prev) => [
                      ...prev,
                      ...selected.filter(
                        (f) => !prev.some((p) => p.name === f.name && p.size === f.size)
                      ),
                    ]);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 w-full border border-dashed border-muted-foreground/40 rounded-md px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  คลิกเพื่อเลือกไฟล์ (รูปภาพ, PDF, Excel)
                </button>

                {files.length > 0 && (
                  <ul className="space-y-1">
                    {files.map((file, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-1.5 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getFileIcon(file.name)}
                          <span className="truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {existingChecklist && existingChecklist.checkedBy && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={isSubmitting || isLoading}
              >
                ล้างข้อมูล
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || isLoading || !status}>
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

      {/* Preview Modal */}
      {item && (
        <FilePreviewModal
          key={previewFile?.fileId ?? "none"}
          open={showPreview}
          onOpenChange={setShowPreview}
          file={previewFile}
          itemId={item.item_id}
        />
      )}
    </>
  );
}