"use client";

import React, { useState } from "react";
import { Clock, Share2, Sparkles, Folder, FolderTree, Star, Calendar, Bookmark, HelpCircle, FolderPlus, Settings, Check, X, FileText, Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
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
  allTags?: string[];
  onSelectView: (view: string) => void;
  onCreateNote?: (folderPath: string) => void;
  onOpenTemplates?: () => void;
}

export function HomeSidebar({ selectedView, allTags = [], onSelectView, onCreateNote, onOpenTemplates }: HomeSidebarProps) {
  const { folders, toggleExpand, createSubfolder, addFolder, renameFolder } = useFolderTree();
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      await addFolder(newFolderName.trim());
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  const navItems = [
    { id: "recents", label: "Recents", icon: Clock },
  ];

  const spaceItems = [
    { id: "drafts", label: "Drafts", icon: FileText },
    { id: "starred", label: "Starred", icon: Star },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      <SidebarContent className="px-1.5 py-2 pt-2.5 gap-0.5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pt-2.5">

        {/* Space Group */}
        <SidebarGroup className="p-0 group-data-[collapsible=icon]:p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 group-data-[collapsible=icon]:gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = selectedView === item.id;
                return (
                  <SidebarMenuItem key={item.id} className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
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

              <div className="group-data-[collapsible=icon]:hidden px-2 py-1 text-[11px] font-semibold text-txt-muted capitalize">
                My Space
              </div>

              {spaceItems.map((item) => {
                const Icon = item.icon;
                const active = selectedView === item.id;
                return (
                  <SidebarMenuItem key={item.id} className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                    <SidebarMenuButton
                      isActive={active}
                      onClick={() => {
                        if (item.id === "templates") {
                          onOpenTemplates?.();
                        } else {
                          onSelectView(item.id);
                        }
                      }}
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

        <SidebarSeparator className="my-1 group-data-[collapsible=icon]:mx-2" />

        {/* OS Folders Group */}
        <SidebarGroup className="p-0 group-data-[collapsible=icon]:p-0">
          {/* A. Uncollapsed View: Full inline folder tree */}
          <div className="group-data-[collapsible=icon]:hidden space-y-0.5">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-txt-muted capitalize">
              <span>Folders</span>
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="text-txt-muted hover:text-txt-primary transition-colors"
                title="New Folder"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {isCreatingFolder && (
              <form onSubmit={handleCreateFolder} className="px-2 py-1 mb-2">
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-background border border-border rounded-md shadow-sm">
                  <Folder className="h-3.5 w-3.5 text-txt-muted shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onBlur={() => setIsCreatingFolder(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setIsCreatingFolder(false);
                    }}
                    placeholder="Folder name..."
                    className="flex-1 bg-transparent text-xs text-txt-primary border-none focus:outline-none focus:ring-0 min-w-0"
                  />
                </div>
              </form>
            )}

            <SidebarGroupContent>
              <SidebarMenu>
                {folders.filter(f => f.name !== "Drafts").map((folder) => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    activeId={selectedView}
                    onSelect={onSelectView}
                    onToggleExpand={toggleExpand}
                    onCreateSubfolder={createSubfolder}
                    onCreateNote={onCreateNote}
                    onRenameFolder={renameFolder}
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
                      <span className="text-xs font-semibold text-txt-muted capitalize">
                        Workspace Folders
                      </span>
                      <button
                        onClick={async () => {
                          const name = prompt("Enter folder name:");
                          if (name && name.trim()) {
                            await addFolder(name.trim());
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

        <SidebarSeparator className="group-data-[collapsible=icon]:hidden my-1" />

        {/* Tags Group */}
        <SidebarGroup className="p-0 group-data-[collapsible=icon]:p-0">
          <div className="group-data-[collapsible=icon]:hidden space-y-0.5">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-txt-muted capitalize">
              <span>Tags</span>
            </div>

            <SidebarGroupContent>
              <SidebarMenu>
                {allTags.length === 0 ? (
                  <div className="px-2 py-1 text-[10px] text-txt-muted italic">No tags yet</div>
                ) : (
                  allTags.map((tag) => (
                    <SidebarMenuItem key={tag}>
                      <SidebarMenuButton
                        isActive={selectedView === `tag:${tag}`}
                        onClick={() => onSelectView(`tag:${tag}`)}
                        className="text-xs font-normal"
                      >
                        <span className="text-txt-muted">#</span>
                        <span>{tag}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </div>
        </SidebarGroup>

      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter className="px-1 py-1 border-t border-border group-data-[collapsible=icon]:px-0">
        <SidebarMenu>
          <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <SidebarMenuButton
              tooltip="Settings"
              isActive={selectedView === "settings"}
              onClick={() => onSelectView("settings")}
              className="text-xs text-txt-secondary group-data-[collapsible=icon]:mx-auto"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
