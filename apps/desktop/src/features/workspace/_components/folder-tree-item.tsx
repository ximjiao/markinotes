"use client";

import React, { useState } from "react";
import { Folder, ChevronRight, ChevronDown, MoreHorizontal, FilePlus, FolderPlus, Edit3, ExternalLink, Trash2 } from "lucide-react";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LocalFolderNode } from "../_types/folder.types";
import { cn } from "@/lib/utils";

interface FolderTreeItemProps {
  folder: LocalFolderNode;
  activeId: string | null;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onCreateSubfolder: (parentId: string, name: string) => void;
  depth?: number;
}

export function FolderTreeItem({
  folder,
  activeId,
  onSelect,
  onToggleExpand,
  onCreateSubfolder,
  depth = 0,
}: FolderTreeItemProps) {
  const hasChildren = folder.children && folder.children.length > 0;
  const isActive = activeId === folder.id;

  const handleCreateSubfolder = () => {
    const name = prompt("Enter subfolder name:");
    if (name && name.trim()) {
      onCreateSubfolder(folder.id, name.trim());
    }
  };

  return (
    <div className="w-full">
      <SidebarMenuItem className="group/item flex items-center justify-between">
        <SidebarMenuButton
          isActive={isActive}
          onClick={() => {
            onSelect(folder.id);
            if (hasChildren) onToggleExpand(folder.id);
          }}
          tooltip={folder.name}
          className="text-xs font-normal flex-1 text-txt-secondary hover:text-txt-primary"
        >
          {hasChildren && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(folder.id);
              }}
              className="mr-1 hover:text-txt-primary cursor-pointer shrink-0"
            >
              {folder.isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </span>
          )}
          <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="truncate">{folder.name}</span>
        </SidebarMenuButton>

        {/* Folder Action Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-5 w-5 opacity-0 group-hover/item:opacity-100 flex items-center justify-center text-txt-muted hover:text-txt-primary transition-opacity mr-1 rounded hover:bg-accent">
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onClick={() => console.log("New Note in", folder.path)} className="text-xs">
              <FilePlus className="mr-2 h-3.5 w-3.5 text-txt-brand" /> New Note Here
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCreateSubfolder} className="text-xs">
              <FolderPlus className="mr-2 h-3.5 w-3.5" /> New Subfolder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs">
              <Edit3 className="mr-2 h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs">
              <ExternalLink className="mr-2 h-3.5 w-3.5" /> Reveal in Finder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      {/* Recursive Subfolders Rendering */}
      {hasChildren && folder.isExpanded && (
        <SidebarMenuSub className="ml-3 pl-2 border-l border-border/60 space-y-0.5">
          {folder.children!.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              activeId={activeId}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onCreateSubfolder={onCreateSubfolder}
              depth={depth + 1}
            />
          ))}
        </SidebarMenuSub>
      )}
    </div>
  );
}
