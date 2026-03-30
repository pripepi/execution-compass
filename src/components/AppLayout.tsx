import React from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { DetailPanel } from "@/components/DetailPanel";
import { AppBreadcrumb } from "@/components/ui-custom/AppBreadcrumb";
import { EnterpriseTopHeader } from "@/components/EnterpriseTopHeader";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <EnterpriseTopHeader />
      <div className="flex flex-1 min-h-0">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="px-8 pt-3">
            <AppBreadcrumb />
          </div>
          <div className="px-8 pb-8">
            {children}
          </div>
        </main>
        <DetailPanel />
      </div>
    </div>
  );
}
