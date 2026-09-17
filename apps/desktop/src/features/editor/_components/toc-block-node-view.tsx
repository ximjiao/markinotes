"use client";

import React, { useState, useEffect, useCallback } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { BookOpen, ListTree, Trash2, ArrowUpRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface TocHeadingItem {
  id: string;
  level: number;
  text: string;
  pos: number;
}

export function TocBlockNodeView({ editor, deleteNode }: NodeViewProps) {
  const [headings, setHeadings] = useState<TocHeadingItem[]>([]);
  const [activePos, setActivePos] = useState<number | null>(null);

  // Extract all headings from the editor document
  const extractHeadings = useCallback(() => {
    if (!editor || editor.isDestroyed || !editor.state?.doc) {
      setHeadings([]);
      return;
    }

    const items: TocHeadingItem[] = [];
    editor.state.doc.descendants((docNode, pos) => {
      if (docNode.type.name === "heading") {
        const text = docNode.textContent.trim();
        if (text) {
          items.push({
            id: `toc-h-${pos}`,
            level: docNode.attrs.level || 1,
            text,
            pos,
          });
        }
      }
    });

    setHeadings(items);
  }, [editor]);

  // Subscribe to live editor updates
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    extractHeadings();

    const handleUpdate = () => {
      extractHeadings();
    };

    editor.on("update", handleUpdate);
    editor.on("transaction", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      editor.off("transaction", handleUpdate);
    };
  }, [editor, extractHeadings]);

  // Click to jump / scroll to heading in document
  const handleJumpToHeading = (pos: number) => {
    if (!editor || editor.isDestroyed) return;

    setActivePos(pos);

    try {
      editor.commands.setTextSelection(pos + 1);
      editor.commands.focus();

      const domNode = editor.view.nodeDOM(pos) as HTMLElement | null;
      if (domNode) {
        domNode.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // Flash highlight effect
        domNode.classList.add("ring-2", "ring-primary", "ring-offset-2", "rounded-md", "transition-all", "duration-500");
        setTimeout(() => {
          domNode.classList.remove("ring-2", "ring-primary", "ring-offset-2", "rounded-md");
        }, 1500);
      }
    } catch (e) {
      console.error("Failed to jump to heading:", e);
    }
  };

  return (
    <NodeViewWrapper className="my-4 select-none">
      <div className="group/toc relative w-full rounded-2xl border border-border/80 bg-surface/50 dark:bg-surface/30 backdrop-blur-sm p-4 transition-all duration-200 shadow-xs hover:border-primary/40 hover:shadow-sm">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <ListTree className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-txt-primary tracking-tight">
                Table of Contents
              </span>
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-[10px] font-semibold text-txt-muted bg-secondary/80 border-border/60"
              >
                {headings.length} {headings.length === 1 ? "section" : "sections"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover/toc:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={extractHeadings}
              title="Refresh outline"
              className="h-7 w-7 text-txt-muted hover:text-txt-primary hover:bg-secondary rounded-lg cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={deleteNode}
              title="Delete Table of Contents"
              className="h-7 w-7 text-txt-muted hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Headings List */}
        <div className="pt-3 space-y-0.5">
          {headings.length === 0 ? (
            <div className="py-4 text-center text-txt-muted flex flex-col items-center justify-center gap-1.5 border border-dashed border-border/50 rounded-xl bg-secondary/20">
              <BookOpen className="h-5 w-5 text-txt-muted/60 mb-0.5" />
              <span className="text-xs font-medium text-txt-secondary">No headings found</span>
              <span className="text-[11px] text-txt-muted/80 max-w-xs">
                Add headings using <kbd className="px-1 py-0.5 rounded bg-background border text-[10px]"># H1</kbd>, <kbd className="px-1 py-0.5 rounded bg-background border text-[10px]">## H2</kbd>, or <kbd className="px-1 py-0.5 rounded bg-background border text-[10px]">### H3</kbd> to automatically populate this outline.
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              {headings.map((item) => {
                const isActive = activePos === item.pos;
                const indentClass =
                  item.level === 1
                    ? "pl-2 font-semibold text-xs text-txt-primary"
                    : item.level === 2
                    ? "pl-6 font-medium text-[11.5px] text-txt-secondary"
                    : item.level === 3
                    ? "pl-10 text-[11px] text-txt-muted hover:text-txt-secondary"
                    : "pl-14 text-[10.5px] text-txt-muted/80";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleJumpToHeading(item.pos)}
                    className={cn(
                      "group/item relative flex items-center justify-between py-1.5 pr-2.5 rounded-lg cursor-pointer transition-colors duration-150",
                      indentClass,
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent/60 hover:text-txt-primary"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Level Indicator Dot/Bullet */}
                      {item.level === 1 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      )}
                      {item.level === 2 && (
                        <span className="h-1 w-1 rounded-full bg-txt-muted shrink-0" />
                      )}
                      {item.level >= 3 && (
                        <span className="h-0.5 w-2 rounded bg-border shrink-0" />
                      )}

                      <span className="truncate leading-normal">
                        {item.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <span className="text-[9px] font-mono text-txt-muted uppercase px-1 rounded bg-secondary/80">
                        H{item.level}
                      </span>
                      <ArrowUpRight className="h-3 w-3 text-txt-muted group-hover/item:text-primary" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}
