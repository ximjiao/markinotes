"use client";

import React, { useState, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { Bold, Italic, Strikethrough, Code, Heading1, Heading2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface BubbleToolbarProps {
  editor: Editor | null;
}

export function BubbleToolbar({ editor }: BubbleToolbarProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const updateSelectionPos = () => {
      try {
        const { selection } = editor.state;
        if (!selection || selection.empty || editor.isActive("image")) {
          setPos(null);
          return;
        }

        const domSelection = window.getSelection();
        if (!domSelection || domSelection.rangeCount === 0) {
          setPos(null);
          return;
        }

        const range = domSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (rect && rect.width > 0) {
          setPos({
            top: rect.top - 48,
            left: rect.left + rect.width / 2,
          });
        } else {
          setPos(null);
        }
      } catch {
        setPos(null);
      }
    };

    editor.on("selectionUpdate", updateSelectionPos);
    editor.on("transaction", updateSelectionPos);

    return () => {
      try {
        editor.off("selectionUpdate", updateSelectionPos);
        editor.off("transaction", updateSelectionPos);
      } catch {
        // Safe unmount
      }
    };
  }, [editor]);

  if (!editor || editor.isDestroyed || !pos) return null;

  return (
    <div
      className="fixed z-50 flex items-center gap-0.5 rounded-lg border border-border bg-popover/95 p-1 shadow-2xl backdrop-blur -translate-x-1/2 transition-all duration-100 text-txt-primary"
      style={{ top: `${Math.max(12, pos.top)}px`, left: `${pos.left}px` }}
    >
      <Button
        variant={editor.isActive("bold") ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={editor.isActive("italic") ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={editor.isActive("strike") ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={editor.isActive("code") ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="h-3.5 w-3.5" />
      </Button>
      <Separator orientation="vertical" className="h-4 mx-0.5" />
      <Button
        variant={editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
