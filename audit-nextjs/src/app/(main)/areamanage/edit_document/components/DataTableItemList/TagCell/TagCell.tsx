"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { toast } from "sonner";
import { getSession, useSession } from "next-auth/react";
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

export interface TaggedUser {
  userId: string;
  userCode: string;
  fullname: string;
  itemId?: number; // for compatibility with older API responses
}

// Shape the /users API returns
interface ApiUser {
  UserID: string;
  UserCode: string;
  Fullname: string;
}

interface TagCellProps {
  itemId: number;
  users: ApiUser[];
  initialTags?: TaggedUser[];
  onTagChange?: (tags: TaggedUser[]) => void;
  isLocked?: boolean;
  forceRefresh?: boolean;
  positionType?: string;
}

export default function TagCell({
  itemId,
  users,
  initialTags = [],
  onTagChange,
  isLocked = false,
  forceRefresh = false,
  positionType,
}: TagCellProps) {
  const { data: session } = useSession();
  const [tags, setTags] = useState<TaggedUser[]>(initialTags);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [pendingUser, setPendingUser] = useState<ApiUser | null>(null);
  const [pendingRemoveTag, setPendingRemoveTag] = useState<TaggedUser | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
    if (forceRefresh) {
      client
        .get(`/am-items/${itemId}/tagged-users`, {
          headers: dataConfig().headers,
        })
        .then((res) => {
          if (Array.isArray(res.data)) {
            setTags(res.data);
          }
        })
        .catch(() => {});
    }
  }, [forceRefresh, itemId]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [isOpen, search]);

  const allowedTagRoles = positionType === "AA" ? [1, 4, 8] : [1, 3, 4];
  const canTag = !isLocked && allowedTagRoles.includes(session?.user?.role_id ?? -1);
  const filtered = search.trim()
    ? users
        .filter(
          (u) =>
            !tags.some((t) => String(t.userId) === String(u.UserID)) &&
            (u.UserCode.toLowerCase().includes(search.toLowerCase()) ||
              u.Fullname.toLowerCase().includes(search.toLowerCase()))
        )
        .slice(0, 10)
    : [];

  const addTag = useCallback(
    async (user: ApiUser) => {
      const session = await getSession()
      const newTag: TaggedUser = {
        userId: user.UserID,
        userCode: user.UserCode,
        fullname: user.Fullname,
      };
      const next = [...tags, newTag];
      setTags(next);
      setSearch("");
      setIsOpen(false);
      setHighlightedIndex(-1);
      try {
        await client.post(
          `/am-items/${itemId}/tagged-user`,
          { 
            userId: user.UserID ,
            createdBy: session?.user?.UserID

          },
          { headers: dataConfig().headers }
        );
        onTagChange?.(next);
      } catch {
        toast.error("ไม่สามารถบันทึก tag ได้");
        setTags(tags);
      }
    },
    [itemId, tags, onTagChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = highlightedIndex >= 0 ? filtered[highlightedIndex] : filtered[0];
      if (target) setPendingUser(target);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const removeTag = useCallback(
    async (tag: TaggedUser) => {
      const next = tags.filter((t) => t.userId !== tag.userId);
      setTags(next);
      try {
        await client.delete(`/am-items/${itemId}/tagged-users/${tag.userId}`, {
          headers: dataConfig().headers,
        });
        onTagChange?.(next);
      } catch {
        toast.error("ไม่สามารถลบ tag ได้");
        setTags(tags);
      }
    },
    [itemId, tags, onTagChange]
  );

  return (
    <div className="min-w-27.5 max-w-35">
      {/* Pills */}
      {tags.length > 0 ? (
        <div className="grid grid-cols-2 gap-1 mb-1.5">
          {tags.map((t) => (
            <div
              key={t.userId}
              title={`${t.userCode} — ${t.fullname}`}
              className="flex items-center gap-0.5 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium min-w-0"
            >
              <span className="truncate flex-1">{t.userCode}</span>
              {canTag && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setPendingRemoveTag(t);
                  }}
                  className="shrink-0 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                >
                  <X className="h-2 w-2" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        !canTag && (
          <span className="text-xs text-muted-foreground/50 italic">ไม่มีแท็ก</span>
        )
      )}

      {/* Search input + dropdown */}
      {canTag && (
      <div className="relative">
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="+ แท็กผู้ใช้สำหรับผู้ใช้งานอื่นๆ..."
          className="h-7 text-xs px-2 placeholder:text-muted-foreground/60"
        />

        {isOpen && filtered.length > 0 && createPortal(
          <div style={dropdownStyle} className="rounded-md border border-border bg-popover shadow-md max-h-44 overflow-y-auto">
            {filtered.map((u, idx) => (
              <button
                key={u.UserID}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setPendingUser(u);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
                  idx === highlightedIndex ? "bg-muted" : "hover:bg-muted"
                }`}
              >
                <span className="text-xs font-semibold text-foreground shrink-0">
                  {u.UserCode}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {u.Fullname}
                </span>
              </button>
            ))}
          </div>,
          document.body
        )}

        {isOpen && search.trim() !== "" && filtered.length === 0 && createPortal(
          <div style={dropdownStyle} className="rounded-md border border-border bg-popover shadow-sm px-3 py-2">
            <p className="text-xs text-muted-foreground">ไม่พบผู้ใช้</p>
          </div>,
          document.body
        )}
      </div>
      )}

      {/* Confirm Alert Dialog - Add Tag */}
      <AlertDialog open={!!pendingUser} onOpenChange={(open) => { if (!open) setPendingUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการแท็กผู้ใช้</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการแท็ก{" "}
              <span className="font-semibold text-foreground">
                {pendingUser?.UserCode} — {pendingUser?.Fullname}
              </span>{" "}
              ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingUser(null)}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingUser) addTag(pendingUser);
                setPendingUser(null);
              }}
            >
              ยืนยัน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Alert Dialog - Remove Tag */}
      <AlertDialog open={!!pendingRemoveTag} onOpenChange={(open) => { if (!open) setPendingRemoveTag(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบแท็ก</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบแท็ก{" "}
              <span className="font-semibold text-foreground">
                {pendingRemoveTag?.userCode} — {pendingRemoveTag?.fullname}
              </span>{" "}
              ออกใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingRemoveTag(null)}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (pendingRemoveTag) removeTag(pendingRemoveTag);
                setPendingRemoveTag(null);
              }}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
