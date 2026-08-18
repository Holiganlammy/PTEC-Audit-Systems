// app/home/page.tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { AMDashboard } from "./am-dashboard";
import { AADashboard } from "./aa-dashboard";
import { AuditDashboard } from "./audit-dashboard";
import { UserDashboard } from "./user-dashboard";
// import { ManagerDashboard } from "./manager-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { ManagerDashboard } from "./manager-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Admin (1) / Audit (2): เห็น dashboard ได้ทั้ง Audit, AM, AA — สลับดูผ่าน tab
function AdminAuditDashboard() {
  const [tab, setTab] = useState("audit");
  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList>
        <TabsTrigger value="audit">Audit</TabsTrigger>
        <TabsTrigger value="am">AM</TabsTrigger>
        <TabsTrigger value="aa">AA</TabsTrigger>
      </TabsList>
      <TabsContent value="audit"><AuditDashboard /></TabsContent>
      <TabsContent value="am"><AMDashboard /></TabsContent>
      <TabsContent value="aa"><AADashboard /></TabsContent>
    </Tabs>
  );
}

// Master Area (10): เห็นได้ทั้ง AM และ AA — สลับดูผ่าน tab
function MasterAreaDashboard() {
  const [tab, setTab] = useState("am");
  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList>
        <TabsTrigger value="am">AM</TabsTrigger>
        <TabsTrigger value="aa">AA</TabsTrigger>
      </TabsList>
      <TabsContent value="am"><AMDashboard /></TabsContent>
      <TabsContent value="aa"><AADashboard /></TabsContent>
    </Tabs>
  );
}

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
    case 3: // AM
      return <AMDashboard />;

    case 10: // Master Area — สูงกว่า AM ต่ำกว่า DM เห็นได้ทั้ง AM และ AA (สลับผ่าน tab) ข้อมูลไม่จำกัดสาขา
      return <MasterAreaDashboard />;

    case 8: // AA
      return <AADashboard />;

    case 2: // Audit — เห็นได้ทั้ง Audit, AM, AA (สลับผ่าน tab)
      return <AdminAuditDashboard />;

    case 5: // User
      return <UserDashboard />;

    case 4: // Manager (DM)
      return <ManagerDashboard />;

    case 1: // Admin — เห็นได้ทั้ง Audit, AM, AA (สลับผ่าน tab)
      return <AdminAuditDashboard />;
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