"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkles, Save, FileText, Tag, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface AiSaveConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tags: string[];
  onSave: () => void;
  onSaveAsDraft: () => void;
}

export function AiSaveConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  tags,
  onSave,
  onSaveAsDraft,
}: AiSaveConfirmDialogProps) {
  const displayTitle = title?.trim() ? title : "Untitled Draft";
  const displayTags = tags.length > 0 ? tags : ["draft"];

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md p-6 bg-card border-border shadow-2xl rounded-2xl animate-in fade-in-0 zoom-in-95 duration-200">
        <AlertDialogHeader className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex flex-col text-left">
              <AlertDialogTitle className="text-base font-semibold text-txt-primary">
                Save AI Changes?
              </AlertDialogTitle>
              <span className="text-xs text-txt-muted">
                You generated or modified content with AI in this note.
              </span>
            </div>
          </div>

          <AlertDialogDescription className="text-xs text-txt-secondary leading-relaxed pt-1">
            Would you like to save this note now, or keep it as an auto-saved draft? If you choose to keep it as a draft, it will be automatically saved on every change.
          </AlertDialogDescription>

          {/* Note Info Preview Box */}
          <div className="rounded-lg border border-border/70 bg-secondary/30 p-3 flex flex-col gap-2 mt-1">
            <div className="flex items-center gap-2 text-xs font-medium text-txt-primary truncate">
              <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">{displayTitle}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag className="h-3 w-3 text-txt-muted shrink-0" />
              {displayTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="h-5 px-1.5 text-[10px] font-normal text-txt-secondary border-border bg-background"
                >
                  #{tag}
                </Badge>
              ))}
              <div className="flex items-center gap-1 ml-auto text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <Clock className="h-3 w-3" />
                <span>Auto-save enabled</span>
              </div>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex items-center justify-end gap-2 pt-3 sm:space-x-0">
          <AlertDialogCancel
            onClick={onSaveAsDraft}
            className="h-8 px-3 text-xs font-medium border-border hover:bg-secondary/60 text-txt-secondary cursor-pointer rounded-lg"
          >
            Keep as Draft
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onSave}
            className="h-8 px-3.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 cursor-pointer rounded-lg shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            Save Note
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
