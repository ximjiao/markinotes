"use client";

import React, { useState, useMemo } from "react";
import { Folder, Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { LocalFolderNode } from "../../workspace/_types/folder.types";
import { cn } from "@/lib/utils";

interface MoveNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  noteTitle: string;
  folders: LocalFolderNode[];
  onMove: (folderPath: string) => Promise<void>;
}

export function MoveNoteDialog({ isOpen, onClose, noteTitle, folders, onMove }: MoveNoteDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  // Flatten folders tree into a flat list
  const flatFolders = useMemo(() => {
    const flat: Array<{ path: string; name: string; depth: number }> = [];
    const flatten = (nodes: LocalFolderNode[], depth = 0) => {
      for (const node of nodes) {
        flat.push({ path: node.path, name: node.name, depth });
        if (node.children) {
          flatten(node.children, depth + 1);
        }
      }
    };
    flatten(folders);
    return flat;
  }, [folders]);

  const filteredFolders = useMemo(() => {
    if (!searchQuery) return flatFolders;
    return flatFolders.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [flatFolders, searchQuery]);

  const handleMove = async () => {
    if (!selectedFolderPath) return;
    setIsMoving(true);
    try {
      await onMove(selectedFolderPath);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0 border-border bg-popover shadow-xl overflow-hidden rounded-xl">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-sm font-semibold text-txt-primary flex items-center justify-between">
            <span>Move "{noteTitle}"</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4 border-b border-border/50">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-txt-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search folders..."
              className="w-full bg-background border border-border text-sm text-txt-primary rounded-md pl-9 pr-3 py-2 outline-none focus:border-txt-brand focus:ring-1 focus:ring-txt-brand transition-all placeholder:text-txt-muted"
            />
          </div>
        </div>

        <div className="flex px-4 py-2 text-xs font-medium text-txt-muted border-b border-border/50 bg-background/50">
          Available Folders
        </div>

        <div className="max-h-[300px] overflow-y-auto p-2">
          {filteredFolders.length === 0 ? (
            <div className="py-8 text-center text-xs text-txt-muted">
              No folders found.
            </div>
          ) : (
            filteredFolders.map((folder) => (
              <div
                key={folder.path}
                onClick={() => setSelectedFolderPath(folder.path)}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors group",
                  selectedFolderPath === folder.path ? "bg-accent/70" : "hover:bg-accent/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <Folder className="h-4 w-4 text-txt-secondary shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-txt-primary leading-tight">
                      {folder.name}
                    </span>
                    {folder.depth > 0 && (
                      <span className="text-[10px] text-txt-muted leading-tight mt-0.5">
                        Subfolder
                      </span>
                    )}
                  </div>
                </div>
                {selectedFolderPath === folder.path && (
                  <Check className="h-4 w-4 text-txt-brand shrink-0" />
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 pt-3 flex items-center justify-end gap-2 border-t border-border/50 bg-background/50">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-4 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selectedFolderPath || isMoving}
            onClick={handleMove}
            className="h-8 px-4 text-xs font-medium"
          >
            {isMoving ? "Moving..." : "Move"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
