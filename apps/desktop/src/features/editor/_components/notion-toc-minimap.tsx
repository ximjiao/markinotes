"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";

interface HeadingItem {
  id: string;
  level: number;
  text: string;
  pos: number;
}

interface NotionTocMinimapProps {
  editor: Editor | null;
}

export function NotionTocMinimap({ editor }: NotionTocMinimapProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activePos, setActivePos] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Extract all headings from the editor document
  const extractHeadings = useCallback(() => {
    if (!editor || editor.isDestroyed || !editor.state?.doc) {
      setHeadings([]);
      return;
    }

    const items: HeadingItem[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        const text = node.textContent.trim();
        if (text) {
          items.push({
            id: `heading-${pos}`,
            level: node.attrs.level || 1,
            text,
            pos,
          });
        }
      }
    });

    setHeadings(items);
  }, [editor]);

  // Update headings on editor updates
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    extractHeadings();

    const handleUpdate = () => {
      extractHeadings();
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor, extractHeadings]);

  // Track active heading based on scroll position in the viewport
  useEffect(() => {
    if (!editor || editor.isDestroyed || headings.length === 0) return;

    const editorDom = editor.view.dom;
    const scrollContainer = editorDom.closest(".overflow-y-auto") || window;

    const handleScroll = () => {
      const editorRect = editorDom.getBoundingClientRect();
      const containerTop = scrollContainer instanceof HTMLElement ? scrollContainer.getBoundingClientRect().top : 0;
      const targetThreshold = containerTop + 140;

      let currentActivePos = headings[0]?.pos ?? null;

      for (const item of headings) {
        try {
          const domNode = editor.view.nodeDOM(item.pos) as HTMLElement | null;
          if (domNode) {
            const rect = domNode.getBoundingClientRect();
            if (rect.top <= targetThreshold) {
              currentActivePos = item.pos;
            } else {
              break;
            }
          }
        } catch {
          // Safe fallback
        }
      }

      setActivePos(currentActivePos);
    };

    handleScroll();
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [editor, headings]);

  // Smooth scroll to target heading
  const handleScrollToHeading = (pos: number) => {
    if (!editor || editor.isDestroyed) return;

    try {
      const domNode = editor.view.nodeDOM(pos) as HTMLElement | null;
      if (domNode) {
        domNode.scrollIntoView({ behavior: "smooth", block: "start" });
        editor.chain().focus().setTextSelection(pos + 1).run();
      }
    } catch {
      // Safe fallback
    }
  };

  // Only display when there is at least 1 heading in the document
  if (!editor || headings.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed right-5 top-[20%] z-30 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ─── 1. Notion Floating TOC Outline Minimap Bars (Hidden when hovered) ─── */}
      <div
        className={cn(
          "flex flex-col items-end gap-1.5 py-1 px-1 cursor-pointer bg-transparent transition-opacity duration-150",
          isHovered ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        {headings.map((item) => {
          const isActive = activePos === item.pos;

          // Bar width based on heading level (H1: 18px, H2: 14px, H3: 10px)
          const barWidth =
            item.level === 1
              ? "w-[18px]"
              : item.level === 2
                ? "w-[14px]"
                : "w-[10px]";

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleScrollToHeading(item.pos)}
              className={cn(
                "h-[2.5px] rounded-full transition-all duration-150 outline-none block",
                barWidth,
                isActive
                  ? "bg-primary opacity-100"
                  : "bg-muted-foreground/35 hover:bg-primary/80 hover:opacity-100"
              )}
              aria-label={`Jump to ${item.text}`}
            />
          );
        })}
      </div>

      {/* ─── 2. Notion TOC Popover Card (Replaces the bars on Hover) ─── */}
      <div
        className={cn(
          "absolute right-0 top-0 w-56 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover/95 backdrop-blur-md p-1.5 text-popover-foreground shadow-xl transition-all duration-150 origin-top-right",
          isHovered
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        <div className="space-y-0.5">
          {headings.map((item) => {
            const isActive = activePos === item.pos;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  handleScrollToHeading(item.pos);
                  setIsHovered(false);
                }}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-xs outline-none transition-colors",
                  item.level === 1 && "font-medium text-txt-primary",
                  item.level === 2 && "pl-4 text-txt-muted hover:text-txt-primary",
                  item.level === 3 && "pl-6 text-txt-muted/80 hover:text-txt-primary",
                  isActive
                    ? "text-txt-brand font-semibold bg-accent/60"
                    : "text-txt-muted hover:bg-accent hover:text-txt-primary"
                )}
                aria-label={item.text}
              >
                <span className="truncate">{item.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
