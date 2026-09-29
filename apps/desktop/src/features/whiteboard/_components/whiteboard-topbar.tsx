"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ChevronDown,
  Plus,
  MoreHorizontal,
  ArrowLeft,
  Copy,
  Check,
  Trash2,
  CopyPlus,
  Edit2,
  Figma,
} from "lucide-react";
import { useWhiteboardStore } from "../_hooks/use-whiteboard-store";
import { copyElementsToFigmaClipboard } from "../_lib/figma-clipboard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";

export function WhiteboardTopBar({ onClose }: { onClose?: () => void } = {}) {
  const router = useRouter();
  const {
    board,
    setBoardTitle,
    setActivePage,
    addPage,
    renamePage,
    deletePage,
    duplicatePage,
  } = useWhiteboardStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pageNameInput, setPageNameInput] = useState("");
  const [copiedFigma, setCopiedFigma] = useState(false);
  const [isPagesOpen, setIsPagesOpen] = useState(false);

  const activePage =
    board.pages.find((p) => p.id === board.activePageId) || board.pages[0];

  const handleCopyFigma = async () => {
    if (!activePage) return;
    const success = await copyElementsToFigmaClipboard(
      activePage.elements,
      activePage.connectors
    );
    if (success) {
      setCopiedFigma(true);
      setTimeout(() => setCopiedFigma(false), 2000);
    }
  };

  const handleStartRenamePage = (pageId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPageId(pageId);
    setPageNameInput(currentName);
  };

  const handleSavePageRename = (pageId: string) => {
    if (pageNameInput.trim()) {
      renamePage(pageId, pageNameInput.trim());
    }
    setEditingPageId(null);
  };

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  return (
    <header className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none select-none">
      {/* Left Segment: Board Title & Pages Dropdown (Floating Pill) */}
      <div className="flex items-center gap-2 pointer-events-auto shadow-lg rounded-2xl border border-border/80 bg-background/95 backdrop-blur-md px-1.5 py-1.5 transition-all">
        {/* Back Button */}
        <button
          onClick={handleBack}
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Back to Editor"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="h-4 w-[1px] bg-border/80" />

        {/* Board Title Section */}
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">
            <Sparkles className="h-3.5 w-3.5" />
          </div>

          {isEditingTitle ? (
            <input
              autoFocus
              type="text"
              value={board.title}
              onChange={(e) => setBoardTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
              className="h-7 w-36 rounded-md border border-primary/40 bg-background px-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <span
              onClick={() => setIsEditingTitle(true)}
              className="cursor-pointer text-xs font-semibold text-foreground hover:text-primary transition-colors select-none max-w-[150px] truncate"
              title="Click to rename board"
            >
              {board.title || "UX Board"}
            </span>
          )}
        </div>

        <div className="h-4 w-[1px] bg-border/80" />

        {/* Pages Dropdown (FigJam style [8] General) */}
        <Popover open={isPagesOpen} onOpenChange={setIsPagesOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-3 py-1.5 text-xs font-semibold border border-purple-500/30 transition-all select-none shadow-2xs"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded border border-purple-600/40 text-[10px] font-bold">
                {board.pages.length}
              </div>
              <span className="max-w-[110px] truncate">{activePage?.name || "General"}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            sideOffset={8}
            className="w-64 p-2 rounded-2xl shadow-xl border-border/80 bg-background/95 backdrop-blur-md"
          >
            {/* Header: Pages + Add Button */}
            <div className="flex items-center justify-between px-2.5 py-2 border-b border-border/50">
              <span className="text-xs font-bold text-foreground tracking-tight">Pages</span>
              <button
                onClick={() => {
                  const newId = addPage();
                  setActivePage(newId);
                }}
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                title="Add Page"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* List of Pages */}
            <div className="mt-1.5 max-h-60 overflow-y-auto space-y-1 pr-1">
              {board.pages.map((page) => {
                const isActive = page.id === board.activePageId;
                const isRenaming = editingPageId === page.id;

                return (
                  <div
                    key={page.id}
                    onClick={() => {
                      if (!isRenaming) {
                        setActivePage(page.id);
                        setIsPagesOpen(false);
                      }
                    }}
                    className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer transition-all ${
                      isActive
                        ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 font-semibold border border-purple-500/25"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {isRenaming ? (
                      <input
                        autoFocus
                        type="text"
                        value={pageNameInput}
                        onChange={(e) => setPageNameInput(e.target.value)}
                        onBlur={() => handleSavePageRename(page.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSavePageRename(page.id);
                          if (e.key === "Escape") setEditingPageId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 w-full rounded border border-primary bg-background px-1.5 text-xs text-foreground focus:outline-none"
                      />
                    ) : (
                      <span className="truncate max-w-[140px]">{page.name}</span>
                    )}

                    {/* Page Actions Menu */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="flex h-5 w-5 items-center justify-center rounded hover:bg-background/80 text-muted-foreground hover:text-foreground"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 rounded-xl">
                          <DropdownMenuItem
                            onClick={(e) => handleStartRenamePage(page.id, page.name, e)}
                            className="text-xs gap-2"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => duplicatePage(page.id)}
                            className="text-xs gap-2"
                          >
                            <CopyPlus className="h-3.5 w-3.5" />
                            Duplicate
                          </DropdownMenuItem>
                          {board.pages.length > 1 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => deletePage(page.id)}
                                className="text-xs gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Right Segment: Export for Figma & Status */}
      <div className="flex items-center gap-2 pointer-events-auto shadow-md rounded-2xl border border-border/80 bg-background/95 backdrop-blur-md px-2 py-1.5">
        <button
          onClick={handleCopyFigma}
          type="button"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-purple-500 hover:to-indigo-500 transition-all active:scale-95"
          title="Copy elements into clipboard for Figma Auto-Layout & Vector"
        >
          {copiedFigma ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Copied for Figma!</span>
            </>
          ) : (
            <>
              <Figma className="h-3.5 w-3.5" />
              <span>Copy for Figma</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
