"use client";

import React from "react";
import { Clock, Share2, Sparkles, Folder, FolderTree, Star, Calendar, Bookmark, HelpCircle, FolderPlus } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFolderTree, FolderTreeItem } from "@features/workspace";

interface HomeSidebarProps {
  selectedView: string;
  onSelectView: (view: string) => void;
}

export function HomeSidebar({ selectedView, onSelectView }: HomeSidebarProps) {
  const { folders, toggleExpand, createSubfolder } = useFolderTree();

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
          {/* A. Uncollapsed View: Full inline folder tree */}
          <div className="group-data-[collapsible=icon]:hidden space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
              <SidebarGroupLabel className="text-[11px] font-semibold text-txt-muted uppercase tracking-wider p-0">
                Folders
              </SidebarGroupLabel>
              <button
                onClick={() => {
                  const name = prompt("Enter root folder name:");
                  if (name && name.trim()) {
                    createSubfolder("f-1", name.trim());
                  }
                }}
                className="text-txt-muted hover:text-txt-primary transition-colors"
                title="New Folder"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {folders.map((folder) => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    activeId={selectedView}
                    onSelect={onSelectView}
                    onToggleExpand={toggleExpand}
                    onCreateSubfolder={createSubfolder}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </div>

          {/* B. Collapsed Icon View: Flyout Popover Sub-Sidebar to the right */}
          <div className="hidden group-data-[collapsible=icon]:block">
            <SidebarMenu>
              <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Browse Folders"
                      className="text-xs text-txt-secondary group-data-[collapsible=icon]:mx-auto"
                    >
                      <FolderTree className="h-4 w-4 text-amber-500" />
                      <span>Folders</span>
                    </SidebarMenuButton>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="start"
                    sideOffset={12}
                    className="w-64 p-3 bg-popover border-border shadow-xl rounded-lg z-50 space-y-2"
                  >
                    <div className="flex items-center justify-between px-1 pb-1.5 border-b border-border">
                      <span className="text-xs font-semibold text-txt-muted uppercase tracking-wider">
                        Workspace Folders
                      </span>
                      <button
                        onClick={() => {
                          const name = prompt("Enter root folder name:");
                          if (name && name.trim()) {
                            createSubfolder("f-1", name.trim());
                          }
                        }}
                        className="text-txt-muted hover:text-txt-primary transition-colors"
                        title="New Folder"
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                      <SidebarMenu>
                        {folders.map((folder) => (
                          <FolderTreeItem
                            key={folder.id}
                            folder={folder}
                            activeId={selectedView}
                            onSelect={onSelectView}
                            onToggleExpand={toggleExpand}
                            onCreateSubfolder={createSubfolder}
                          />
                        ))}
                      </SidebarMenu>
                    </div>
                  </PopoverContent>
                </Popover>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
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
