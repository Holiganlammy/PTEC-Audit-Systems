"use client";

import { useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { toast } from "sonner";
import { getSession, useSession } from "next-auth/react";

export interface TaggedUser {
  userId: string;
  userCode: string;
  fullname: string;
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
}

export default function TagCell({
  itemId,
  users,
  initialTags = [],
  onTagChange,
}: TagCellProps) {
  const { data: session } = useSession();
  const [tags, setTags] = useState<TaggedUser[]>(initialTags);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canTag = [1, 2, 4].includes(session?.user?.role_id ?? -1);
  const filtered = search.trim()
    ? users
        .filter(
          (u) =>
            !tags.some((t) => t.userId === u.UserID) &&
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
      try {
        await client.post(
          `/audit-items/${itemId}/tagged-user`,
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

  const removeTag = useCallback(
    async (tag: TaggedUser) => {
      const next = tags.filter((t) => t.userId !== tag.userId);
      setTags(next);
      try {
        await client.delete(`/audit-items/${itemId}/tagged-users/${tag.userId}`, {
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
    <div className="min-w-[160px] max-w-[260px]">
      {/* Pills */}
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {tags.map((t) => (
            <Badge
              key={t.userId}
              variant="secondary"
              className={`rounded-full text-[11px] font-medium ${
                canTag ? "gap-0.5 pr-0.5 pl-2" : "px-2.5 py-0.5"
              }`}
            >
              {t.userCode}
              {canTag && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    removeTag(t);
                  }}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                  aria-label={`ลบ ${t.userCode}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </Badge>
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
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="+ แท็กผู้ใช้สำหรับผู้ใช้งานอื่นๆ..."
          className="h-7 text-xs px-2 placeholder:text-muted-foreground/60"
        />

        {isOpen && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border border-border bg-popover shadow-md max-h-44 overflow-y-auto">
            {filtered.map((u) => (
              <button
                key={u.UserID}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(u);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-muted transition-colors"
              >
                <span className="text-xs font-semibold text-foreground shrink-0">
                  {u.UserCode}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {u.Fullname}
                </span>
              </button>
            ))}
          </div>
        )}

        {isOpen && search.trim() !== "" && filtered.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border border-border bg-popover shadow-sm px-3 py-2">
            <p className="text-xs text-muted-foreground">ไม่พบผู้ใช้</p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
