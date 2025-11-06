"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Home, User, BookOpen, Settings, Users, BarChart3 } from "lucide-react"

const getIconForPath = (path: string) => {
  if (path === "profile") return <User className="h-4 w-4" />
  if (path === "courses") return <BookOpen className="h-4 w-4" />
  if (path === "dashboard") return <BarChart3 className="h-4 w-4" />
  if (path === "settings") return <Settings className="h-4 w-4" />
  if (path === "users") return <Users className="h-4 w-4" />
  return null
}

const formatPathName = (path: string) => {
  return path
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function Breadcrumbs() {
  const pathname = usePathname() || "/"
  const { data: session } = useSession()

  // Don't show breadcrumbs on home page or auth pages
  if (pathname === "/" || pathname.includes("/signin") || pathname.includes("/signup") || pathname === "/role") {
    return null
  }

  const pathSegments = pathname.split("/").filter(Boolean)
  const role = session?.user?.role

  // Check if current page is a role dashboard
  const isOnDashboard = pathname === `/${role}/dashboard`

  // Remove role segments and filter out dashboard if we're on dashboard page
  const cleanSegments = pathSegments.filter((segment) => {
    if (segment === "student" || segment === "teacher" || segment === "admin") {
      return false
    }
    // If we're on dashboard page, don't include dashboard in segments
    if (isOnDashboard && segment === "dashboard") {
      return false
    }
    return true
  })

  return (
    <div className="border-b bg-muted/30 px-4 py-3">
      <div className="container">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/" className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {role && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isOnDashboard ? (
                    <BreadcrumbPage className="flex items-center gap-1 capitalize">
                      <BarChart3 className="h-4 w-4" />
                      {role} Dashboard
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={`/${role}/dashboard`} className="flex items-center gap-1 capitalize">
                        <BarChart3 className="h-4 w-4" />
                        {role} Dashboard
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </>
            )}

            {cleanSegments.map((segment, index) => {
              const isLast = index === cleanSegments.length - 1
              const href = `/${role}/${cleanSegments.slice(0, index + 1).join("/")}`
              const icon = getIconForPath(segment)

              return (
                <React.Fragment key={segment}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="flex items-center gap-1">
                        {icon}
                        {formatPathName(segment)}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={href} className="flex items-center gap-1">
                          {icon}
                          {formatPathName(segment)}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  )
}
