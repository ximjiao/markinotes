"use client";

import React, { useMemo, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  Sparkles,
  Maximize2,
  Copy,
  Check,
  Trash2,
  Layers,
  FileSpreadsheet,
  MousePointerClick,
} from "lucide-react";
import { parseWhiteboardFromMarkdown } from "../_lib/whiteboard-serializer";
import { copyElementsToFigmaClipboard } from "../_lib/figma-clipboard";
import { WhiteboardModalScreen } from "./whiteboard-modal-screen";
import type { WhiteboardBoardData } from "../_types/whiteboard.types";

export function WhiteboardBlockNodeView({
  node,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse board data from node attributes
  const boardData: WhiteboardBoardData = useMemo(() => {
    return parseWhiteboardFromMarkdown(node.attrs.data || "");
  }, [node.attrs.data]);

  const activePage =
    boardData.pages.find((p) => p.id === boardData.activePageId) ||
    boardData.pages[0];

  const totalElements = activePage?.elements?.length || 0;
  const totalPages = boardData.pages.length || 1;

  // Open full-screen screen
  const handleOpenBoard = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsExpanded(true);
  };

  // Sync board updates back to note document
  const handleSaveBoard = (updatedBoard: WhiteboardBoardData) => {
    updateAttributes({
      title: updatedBoard.title,
      data: JSON.stringify(updatedBoard),
    });
  };

  // Handle copy for Figma
  const handleCopyFigma = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activePage) return;
    const success = await copyElementsToFigmaClipboard(
      activePage.elements,
      activePage.connectors
    );
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <NodeViewWrapper className="my-6 not-prose select-none">
      <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card/90 to-card/60 p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md backdrop-blur-sm">
        {/* Top bar preview */}
        <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground tracking-tight">
                {boardData.title || "UX Board / Whiteboard"}
              </h4>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {totalPages} {totalPages === 1 ? "Page" : "Pages"}
                </span>
                <span>•</span>
                <span>
                  {totalElements} {totalElements === 1 ? "item" : "items"} in{" "}
                  <strong className="text-foreground/80 font-medium">
                    {activePage?.name || "General"}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 opacity-90 transition-opacity group-hover:opacity-100">
            <button
              onClick={handleCopyFigma}
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/80 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shadow-xs"
              title="Copy elements for Figma (Auto-layout & Vector)"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy for Figma</span>
                </>
              )}
            </button>

            <button
              onClick={handleOpenBoard}
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-95"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Open Board</span>
            </button>

            <button
              onClick={() => deleteNode()}
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-1"
              title="Delete block"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Visual Preview Canvas Box */}
        <div
          onClick={handleOpenBoard}
          className="relative mt-3.5 flex h-48 w-full cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-border/40 bg-radial from-slate-100/80 to-slate-200/50 dark:from-slate-900/60 dark:to-slate-950/80 p-4 transition-transform hover:scale-[1.005]"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: "16px 16px",
            color: "rgba(148, 163, 184, 0.25)",
          }}
        >
          {/* Mock element cards inside preview */}
          <div className="relative flex flex-wrap items-start gap-4">
            {activePage?.elements?.slice(0, 4).map((el, i) => (
              <div
                key={el.id || i}
                className="flex flex-col justify-between rounded-lg p-3 shadow-xs border border-black/5 transition-all text-left"
                style={{
                  backgroundColor: el.color || "#FEF08A",
                  width: Math.min(160, el.width),
                  minHeight: 65,
                }}
              >
                {el.title && (
                  <span className="text-[11px] font-bold text-slate-900 truncate">
                    {el.title}
                  </span>
                )}
                <span className="text-[10px] text-slate-700 line-clamp-2 leading-relaxed">
                  {el.content || "Empty node"}
                </span>
              </div>
            ))}

            {(!activePage?.elements || activePage.elements.length === 0) && (
              <div className="flex h-32 w-full flex-col items-center justify-center gap-1.5 text-center text-muted-foreground">
                <FileSpreadsheet className="h-6 w-6 opacity-40" />
                <p className="text-xs">Empty canvas page</p>
                <p className="text-[11px] opacity-70">
                  Click to open and start drawing sticky notes & flows
                </p>
              </div>
            )}
          </div>

          {/* Hover prompt hint */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 mt-auto pt-2">
            <span className="flex items-center gap-1">
              <MousePointerClick className="h-3.5 w-3.5 text-primary" />
              Click canvas to expand full screen
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider bg-background/60 px-2 py-0.5 rounded border border-border/40">
              FigJam Mode
            </span>
          </div>
        </div>
      </div>

      {/* Full-screen FigJam Screen Modal */}
      <WhiteboardModalScreen
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        initialBoard={boardData}
        onSave={handleSaveBoard}
      />
    </NodeViewWrapper>
  );
}
