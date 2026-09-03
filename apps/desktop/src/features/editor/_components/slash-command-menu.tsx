"use client";

import React, { useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Code, Table, Quote, Minus, Image as ImageIcon } from "lucide-react";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

interface SlashCommandMenuProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenImageDialog?: () => void;
}

export function SlashCommandMenu({ editor, isOpen, onClose, onOpenImageDialog }: SlashCommandMenuProps) {
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        const { selection } = editor.state;
        const parentNode = selection.$anchor.parent;
        if (parentNode.textContent.trim() === "") {
          // Open slash menu when typing / on empty line
          onClose();
        }
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener("keyup", (e: KeyboardEvent) => {
      if (e.key === "/") {
        const { selection } = editor.state;
        const text = selection.$anchor.parent.textContent;
        if (text === "/" || text.trim() === "/") {
          // Clear the '/' char and open menu
          editor.chain().focus().deleteRange({ from: selection.from - 1, to: selection.from }).run();
          // Open menu via trigger
          window.dispatchEvent(new CustomEvent("open-slash-menu"));
        }
      }
    });
  }, [editor, onClose]);

  if (!editor) return null;

  const commands = [
    {
      title: "Heading 1",
      description: "Big section heading",
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: "Heading 2",
      description: "Medium section heading",
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: "Heading 3",
      description: "Small section heading",
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      title: "Image",
      description: "Upload local file or embed image link",
      icon: ImageIcon,
      action: () => {
        onOpenImageDialog?.();
      },
    },
    {
      title: "Bullet List",
      description: "Create a simple bulleted list",
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: "Numbered List",
      description: "Create a list with numbers",
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      title: "To-do List",
      description: "Track tasks with a check list",
      icon: CheckSquare,
      action: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      title: "Code Block",
      description: "Capture code snippet with syntax",
      icon: Code,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: "Table",
      description: "Insert a 3x3 table",
      icon: Table,
      action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      title: "Quote",
      description: "Capture a quote block",
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      title: "Divider",
      description: "Visually divide blocks with a line",
      icon: Minus,
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
  ];

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <CommandInput placeholder="Search blocks to insert..." />
      <CommandList>
        <CommandEmpty>No matching block found.</CommandEmpty>
        <CommandGroup heading="Basic Blocks">
          {commands.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <CommandItem
                key={cmd.title}
                onSelect={() => {
                  cmd.action();
                  onClose();
                }}
                className="flex items-center gap-3 cursor-pointer py-2"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-accent/40 text-txt-brand shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-txt-primary">{cmd.title}</span>
                  <span className="text-[11px] text-txt-muted">{cmd.description}</span>
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
