"use client";

import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { CommandPaletteDialog } from "@features/command-palette";

interface AppShellProps {
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ sidebar, header, children }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-txt-primary">
        {/* Official Shadcn Sidebar Component */}
        {sidebar}

        {/* SidebarInset wraps Header & Main Content */}
        <SidebarInset className="flex flex-col flex-1 overflow-hidden bg-background">
          {header && <div className="shrink-0">{header}</div>}
          <main className="flex-1 overflow-hidden bg-background flex flex-col">
            {children}
          </main>
        </SidebarInset>
      </div>

      {/* Global Quick Switcher */}
      <CommandPaletteDialog />
    </SidebarProvider>
  );
}
