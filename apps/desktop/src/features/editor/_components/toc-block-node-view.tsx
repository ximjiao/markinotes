"use client";

import React, { useState, useEffect, useCallback } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { BookOpen, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UI_COPY } from "@/lib/constants/copy";

export interface TocHeadingItem {
  id: string;
  level: number;
  text: string;
  pos: number;
}

export function TocBlockNodeView({ editor, deleteNode }: NodeViewProps) {
  const [headings, setHeadings] = useState<TocHeadingItem[]>([]);

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
        domNode.classList.add("ring-2", "ring-primary", "ring-offset-4", "rounded-md", "transition-all", "duration-500");
        setTimeout(() => {
          domNode.classList.remove("ring-2", "ring-primary", "ring-offset-4", "rounded-md");
        }, 1500);
      }
    } catch (e) {
      console.error("Failed to jump to heading:", e);
    }
  };

  return (
    <NodeViewWrapper className="my-3 select-none">
      <div className="group/toc relative w-full py-1">
        {/* Floating Delete Button on Hover */}
        <button
          type="button"
          onClick={deleteNode}
          title={UI_COPY.editor.toc.deleteTitle}
          className="absolute -top-1 right-0 opacity-0 group-hover/toc:opacity-100 transition-opacity p-1 text-txt-muted hover:text-destructive rounded cursor-pointer z-10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        {/* Headings List */}
        {headings.length === 0 ? (
          <div className="py-2 text-txt-muted/70 flex items-center gap-2 text-sm italic">
            <BookOpen className="h-4 w-4 opacity-50" />
            <span>{UI_COPY.editor.toc.empty}</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {headings.map((item) => {
              const indentClass =
                item.level === 1
                  ? "pl-0"
                  : item.level === 2
                  ? "pl-6"
                  : item.level === 3
                  ? "pl-12"
                  : "pl-16";

              return (
                <div key={item.id} className={cn("leading-relaxed", indentClass)}>
                  <span
                    onClick={() => handleJumpToHeading(item.pos)}
                    className="inline-block cursor-pointer text-txt-secondary hover:text-txt-primary underline decoration-border hover:decoration-txt-primary underline-offset-4 decoration-[1.5px] transition-colors text-[14px]"
                  >
                    {item.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}


