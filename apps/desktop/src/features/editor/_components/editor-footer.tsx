"use client";

import React from "react";

interface EditorFooterProps {
  wordCount: number;
  charCount: number;
}

export function EditorFooter({
  wordCount,
  charCount,
}: EditorFooterProps) {
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <footer className="flex items-center justify-center border-t border-border bg-background px-6 py-1.5 text-[11px] text-txt-muted select-none shrink-0">
      {/* Metrics */}
      <div className="flex items-center gap-3">
        <span>{wordCount} words</span>
        <span>•</span>
        <span>{charCount} characters</span>
        <span>•</span>
        <span>~{readTimeMin} min read</span>
      </div>
    </footer>
  );
}
