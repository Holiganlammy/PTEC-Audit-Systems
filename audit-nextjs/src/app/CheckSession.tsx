// app/CheckSession.tsx
"use client";

import PageLoading from "@/components/PageLoading";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
const PUBLIC_ROUTES = ['/login', '/forget_password', '/reset-password'];

interface CheckSessionProps {
  children: React.ReactNode;
}

export function CheckSession({ children }: CheckSessionProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const hasRedirected = useRef(false);

  const mustCheck = !PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    const currentPath = search ? `${pathname}?${search}` : pathname;
    const loginHref = `/login?redirect=${encodeURIComponent(currentPath)}`;

    if (!mustCheck) {
      hasRedirected.current = false;
      return;
    }

    if (status === "loading") return;

    // Token หมดอายุ → signOut ทันที
    if ((session as { error?: string })?.error === "TokenExpired" && !hasRedirected.current) {
      hasRedirected.current = true;
      console.log("⚠️ Token expired, signing out...");
      signOut({ redirect: false }).then(() => {
        router.push(loginHref);
      });
      return;
    }

    // ถ้า unauthenticated ให้ redirect
    if (status === "unauthenticated" && !hasRedirected.current) {
      hasRedirected.current = true;
      console.log("⚠️ Session not found, redirecting to login...");
      
      // Clear session และ redirect
      signOut({ redirect: false }).then(() => {
        router.push(loginHref);
      });
    }

    // Reset flag เมื่อ authenticated
    if (status === "authenticated") {
      hasRedirected.current = false;
    }
  }, [mustCheck, status, session, router, pathname, search]);

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