"use client"

import { AppSidebar } from "@/components/sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-0 overflow-y-auto bg-background">
        <div className="mx-auto w-full px-6 py-6 lg:px-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
