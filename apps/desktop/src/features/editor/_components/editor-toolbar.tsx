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
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
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
import type { SaveStatus } from "../_hooks/use-tiptap-editor";

interface EditorToolbarProps {
  editor: Editor | null;
  doc: NoteDocument;
  saveStatus?: SaveStatus;
  saveCountdown?: number | null;
  onSummarize?: () => void;
  isSummarizing?: boolean;
}

export function EditorToolbar({ 
  editor, 
  doc,
  saveStatus,
  saveCountdown,
  onSummarize,
  isSummarizing = false,
}: EditorToolbarProps) {
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
            <div className="px-2 py-1 text-[11px] font-semibold text-txt-muted uppercase tracking-wider">
              Hierarchy
            </div>
            <DropdownMenuItem
              className={cn("text-xs cursor-pointer", editor.isActive("heading", { level: 1 }) && "bg-secondary font-medium")}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <Heading1 className="mr-2 h-4 w-4 text-txt-secondary" /> Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn("text-xs cursor-pointer", editor.isActive("heading", { level: 2 }) && "bg-secondary font-medium")}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="mr-2 h-4 w-4 text-txt-secondary" /> Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn("text-xs cursor-pointer", editor.isActive("heading", { level: 3 }) && "bg-secondary font-medium")}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <Heading3 className="mr-2 h-4 w-4 text-txt-secondary" /> Heading 3
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn("text-xs cursor-pointer", !editor.isActive("heading") && "bg-secondary font-medium")}
              onClick={() => editor.chain().focus().setParagraph().run()}
            >
              <span className="mr-2 w-4 inline-block text-center text-txt-secondary">¶</span> Normal text
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
          title="Strikethrough (Cmd+Shift+S)"
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

      {/* Right Side: Save Status, AI Actions & Export */}
      <div className="flex items-center gap-2">
        {/* Save Status Indicator */}
        {saveStatus === "saved" && (
          <div className="flex items-center h-6 px-2 text-[11px] gap-1 font-medium text-emerald-600 bg-emerald-500/10 rounded-full border border-emerald-600/30">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved
          </div>
        )}
        {saveStatus === "saving" && (
          <div className="flex items-center h-6 px-2 text-[11px] gap-1 font-medium text-amber-600 bg-amber-500/10 rounded-full border border-amber-600/30">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
          </div>
        )}
        {saveStatus === "dirty" && (
          <div className="flex items-center h-6 px-2 text-[11px] gap-1 font-medium text-txt-muted bg-secondary rounded-full border border-border">
            Unsaved {saveCountdown !== null ? `(in ${saveCountdown}s)` : ""}
          </div>
        )}
        {saveStatus === "error" && (
          <div className="flex items-center h-6 px-2 text-[11px] gap-1 font-medium text-red-600 bg-red-500/10 rounded-full border border-red-600/30">
            <AlertCircle className="h-3.5 w-3.5" /> Save Error
          </div>
        )}

        {/* Summarize with AI Button */}
        {onSummarize && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSummarize}
            disabled={isSummarizing}
            className="h-6 px-2 text-[11px] gap-1.5 font-medium text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:text-purple-700 dark:hover:text-purple-300 transition-colors shadow-xs rounded-full"
          >
            {isSummarizing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            )}
            Summarize with AI
          </Button>
        )}

        <Separator orientation="vertical" className="h-4 mx-1" />

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
    </div>
  );
}
