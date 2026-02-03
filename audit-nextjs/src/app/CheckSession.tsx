// app/CheckSession.tsx
"use client";

import PageLoading from "@/components/PageLoading";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
const PUBLIC_ROUTES = ['/login', '/forget_password', '/reset-password'];

interface CheckSessionProps {
  children: React.ReactNode;
}

export function CheckSession({ children }: CheckSessionProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  const mustCheck = !PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    // ถ้าไม่ต้อง check ให้ข้ามไป
    if (!mustCheck) {
      hasRedirected.current = false;
      return;
    }

    if (status === "loading") return;

    // ถ้า unauthenticated ให้ redirect
    if (status === "unauthenticated" && !hasRedirected.current) {
      hasRedirected.current = true;
      console.log("⚠️ Session not found, redirecting to login...");
      
      // Clear session และ redirect
      signOut({ redirect: false }).then(() => {
        router.push("/login");
      });
    }

    // Reset flag เมื่อ authenticated
    if (status === "authenticated") {
      hasRedirected.current = false;
    }
  }, [mustCheck, status, router]);

  // แสดง loading เมื่อ checking
  if (mustCheck && status === "loading") {
    return <PageLoading />;
  }

  // ถ้า unauthenticated แสดง loading (กำลัง redirect)
  if (mustCheck && status === "unauthenticated") {
    return <PageLoading />;
  }

  return <>{children}</>;
}