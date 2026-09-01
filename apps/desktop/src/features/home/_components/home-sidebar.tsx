"use client";

import React from "react";
import { Clock, Share2, Sparkles, Folder, Star, Calendar, Bookmark, HelpCircle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";

interface HomeSidebarProps {
  selectedView: string;
  onSelectView: (view: string) => void;
}

export function HomeSidebar({ selectedView, onSelectView }: HomeSidebarProps) {
  const navItems = [
    { id: "recents", label: "Recents", icon: Clock },
    { id: "shared", label: "Shared with me", icon: Share2 },
  ];

  const spaceItems = [
    { id: "organize", label: "Organize", icon: Sparkles },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "starred", label: "Starred", icon: Star },
    { id: "templates", label: "My Templates", icon: Bookmark },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      <SidebarContent className="px-1 py-2 group-data-[collapsible=icon]:px-0">
        {/* Main Quick Nav Group */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = selectedView === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={active}
                      onClick={() => onSelectView(item.id)}
                      tooltip={item.label}
                      className="text-xs font-medium"
                    >
                      <Icon className="h-4 w-4 text-txt-brand" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Space Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold text-txt-muted uppercase tracking-wider">
            My Space
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {spaceItems.map((item) => {
                const Icon = item.icon;
                const active = selectedView === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={active}
                      onClick={() => onSelectView(item.id)}
                      tooltip={item.label}
                      className="text-xs font-normal"
                    >
                      <Icon className="h-4 w-4 text-txt-muted" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* OS Folders Group */}
        <SidebarGroup>
          <div className="flex items-center justify-between px-2 py-1 group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel className="text-[11px] font-semibold text-txt-muted uppercase tracking-wider p-0">
              Folders
            </SidebarGroupLabel>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={selectedView === "folder-craft"}
                  onClick={() => onSelectView("folder-craft")}
                  tooltip="How to use Markidown"
                  className="text-xs font-normal text-txt-secondary"
                >
                  <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="truncate">👋 How to use Markidown</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter className="px-1 py-1 border-t border-border group-data-[collapsible=icon]:px-0">
        <SidebarMenu>
          <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <SidebarMenuButton
              tooltip="Help Center"
              className="text-xs text-txt-secondary group-data-[collapsible=icon]:mx-auto"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Help Center</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
