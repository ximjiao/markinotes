"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub
} from "@/components/ui/sidebar";
import { invoke } from "@tauri-apps/api/core";
import { ChevronDown, ChevronRight, Edit3, ExternalLink, FilePlus, Folder, FolderPlus, MoreHorizontal, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { isTauri } from "../../home/_lib/note-ipc";
import type { LocalFolderNode } from "../_types/folder.types";

interface FolderTreeItemProps {
  folder: LocalFolderNode;
  activeId: string | null;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onCreateSubfolder: (parentId: string, name: string) => void;
  onCreateNote?: (folderPath: string) => void;
  onRenameFolder?: (folderId: string, newName: string) => void;
  depth?: number;
}

export function FolderTreeItem({
  folder,
  activeId,
  onSelect,
  onToggleExpand,
  onCreateSubfolder,
  onCreateNote,
  onRenameFolder,
  depth = 0,
}: FolderTreeItemProps) {
  const hasChildren = folder.children && folder.children.length > 0;
  const isActive = activeId === folder.id;

  const [isCreatingSubfolder, setIsCreatingSubfolder] = useState(false);
  const [subfolderName, setSubfolderName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);

  const handleCreateSubfolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (subfolderName.trim()) {
      onCreateSubfolder(folder.id, subfolderName.trim());
      setSubfolderName("");
      setIsCreatingSubfolder(false);
    }
  };

  const handleRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (renameValue.trim() && renameValue.trim() !== folder.name && onRenameFolder) {
      onRenameFolder(folder.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div className="w-full">
      <SidebarMenuItem className="group/item">
        <SidebarMenuButton
          isActive={isActive}
          onClick={() => {
            onSelect(folder.id);
            if (hasChildren) onToggleExpand(folder.id);
          }}
          tooltip={folder.name}
          className="text-xs font-normal w-full flex items-center justify-between text-txt-secondary hover:text-txt-primary pr-1"
        >
          <div className="flex items-center min-w-0 overflow-hidden flex-1">
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
            <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0 mr-1.5" />

            {isRenaming ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRename()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") {
                    setRenameValue(folder.name);
                    setIsRenaming(false);
                  }
                }}
                className="flex-1 bg-background border border-border text-xs font-medium text-txt-primary focus:outline-none focus:border-txt-brand focus:ring-1 focus:ring-txt-brand rounded-sm px-1 min-w-0 h-6 -ml-1"
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.target.select()}
              />
            ) : (
              <span className="truncate">{folder.name}</span>
            )}
          </div>

          {/* Folder Action Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="h-5 w-5 opacity-0 group-hover/item:opacity-100 flex items-center justify-center text-txt-muted hover:text-txt-primary transition-opacity shrink-0 rounded hover:bg-black/5 dark:hover:bg-white/10"
              >
                <MoreHorizontal className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if (onCreateNote) onCreateNote(folder.path); }} className="text-xs">
                <FilePlus className="mr-2 h-3.5 w-3.5 text-txt-brand" /> New Note Here
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                if (!folder.isExpanded) onToggleExpand(folder.id);
                setIsCreatingSubfolder(true);
              }} className="text-xs">
                <FolderPlus className="mr-2 h-3.5 w-3.5" /> New Subfolder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }} className="text-xs">
                <Edit3 className="mr-2 h-3.5 w-3.5" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async (e) => {
                e.stopPropagation();
                if (isTauri()) {
                  try {
                    await invoke("reveal_in_finder", { path: folder.path });
                  } catch (err) {
                    console.error("Failed to reveal:", err);
                  }
                }
              }} className="text-xs">
                <ExternalLink className="mr-2 h-3.5 w-3.5" /> Reveal in Finder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); alert("Delete " + folder.name); }} className="text-xs text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {/* Recursive Subfolders Rendering */}
      {(hasChildren || isCreatingSubfolder) && folder.isExpanded && (
        <SidebarMenuSub className="ml-3 mr-0 pl-2 pr-0 border-l border-border/60 space-y-0.5">
          {isCreatingSubfolder && (
            <form onSubmit={handleCreateSubfolder} className="px-2 py-1 mb-1">
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-background border border-border rounded-md shadow-sm">
                <Folder className="h-3.5 w-3.5 text-txt-muted shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={subfolderName}
                  onChange={(e) => setSubfolderName(e.target.value)}
                  onBlur={() => setIsCreatingSubfolder(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setIsCreatingSubfolder(false);
                  }}
                  placeholder="Subfolder name..."
                  className="w-full bg-background border border-border text-xs text-txt-primary focus:outline-none focus:border-txt-brand focus:ring-1 focus:ring-txt-brand rounded-sm px-1 h-6 -ml-1"
                />
              </div>
            </form>
          )}

          {folder.children?.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              activeId={activeId}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onCreateSubfolder={onCreateSubfolder}
              onCreateNote={onCreateNote}
              onRenameFolder={onRenameFolder}
              depth={depth + 1}
            />
          ))}
        </SidebarMenuSub>
      )}
    </div>
  );
}
