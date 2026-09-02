"use client";

import React from "react";
import type { Editor } from "@tiptap/react";
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Table as TableIcon,
  FileType,
  FileCode,
  Heading1,
  Heading2,
  Heading3,
  ChevronDown,
  MoreVertical,
  RemoveFormatting,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ExportType, NoteDocument } from "../_types/editor.types";
import { exportDocument } from "../_lib/export-engine";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  editor: Editor | null;
  doc: NoteDocument;
}

export function EditorToolbar({ editor, doc }: EditorToolbarProps) {
  if (!editor) return null;

  const handleExport = (type: ExportType) => {
    exportDocument(doc, editor.getHTML(), type);
  };

  const getHeadingLabel = () => {
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    return "Normal text";
  };

  return (
    <div className="flex items-center justify-between gap-1 border-b border-border bg-background px-4 py-1.5 overflow-x-auto text-txt-primary shrink-0 select-none">
      {/* Left Formatting Tools Group */}
      <div className="flex items-center gap-1">
        {/* Undo / Redo */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Cmd+Z)"
        >
          <Undo className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-4 mx-1" />

        {/* Heading Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-medium gap-1 text-txt-secondary"
              onMouseDown={(e) => e.preventDefault()}
            >
              <span>{getHeadingLabel()}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={cn("text-xs font-normal", !editor.isActive("heading") && "font-bold text-txt-brand")}
            >
              Normal text
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={cn("text-xs flex items-center gap-2", editor.isActive("heading", { level: 1 }) && "font-bold text-txt-brand")}
            >
              <Heading1 className="h-3.5 w-3.5" /> Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={cn("text-xs flex items-center gap-2", editor.isActive("heading", { level: 2 }) && "font-bold text-txt-brand")}
            >
              <Heading2 className="h-3.5 w-3.5" /> Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={cn("text-xs flex items-center gap-2", editor.isActive("heading", { level: 3 }) && "font-bold text-txt-brand")}
            >
              <Heading3 className="h-3.5 w-3.5" /> Heading 3
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-4 mx-1" />

        {/* Inline Formatting Buttons */}
        <Button
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Cmd+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Cmd+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={editor.isActive("strike") ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={editor.isActive("code") ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Inline Code"
        >
          <Code className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-4 mx-1" />

        {/* Lists & Block Elements */}
        <Button
          variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={editor.isActive("taskList") ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          title="To-do List"
        >
          <CheckSquare className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote Block"
        >
          <Quote className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={editor.isActive("table") ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Insert Table"
        >
          <TableIcon className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-4 mx-1" />

        {/* Clear Formatting */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="Clear Formatting"
        >
          <RemoveFormatting className="h-3.5 w-3.5 text-txt-muted" />
        </Button>
      </div>

      {/* Right Ellipsis (...) Vertical Button for Export Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-txt-secondary hover:text-txt-primary"
            onMouseDown={(e) => e.preventDefault()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <div className="px-2 py-1 text-[11px] font-semibold text-txt-muted capitalize">
            Export Document
          </div>
          <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer text-xs">
            <FileType className="mr-2 h-4 w-4 text-red-500" /> Export to PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("docx")} className="cursor-pointer text-xs">
            <FileType className="mr-2 h-4 w-4 text-blue-500" /> Export to Word (.docx)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("md")} className="cursor-pointer text-xs">
            <FileCode className="mr-2 h-4 w-4 text-purple-500" /> Export to Markdown (.md)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("txt")} className="cursor-pointer text-xs">
            <FileType className="mr-2 h-4 w-4 text-gray-500" /> Export to Plain Text (.txt)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
