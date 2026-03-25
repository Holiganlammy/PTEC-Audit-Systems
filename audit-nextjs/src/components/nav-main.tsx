// components/nav-main.tsx
"use client";

import { useState } from "react";
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
        {items.map((item) => <NavMenuItem key={item.menuId} item={item} />)}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavMenuItem({ item }: { item: MenuItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = !!item.children?.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
      <SidebarMenuItem>
        {!item.path && hasChildren ? (
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.name} className="w-full">
              <span className="flex-1 text-left">{item.name}</span>
              <ChevronRight className={`ml-auto transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
            </SidebarMenuButton>
          </CollapsibleTrigger>
        ) : (
          <>
            <SidebarMenuButton asChild tooltip={item.name}>
              <Link href={item.path ?? "#"}>
                <span className="flex-1">{item.name}</span>
              </Link>
            </SidebarMenuButton>

            {hasChildren && (
              <CollapsibleTrigger asChild>
                <SidebarMenuAction className="cursor-pointer">
                  <ChevronRight className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                </SidebarMenuAction>
              </CollapsibleTrigger>
            )}
          </>
        )}

        {hasChildren && (
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
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
}
