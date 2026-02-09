// components/app-sidebar.tsx
"use client";

import * as React from "react";
import { Command, LifeBuoy, Send } from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import client from "@/lib/axios/interceptors";
import { toast } from "sonner";

interface MenuItem {
  menuId: number;
  name: string;
  path: string | null;
  icon: string | null;
  parentId: number | null;
  orderNo: number;
  isActive: boolean;
  canView?: boolean;
  children?: MenuItem[];
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const [menus, setMenus] = React.useState<MenuItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    try {
      setLoading(true);

      const response = await client.get("/menu_audit/my-menus");

      if (response.data.success) {
        setMenus(response.data.data);
      } else {
        toast.error("ไม่สามารถดึงข้อมูล menu ได้");
      }
    } catch (err) {
      console.error("Failed to fetch menus:", err);
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล menu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/home">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">PTEC Audit</span>
                  <span className="truncate text-xs">
                    ระบบตรวจสอบภายใน
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {loading ? (
          <div className="space-y-2 p-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <NavMain items={menus} />
        )}
        <NavSecondary
          items={[
            {
              title: "ช่วยเหลือ",
              url: "#",
              icon: LifeBuoy,
            },
            {
              title: "ติดต่อเรา",
              url: "#",
              icon: Send,
            },
          ]}
          className="mt-auto"
        />
      </SidebarContent>

      <SidebarFooter>
        {session?.user && (
          <NavUser
            user={{
              name: `${session.user.fristName} ${session.user.lastName}`,
              email: session.user.Email || "",
              avatar: session.user.img_profile || "/avatars/default.jpg",
            }}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}