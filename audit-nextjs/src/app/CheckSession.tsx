// app/CheckSession.tsx
"use client";

import PageLoading from "@/components/PageLoading";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
const PUBLIC_ROUTES = ['/login', '/forget-password', '/reset-password'];
// เก็บ export ไว้ให้ logout() เคลียร์ flag นี้ตอนกด logout เอง — กัน dialog "เซสชันหมดอายุ" ขึ้นมาผิดๆ
export const HAD_SESSION_KEY = "audit_had_session";

interface CheckSessionProps {
  children: React.ReactNode;
}

export function CheckSession({ children }: CheckSessionProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [confirmed, setConfirmed] = useState(false);

  const mustCheck = !PUBLIC_ROUTES.includes(pathname);
  const isTokenExpired = (session as { error?: string })?.error === "TokenExpired";
  // Session หมดอายุ (token expired หรือ unauthenticated) → ค้าง dialog ไว้จนกว่า user จะกดตกลง
  const isExpired = mustCheck && status !== "loading" && (isTokenExpired || status === "unauthenticated");

  useEffect(() => {
    if (status === "authenticated" && !isTokenExpired) {
      sessionStorage.setItem(HAD_SESSION_KEY, "1");
    }
  }, [status, isTokenExpired]);

  // เคย login ในเบราว์เซอร์นี้มาก่อนแล้วค่อยหมดอายุระหว่างใช้งาน → ต้องมี dialog แจ้งเตือน
  // เข้าเว็บครั้งแรกแบบไม่เคย login เลย → redirect เงียบๆ ไม่ต้องขึ้น dialog
  const hadSession = typeof window !== "undefined" && sessionStorage.getItem(HAD_SESSION_KEY) === "1";
  const showExpiredDialog = isExpired && hadSession && !confirmed;
  const silentRedirect = isExpired && !hadSession;

  const loginHref = `/login?redirect=${encodeURIComponent(search ? `${pathname}?${search}` : pathname)}`;

  useEffect(() => {
    if (silentRedirect) {
      router.push(loginHref);
    }
  }, [silentRedirect, router, loginHref]);

  const handleConfirmExpired = () => {
    setConfirmed(true);
    sessionStorage.removeItem(HAD_SESSION_KEY);
    router.push(loginHref);
    signOut({ redirect: false }).catch((err) => {
      console.error("SignOut error:", err);
    });
  };

  // แสดง loading เมื่อ checking หรือกำลัง redirect เงียบๆ (ไม่เคย login มาก่อน)
  if (mustCheck && (status === "loading" || silentRedirect)) {
    return <PageLoading />;
  }

  // ถ้า unauthenticated/token หมดอายุ ให้ค้าง dialog ไว้จนกว่าจะกดตกลง
  if (showExpiredDialog) {
    return (
      <AlertDialog open={showExpiredDialog}>
        <AlertDialogContent
          onEscapeKeyDown={(e: KeyboardEvent) => e.preventDefault()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>เซสชันหมดอายุ</AlertDialogTitle>
            <AlertDialogDescription>
              เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleConfirmExpired}>
              ตกลง
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // กด "ตกลง" แล้ว กำลัง redirect ไป login อยู่ ไม่ต้องแสดง children เก่าที่ session หมดอายุแล้ว
  if (isExpired && confirmed) {
    return <PageLoading />;
  }

  return <>{children}</>;
}