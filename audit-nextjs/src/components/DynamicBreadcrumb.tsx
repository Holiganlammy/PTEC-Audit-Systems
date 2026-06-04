"use client"

import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const routeConfig: Record<string, { label: string; parent?: { label: string; href: string } }> = {
  "/home":                      { label: "Home" },
  "/audit/list":                { label: "List", parent: { label: "Audit Document", href: "/audit/list" } },
  "/audit/create":              { label: "Create Document", parent: { label: "Audit Document", href: "/audit/list" } },
  "/audit/create/add_items":    { label: "Add Items", parent: { label: "Create Document", href: "/audit/create" } },
  "/audit/edit_document":       { label: "Edit Document", parent: { label: "Audit Document", href: "/audit/list" } },
  "/permission_manage":         { label: "Permission Manage" },
  "/areamanage/create":         { label: "Create Document", parent: { label: "Area Document", href: "/areamanage/create" } },
}

export function DynamicBreadcrumb() {
  const pathname = usePathname()

  const config = routeConfig[pathname]

  if (!config) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  const isHome = pathname === "/home"

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {isHome ? (
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        ) : (
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink href="/home">Home</BreadcrumbLink>
          </BreadcrumbItem>
        )}
        {!isHome && config.parent && (
          <>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href={config.parent.href}>
                {config.parent.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        {!isHome && (
          <>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{config.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
