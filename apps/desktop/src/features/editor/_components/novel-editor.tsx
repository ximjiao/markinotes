"use client";

import React, { useState } from "react";
import {
  EditorRoot,
  EditorContent,
  EditorCommand,
  EditorCommandItem,
  EditorCommandEmpty,
  EditorCommandList,
  EditorBubble,
  EditorBubbleItem,
  Command,
  createSuggestionItems,
  renderItems,
  GlobalDragHandle,
} from "novel";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Markdown } from "tiptap-markdown";

import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Table as TableIcon,
  Quote,
  Minus,
  Bold,
  Italic,
  Strikethrough,
  MoreVertical,
  FileType,
  FileCode,
  ArrowLeft,
  Undo,
  Redo,
  ChevronDown,
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
import { exportDocument } from "../_lib/export-engine";
import type { ExportType, NoteDocument } from "../_types/editor.types";
import { EditorFooter } from "./editor-footer";
import { NotionBlockSideHandle } from "./notion-block-side-handle";

interface NovelEditorProps {
  initialTitle?: string;
  initialContent?: string;
  onBack?: () => void;
}

const suggestionItems = createSuggestionItems([
  {
    title: "Heading 1",
    description: "Judul seksi besar",
    icon: <Heading1 className="h-4 w-4" />,
    searchTerms: ["h1", "heading", "title"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Judul seksi sedang",
    icon: <Heading2 className="h-4 w-4" />,
    searchTerms: ["h2", "subtitle"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Judul sub-seksi kecil",
    icon: <Heading3 className="h-4 w-4" />,
    searchTerms: ["h3", "sub-subtitle"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Daftar poin sederhana",
    icon: <List className="h-4 w-4" />,
    searchTerms: ["bullet", "list", "unordered"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Daftar bernomor berurutan",
    icon: <ListOrdered className="h-4 w-4" />,
    searchTerms: ["numbered", "list", "ordered"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "To-do List",
    description: "Daftar tugas dengan kotak centang",
    icon: <CheckSquare className="h-4 w-4" />,
    searchTerms: ["todo", "task", "checklist"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Code Block",
    description: "Blok kode program",
    icon: <Code className="h-4 w-4" />,
    searchTerms: ["code", "snippet"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Table",
    description: "Tabel 3x3",
    icon: <TableIcon className="h-4 w-4" />,
    searchTerms: ["table", "grid"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: "Quote",
    description: "Blok kutipan teks",
    icon: <Quote className="h-4 w-4" />,
    searchTerms: ["quote", "citation"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Divider",
    description: "Garis pemisah antar blok",
    icon: <Minus className="h-4 w-4" />,
    searchTerms: ["line", "divider", "hr"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
]);

const slashCommand = Command.configure({
  suggestion: {
    items: () => suggestionItems,
    render: renderItems,
  },
});

const defaultExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  slashCommand,
  GlobalDragHandle,
  Placeholder.configure({
    placeholder: "Ketik '/' untuk perintah Notion atau langsung menulis...",
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({ resizable: false }),
  TableRow,
  TableCell,
  TableHeader,
  Link.configure({ openOnClick: false }),
  Image,
  Markdown.configure({
    html: false,
    transformPastedText: true,
    transformCopiedText: true,
  }),
];

export function NovelEditor({
  initialTitle = "Getting Started with Markidown",
  initialContent = "Welcome to Markidown! Click anywhere and start typing.",
  onBack,
}: NovelEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "dirty" | "saving">("saved");
  const [editorInstance, setEditorInstance] = useState<any>(null);

  const handleExport = (type: ExportType) => {
    const doc: NoteDocument = {
      frontmatter: { title },
      content,
    };
    exportDocument(doc, `<div class="prose"><h1>${title}</h1><p>${content}</p></div>`, type);
  };

  return (
    <div className="flex flex-col h-full w-full bg-background text-txt-primary overflow-y-auto">
      {/* 1. Header Navigation Bar */}
      <div className="px-4 py-2 border-b border-border bg-background flex items-center justify-between shrink-0 select-none">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs gap-2 text-txt-secondary hover:text-txt-primary"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Documents
        </Button>

        <span className="text-xs font-semibold text-txt-secondary truncate max-w-sm">
          {title || "Untitled Document"}
        </span>

        {/* Ellipsis Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-txt-secondary hover:text-txt-primary">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-1 text-[11px] font-semibold text-txt-muted uppercase tracking-wider">
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 2. Top Formatting Toolbar */}
      <div className="flex items-center justify-between gap-1 border-b border-border bg-background px-6 py-1.5 overflow-x-auto text-txt-primary shrink-0 select-none">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorInstance?.chain().focus().undo().run()}
            disabled={!editorInstance?.can().undo()}
            title="Undo"
          >
            <Undo className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorInstance?.chain().focus().redo().run()}
            disabled={!editorInstance?.can().redo()}
            title="Redo"
          >
            <Redo className="h-3.5 w-3.5" />
          </Button>

          <Separator orientation="vertical" className="h-4 mx-1" />

          {/* Heading Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-medium gap-1 text-txt-secondary">
                <span>
                  {editorInstance?.isActive("heading", { level: 1 })
                    ? "Heading 1"
                    : editorInstance?.isActive("heading", { level: 2 })
                    ? "Heading 2"
                    : editorInstance?.isActive("heading", { level: 3 })
                    ? "Heading 3"
                    : "Normal text"}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editorInstance?.chain().focus().setParagraph().run()}
                className="text-xs"
              >
                Normal text
              </DropdownMenuItem>
              <DropdownMenuItem
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editorInstance?.chain().focus().toggleHeading({ level: 1 }).run()}
                className="text-xs"
              >
                <Heading1 className="mr-2 h-3.5 w-3.5" /> Heading 1
              </DropdownMenuItem>
              <DropdownMenuItem
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editorInstance?.chain().focus().toggleHeading({ level: 2 }).run()}
                className="text-xs"
              >
                <Heading2 className="mr-2 h-3.5 w-3.5" /> Heading 2
              </DropdownMenuItem>
              <DropdownMenuItem
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editorInstance?.chain().focus().toggleHeading({ level: 3 }).run()}
                className="text-xs"
              >
                <Heading3 className="mr-2 h-3.5 w-3.5" /> Heading 3
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-4 mx-1" />

          {/* Inline Formatting */}
          <Button
            variant={editorInstance?.isActive("bold") ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorInstance?.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={editorInstance?.isActive("italic") ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorInstance?.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={editorInstance?.isActive("strike") ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorInstance?.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={editorInstance?.isActive("code") ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorInstance?.chain().focus().toggleCode().run()}
            title="Inline Code"
          >
            <Code className="h-3.5 w-3.5" />
          </Button>

          <Separator orientation="vertical" className="h-4 mx-1" />

          {/* Lists */}
          <Button
            variant={editorInstance?.isActive("bulletList") ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorInstance?.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={editorInstance?.isActive("orderedList") ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorInstance?.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={editorInstance?.isActive("taskList") ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorInstance?.chain().focus().toggleTaskList().run()}
            title="Checklist"
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={editorInstance?.isActive("blockquote") ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorInstance?.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >
            <Quote className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={editorInstance?.isActive("table") ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorInstance?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            title="Insert Table"
          >
            <TableIcon className="h-3.5 w-3.5" />
          </Button>

          <Separator orientation="vertical" className="h-4 mx-1" />

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorInstance?.chain().focus().unsetAllMarks().clearNodes().run()}
            title="Clear Formatting"
          >
            <RemoveFormatting className="h-3.5 w-3.5 text-txt-muted" />
          </Button>
        </div>
      </div>

      {/* 3. Main Writing Canvas Area */}
      <div className="flex-1 px-16 py-10 max-w-4xl mx-auto w-full">
        {/* Editable Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full text-4xl font-black text-txt-primary bg-transparent outline-none border-b border-border/40 pb-3 mb-8 placeholder:text-txt-muted tracking-tight"
        />

        {/* Dedicated Relative Wrapper for Editor Canvas & Side Handle Alignment */}
        <div className="relative w-full">
          {/* Notion Block Side Handle (+ and :: Grip) */}
          {editorInstance && (
            <NotionBlockSideHandle
              editor={editorInstance}
              onOpenSlashMenu={() => {
                // Focus and open slash command suggestion
              }}
            />
          )}

          {/* Novel Root */}
          <EditorRoot>
            <EditorContent
              initialContent={initialContent as any}
              extensions={defaultExtensions}
              className="prose dark:prose-invert max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:ring-0 [&_.ProseMirror]:border-none text-txt-primary text-base leading-relaxed min-h-[500px]"
              onCreate={({ editor }) => {
                setEditorInstance(editor);
                const text = editor.getText();
                setCharCount(text.length);
                setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
              }}
              onUpdate={({ editor }) => {
                if (!editorInstance) setEditorInstance(editor);
                setSaveStatus("dirty");
                const text = editor.getText();
                setCharCount(text.length);
                setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
                const md = (editor.storage as any)?.markdown?.getMarkdown?.() || editor.getText();
                setContent(md);

                setTimeout(() => {
                  setSaveStatus("saved");
                }, 500);
              }}
            >
              {/* Notion Slash Commands Popup */}
              <EditorCommand className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-2xl transition-all">
                <EditorCommandEmpty className="p-2 text-xs text-txt-muted">
                  Tidak ada blok yang cocok
                </EditorCommandEmpty>
                <EditorCommandList>
                  {suggestionItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <EditorCommandItem
                        key={item.title}
                        value={item.title}
                        onCommand={(val) => item.command?.(val)}
                        className="flex items-center gap-3 rounded-md px-2 py-1.5 text-xs text-txt-primary hover:bg-accent cursor-pointer"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-accent/40 text-txt-brand shrink-0">
                          {Icon}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold">{item.title}</span>
                          <span className="text-[10px] text-txt-muted">{item.description}</span>
                        </div>
                      </EditorCommandItem>
                    );
                  })}
                </EditorCommandList>
              </EditorCommand>

              {/* Selection Bubble Toolbar */}
              <EditorBubble className="flex items-center gap-0.5 rounded-lg border border-border bg-popover/95 p-1 shadow-xl backdrop-blur z-50 text-txt-primary">
                <EditorBubbleItem onSelect={(editor) => editor.chain().focus().toggleBold().run()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Bold className="h-3.5 w-3.5" />
                  </Button>
                </EditorBubbleItem>
                <EditorBubbleItem onSelect={(editor) => editor.chain().focus().toggleItalic().run()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Italic className="h-3.5 w-3.5" />
                  </Button>
                </EditorBubbleItem>
                <EditorBubbleItem onSelect={(editor) => editor.chain().focus().toggleStrike().run()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Strikethrough className="h-3.5 w-3.5" />
                  </Button>
                </EditorBubbleItem>
                <EditorBubbleItem onSelect={(editor) => editor.chain().focus().toggleCode().run()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Code className="h-3.5 w-3.5" />
                  </Button>
                </EditorBubbleItem>
              </EditorBubble>
            </EditorContent>
          </EditorRoot>
        </div>
      </div>

      {/* 4. Footer Bar */}
      <EditorFooter saveStatus={saveStatus} wordCount={wordCount} charCount={charCount} />
    </div>
  );
}
