"use client";

import React from "react";
import { CheckCircle2, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SaveStatus } from "../_hooks/use-tiptap-editor";

interface EditorFooterProps {
  saveStatus: SaveStatus;
  wordCount: number;
  charCount: number;
  saveCountdown?: number | null;
  onSummarize?: () => void;
  isSummarizing?: boolean;
}

export function EditorFooter({
  saveStatus,
  wordCount,
  charCount,
  saveCountdown,
  onSummarize,
  isSummarizing = false,
}: EditorFooterProps) {
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

      {/* Save Status & AI Actions (Bottom Right) */}
      <div className="flex items-center gap-2">
        {/* Save Status Indicator */}
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

        {/* Summarize with AI Button (Sebelah kanan save item) */}
        {onSummarize && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSummarize}
            disabled={isSummarizing}
            className="h-5 px-2 text-[10px] gap-1 font-medium text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:text-purple-700 dark:hover:text-purple-300 transition-colors shadow-xs"
          >
            {isSummarizing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3 text-purple-500" />
            )}
            Summarize with AI
          </Button>
        )}
      </div>
    </footer>
  );
}
