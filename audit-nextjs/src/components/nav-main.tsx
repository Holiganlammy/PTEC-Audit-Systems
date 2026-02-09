// components/nav-main.tsx
"use client";

import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { getIcon } from "@/utils/icon-mapper";
import Link from "next/link";

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

export function NavMain({ items }: { items: MenuItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>เมนูหลัก</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = getIcon(item.icon);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <Collapsible key={item.menuId} asChild defaultOpen={false}>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={item.name}>
                  {item.path ? (
                    <Link href={item.path}>
                      <Icon />
                      <span>{item.name}</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <Icon />
                      <span>{item.name}</span>
                    </div>
                  )}
                </SidebarMenuButton>

                {hasChildren && (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="data-[state=open]:rotate-90 cursor-pointer">
                        <ChevronRight />
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.children?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.menuId}>
                            <SidebarMenuSubButton asChild>
                              {subItem.path ? (
                                <Link href={subItem.path}>
                                  <span>{subItem.name}</span>
                                </Link>
                              ) : (
                                <span>{subItem.name}</span>
                              )}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                )}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}