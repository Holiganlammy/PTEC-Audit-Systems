// app/home/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { AMDashboard } from "./am-dashboard";
import { AuditDashboard } from "./audit-dashboard";
import { UserDashboard } from "./user-dashboard";
// import { ManagerDashboard } from "./manager-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { ManagerDashboard } from "./manager-dashboard";

export default function HomePage() {
  const { data: session, status } = useSession();

  // Loading state
  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  // Not authenticated
  if (!session) {
    redirect("/login");
  }

  // Permission logic: ตรวจสอบ role_id ของผู้ใช้เพื่อแสดง dashboard ที่เหมาะสม
  const roleId = Number(session.user?.role_id);
  console.log("User Role ID:", roleId, typeof roleId);
  // Render dashboard based on role
  switch (roleId) {
    // case 3: // AM
    //   return <AMDashboard />;
 
    case 2: // Audit
      return <AuditDashboard />;
 
    case 5: // User
      return <UserDashboard />;
 
    case 4: // Manager (DM)
      return <ManagerDashboard />;
 
    case 1: // Admin - can see Audit dashboard
      return <AuditDashboard />;
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}