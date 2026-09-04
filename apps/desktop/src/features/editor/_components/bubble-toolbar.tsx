"use client";

import React, { useState, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { Bold, Italic, Strikethrough, Code, Heading1, Heading2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface BubbleToolbarProps {
  editor: Editor | null;
}

export function BubbleToolbar({ editor }: BubbleToolbarProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const handleOpenLinkPopover = (open: boolean) => {
    if (open && editor) {
      const currentHref = editor.getAttributes("link").href || "";
      setLinkUrl(currentHref);
    }
    setIsLinkOpen(open);
  };

  const handleSetLink = () => {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    }
    setIsLinkOpen(false);
    setLinkUrl("");
  };

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
      <Popover open={isLinkOpen} onOpenChange={handleOpenLinkPopover}>
        <PopoverTrigger asChild>
          <Button
            variant={editor.isActive("link") ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            title="Tautan / Link (⌘K)"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="center" className="w-64 p-2 bg-popover border border-border rounded-xl shadow-xl z-50 text-xs">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetLink()}
              placeholder="https://..."
              className="flex-1 bg-accent/40 text-txt-primary text-xs px-2.5 py-1.5 rounded-lg border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/60"
              autoFocus
            />
            <Button size="sm" onClick={handleSetLink} className="h-7 px-2 text-xs">
              Set
            </Button>
          </div>
        </PopoverContent>
      </Popover>
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
