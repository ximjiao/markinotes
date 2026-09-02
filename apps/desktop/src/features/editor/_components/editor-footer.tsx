"use client";

import React from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SaveStatus } from "../_hooks/use-tiptap-editor";

interface EditorFooterProps {
  saveStatus: SaveStatus;
  wordCount: number;
  charCount: number;
  saveCountdown?: number | null;
}

export function EditorFooter({ saveStatus, wordCount, charCount, saveCountdown }: EditorFooterProps) {
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <footer className="flex items-center justify-between border-t border-border bg-background px-6 py-1.5 text-[11px] text-txt-muted select-none shrink-0">
      {/* Metrics */}
      <div className="flex items-center gap-3">
        <span>{wordCount} words</span>
        <span>•</span>
        <span>{charCount} characters</span>
        <span>•</span>
        <span>~{readTimeMin} min read</span>
      </div>

      {/* Save Status Indicator */}
      <div className="flex items-center gap-1.5">
        {saveStatus === "saved" && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 font-normal text-emerald-600 border-emerald-600/30 bg-emerald-500/10">
            <CheckCircle2 className="h-3 w-3" /> Saved
          </Badge>
        )}
        {saveStatus === "saving" && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 font-normal text-amber-600 border-amber-600/30 bg-amber-500/10">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving...
          </Badge>
        )}
        {saveStatus === "dirty" && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 font-normal text-txt-muted border-border">
            Unsaved changes {saveCountdown !== null ? `(saving in ${saveCountdown}s)` : ""}
          </Badge>
        )}
        {saveStatus === "error" && (
          <Badge variant="destructive" className="h-5 px-1.5 text-[10px] gap-1 font-normal">
            <AlertCircle className="h-3 w-3" /> Save Error
          </Badge>
        )}
      </div>
    </footer>
  );
}
