"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";

type ItemAttachment = {
  fileId: number;
  fileName: string;
  fileSize: number;
  uploadedAt?: string;
};

interface ItemAttachmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AuditItem | null;
  onUpdated?: () => void;
  readOnly?: boolean;
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "pdf") return <FileText className="h-4 w-4 text-red-500" />;
  if (ext === "xlsx" || ext === "xls") {
    return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  }
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
    return <ImageIcon className="h-4 w-4 text-blue-500" />;
  }

  return <Paperclip className="h-4 w-4 text-muted-foreground" />;
};

const canPreviewFile = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "pdf"].includes(ext || "");
};

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [blobUrl, setBlobUrl] = useState("");

  useEffect(() => {
    if (!open || !file || !itemId) return;

    let objectUrl = "";

    const loadPreview = async () => {
      setIsLoading(true);
      setError(false);
      setBlobUrl("");

      try {
        const response = await client.get(
          `/am-items/${itemId}/attachments/${file.fileId}/view`,
          {
            headers: dataConfig().headers,
            responseType: "blob",
          }
        );
        const ext = file.fileName.split(".").pop()?.toLowerCase();
        const mimeType =
          ext === "pdf"
            ? "application/pdf"
            : response.data.type || "application/octet-stream";
        objectUrl = URL.createObjectURL(new Blob([response.data], { type: mimeType }));
        setBlobUrl(objectUrl);
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, file, itemId]);

  if (!file) return null;

  const isPdf = file.fileName.split(".").pop()?.toLowerCase() === "pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getFileIcon(file.fileName)}
            {file.fileName}
          </DialogTitle>
        </DialogHeader>

        <div className="relative h-[70vh] w-full overflow-hidden rounded-md bg-muted">
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
                  className="h-full w-full border-0"
                  title={file.fileName}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={blobUrl}
                  alt={file.fileName}
                  className="h-full w-full object-contain"
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

export default function ItemAttachmentModal({
  open,
  onOpenChange,
  item,
  onUpdated,
  readOnly = false,
}: ItemAttachmentModalProps) {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<ItemAttachment[]>([]);
  const [previewFile, setPreviewFile] = useState<{ fileId: number; fileName: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!open || !item) {
      setFiles([]);
      setExistingFiles([]);
      return;
    }

    const fetchFiles = async () => {
      setIsLoading(true);
      try {
        const response = await client.get(`/am-items/${item.item_id}/attachments`, {
          headers: dataConfig().headers,
        });
        const list = Array.isArray(response.data)
          ? response.data
          : response.data?.data ?? [];
        setExistingFiles(list);
      } catch (error) {
        console.error("Error fetching item attachments:", error);
        toast.error("ไม่สามารถโหลดไฟล์แนบของรายการได้");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [open, item]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => [
      ...prev,
      ...selected.filter(
        (file) => !prev.some((existing) => existing.name === file.name && existing.size === file.size)
      ),
    ]);
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!item || files.length === 0) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.append("uploadedBy", String(session?.user?.UserID ?? ""));

      const response = await client.post(
        `/am-items/${item.item_id}/attachments`,
        formData,
        {
          headers: {
            ...dataConfig().headers,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const uploadedFiles = Array.isArray(response.data)
        ? response.data
        : response.data?.data ?? [];

      if (uploadedFiles.length > 0) {
        setExistingFiles((prev) => [...prev, ...uploadedFiles]);
      } else {
        const filesResponse = await client.get(`/am-items/${item.item_id}/attachments`, {
          headers: dataConfig().headers,
        });
        setExistingFiles(
          Array.isArray(filesResponse.data)
            ? filesResponse.data
            : filesResponse.data?.data ?? []
        );
      }

      setFiles([]);
      toast.success("อัปโหลดไฟล์สำเร็จ");
      onUpdated?.();
    } catch (error) {
      console.error("Error uploading item attachments:", error);
      toast.error("ไม่สามารถอัปโหลดไฟล์ได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadFile = async (fileId: number, fileName: string) => {
    if (!item) return;

    try {
      const response = await client.get(
        `/am-items/${item.item_id}/attachments/${fileId}/download`,
        {
          headers: dataConfig().headers,
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("ดาวน์โหลดไฟล์สำเร็จ");
    } catch (error) {
      console.error("Error downloading item attachment:", error);
      toast.error("ไม่สามารถดาวน์โหลดไฟล์ได้");
    }
  };

  const handleDeleteExistingFile = async (fileId: number) => {
    if (!item) return;

    try {
      await client.delete(`/am-items/${item.item_id}/attachments/${fileId}`, {
        headers: dataConfig().headers,
        data: { deletedBy: session?.user?.UserID || 0 },
      });

      setExistingFiles((prev) => prev.filter((file) => file.fileId !== fileId));
      toast.success("ลบไฟล์สำเร็จ");
      onUpdated?.();
    } catch (error) {
      console.error("Error deleting item attachment:", error);
      toast.error("ไม่สามารถลบไฟล์ได้");
    }
  };

  if (!item) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>เก็บไฟล์รายการ</DialogTitle>
            <DialogDescription>
              รายการ: <span className="font-medium text-foreground">{item.category_name}</span>
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {existingFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>ไฟล์ที่เก็บไว้</Label>
                  <ul className="space-y-2">
                    {existingFiles.map((file) => (
                      <li
                        key={file.fileId}
                        className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          {getFileIcon(file.fileName)}
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate font-medium">{file.fileName}</span>
                            <span className="text-xs text-muted-foreground">
                              {(file.fileSize / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          {canPreviewFile(file.fileName) && (
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewFile({ fileId: file.fileId, fileName: file.fileName });
                                setShowPreview(true);
                              }}
                              className="rounded p-1.5 text-muted-foreground transition-colors hover:text-primary"
                              title="ดูไฟล์"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(file.fileId, file.fileName)}
                            className="rounded p-1.5 text-muted-foreground transition-colors hover:text-primary"
                            title="ดาวน์โหลด"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => handleDeleteExistingFile(file.fileId)}
                              className="rounded p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                              disabled={isSubmitting}
                              title="ลบ"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!readOnly && (
              <div className="space-y-2">
                <Label>เลือกไฟล์ใหม่</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center gap-2 rounded-md border border-dashed border-muted-foreground/40 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  disabled={isSubmitting}
                >
                  <Upload className="h-4 w-4" />
                  คลิกเพื่อเลือกไฟล์
                </button>

                {files.length > 0 && (
                  <ul className="space-y-1">
                    {files.map((file, idx) => (
                      <li
                        key={`${file.name}-${file.size}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-1.5 text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {getFileIcon(file.name)}
                          <span className="truncate">{file.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                          disabled={isSubmitting}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              ปิด
            </Button>
            {!readOnly && (
              <Button
                type="button"
                onClick={handleUpload}
                disabled={isSubmitting || isLoading || files.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังอัปโหลด...
                  </>
                ) : (
                  "อัปโหลด"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FilePreviewModal
        key={previewFile?.fileId ?? "none"}
        open={showPreview}
        onOpenChange={setShowPreview}
        file={previewFile}
        itemId={item.item_id}
      />
    </>
  );
}
