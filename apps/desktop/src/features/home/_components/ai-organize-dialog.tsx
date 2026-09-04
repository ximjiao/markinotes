"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Folder,
  FolderPlus,
  Loader2,
  FileText,
  Check,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIOrganizeResponse } from "../_types/home.types";

interface AIOrganizeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: AIOrganizeResponse;
  draftTitles: { id: string; title: string }[];
  onConfirm: (approvedMoves: AIOrganizeResponse) => void;
  isLoading?: boolean;
}

interface ItemRow {
  noteId: string;
  noteTitle: string;
  type: "move" | "create";
  folderDisplayName: string;
  rawTarget: string;
}

export function AIOrganizeDialog({
  isOpen,
  onClose,
  suggestions,
  draftTitles,
  onConfirm,
  isLoading,
}: AIOrganizeDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Extract all suggested items into a flat list
  const items: ItemRow[] = React.useMemo(() => {
    const list: ItemRow[] = [];

    if (suggestions.creates) {
      for (const [noteId, folderName] of Object.entries(suggestions.creates)) {
        const note = draftTitles.find((n) => n.id === noteId);
        list.push({
          noteId,
          noteTitle: note?.title || "Untitled Note",
          type: "create",
          folderDisplayName: folderName,
          rawTarget: folderName,
        });
      }
    }

    if (suggestions.moves) {
      for (const [noteId, folderPath] of Object.entries(suggestions.moves)) {
        const note = draftTitles.find((n) => n.id === noteId);
        const folderName = folderPath.split("/").pop() || folderPath;
        list.push({
          noteId,
          noteTitle: note?.title || "Untitled Note",
          type: "move",
          folderDisplayName: folderName,
          rawTarget: folderPath,
        });
      }
    }

    return list;
  }, [suggestions, draftTitles]);

  // Select all items by default whenever new suggestions arrive
  useEffect(() => {
    if (items.length > 0) {
      setSelectedIds(new Set(items.map((i) => i.noteId)));
    } else {
      setSelectedIds(new Set());
    }
  }, [items]);

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const selectedCount = selectedIds.size;

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.noteId)));
    }
  };

  const handleConfirm = async () => {
    if (selectedCount === 0) return;
    setIsProcessing(true);

    const approvedMoves: AIOrganizeResponse = {
      moves: {},
      creates: {},
    };

    if (suggestions.moves) {
      for (const [noteId, folderPath] of Object.entries(suggestions.moves)) {
        if (selectedIds.has(noteId)) {
          approvedMoves.moves![noteId] = folderPath;
        }
      }
    }

    if (suggestions.creates) {
      for (const [noteId, folderName] of Object.entries(suggestions.creates)) {
        if (selectedIds.has(noteId)) {
          approvedMoves.creates![noteId] = folderName;
        }
      }
    }

    await onConfirm(approvedMoves);
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border shadow-2xl p-6">
        <DialogHeader className="gap-1 pb-1">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-txt-primary">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Organize Notes with AI
          </DialogTitle>
          <DialogDescription className="text-xs text-txt-muted">
            {isLoading
              ? "AI is analyzing your notes and categorizing folders..."
              : items.length > 0
              ? "Review suggested destinations below. Uncheck any notes you prefer to keep in Drafts."
              : "No notes found to organize."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-txt-muted gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-txt-brand" />
            <span className="text-xs font-medium">Categorizing your notes…</span>
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-2.5 my-2">
            {/* Toolbar count & Select all */}
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="text-txt-muted font-medium">
                {selectedCount} of {items.length} notes selected
              </span>
              <button
                type="button"
                onClick={handleToggleAll}
                className="text-xs text-txt-brand hover:underline font-medium"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>

            {/* List of notes */}
            <div className="max-h-[320px] overflow-y-auto pr-1 space-y-1.5 border border-border/60 rounded-xl p-2 bg-muted/20">
              {items.map((item) => {
                const isChecked = selectedIds.has(item.noteId);
                const isNew = item.type === "create";

                return (
                  <div
                    key={item.noteId}
                    onClick={() => handleToggle(item.noteId)}
                    className={cn(
                      "flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-all cursor-pointer select-none",
                      isChecked
                        ? "bg-background border-border shadow-sm hover:border-txt-brand/40"
                        : "bg-background/40 border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    {/* Left: Checkbox + File Title */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={cn(
                          "w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0",
                          isChecked
                            ? "bg-txt-brand border-txt-brand text-background"
                            : "border-muted-foreground/40 bg-transparent"
                        )}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>

                      <FileText className="h-4 w-4 text-txt-muted shrink-0" />
                      <span className="text-xs font-medium text-txt-primary truncate">
                        {item.noteTitle}
                      </span>
                    </div>

                    {/* Right: Target Folder Badge */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ArrowRight className="h-3 w-3 text-txt-muted/60" />
                      {isNew ? (
                        <div className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          <FolderPlus className="h-3 w-3" />
                          <span className="truncate max-w-[110px]">
                            {item.folderDisplayName}
                          </span>
                          <span className="text-[9px] uppercase tracking-wide opacity-80 font-bold ml-0.5">
                            New
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-[11px] font-medium text-txt-secondary bg-muted px-2 py-0.5 rounded-md border border-border">
                          <Folder className="h-3 w-3 text-amber-500" />
                          <span className="truncate max-w-[120px]">
                            {item.folderDisplayName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isProcessing || isLoading}
            className="text-xs h-8"
          >
            Cancel
          </Button>

          {!isLoading && items.length > 0 && (
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isProcessing || selectedCount === 0}
              className="gap-1.5 text-xs h-8"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Moving...
                </>
              ) : (
                <>
                  Move {selectedCount > 0 ? `${selectedCount} Note${selectedCount > 1 ? "s" : ""}` : ""}
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
