"use client";

import React from "react";

export function Titlebar() {
  return (
    <header
      data-tauri-drag-region
      className="h-7 w-full flex items-center justify-center relative bg-background border-b border-border/40 select-none shrink-0 z-50"
    >
      {/* Centered Title */}
      <span
        data-tauri-drag-region
        className="text-[11px] font-medium text-txt-secondary/80 tracking-wide pointer-events-none"
      >
        Markidown
      </span>
    </header>
  );
}
