"use client";

import React from "react";
import { Search, Plus, LayoutGrid, List, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { ViewMode } from "../_types/home.types";

interface HomeHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNewNote: () => void;
}

export function HomeHeader({
  searchQuery,
  onSearchChange,
  onNewNote,
}: HomeHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-4 py-2.5 h-12 gap-4">
      {/* 1. Left Side: Sidebar Trigger Button */}
      <div className="flex items-center shrink-0">
        <SidebarTrigger className="h-8 w-8 text-txt-secondary hover:text-txt-primary shrink-0" />
      </div>

      {/* 2. Center Side: Search Bar */}
      <div className="flex-1 w-full max-w-md mx-auto">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-txt-muted" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search documents... (Cmd+K)"
            className="pl-9 pr-4 h-8 bg-accent/50 text-xs text-txt-primary border-border placeholder:text-txt-muted focus-visible:ring-primary w-full shadow-sm"
          />
        </div>
      </div>

      {/* 3. Right Side: Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">

        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 hidden sm:flex">
          <Sparkles className="h-3.5 w-3.5 text-txt-brand" />
          Templates
        </Button>

        <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" onClick={onNewNote}>
          <Plus className="h-3.5 w-3.5" />
          New Doc
        </Button>
      </div>
    </header>
  );
}
