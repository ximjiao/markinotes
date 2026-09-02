"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  handleCommandNavigation,
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
  Combine,
  Plus,
  Trash2,
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
  onSave?: (title: string, content: string) => void;
}

interface CustomSlashItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  searchTerms: string[];
  command: (props: any) => void;
}

const rawSlashItems: CustomSlashItem[] = [
  {
    title: "Heading 1",
    description: "Judul seksi besar",
    icon: <Heading1 className="h-4 w-4" />,
    badge: "#",
    searchTerms: ["h1", "heading", "title", "#"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Judul seksi sedang",
    icon: <Heading2 className="h-4 w-4" />,
    badge: "##",
    searchTerms: ["h2", "subtitle", "##"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Judul sub-seksi kecil",
    icon: <Heading3 className="h-4 w-4" />,
    badge: "###",
    searchTerms: ["h3", "sub-subtitle", "###"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Daftar poin sederhana",
    icon: <List className="h-4 w-4" />,
    badge: "-",
    searchTerms: ["bullet", "list", "unordered", "-"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Daftar bernomor berurutan",
    icon: <ListOrdered className="h-4 w-4" />,
    badge: "1.",
    searchTerms: ["numbered", "list", "ordered", "1."],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "To-do List",
    description: "Daftar tugas dengan kotak centang",
    icon: <CheckSquare className="h-4 w-4" />,
    badge: "[]",
    searchTerms: ["todo", "task", "checklist", "[]"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Code Block",
    description: "Blok kode program",
    icon: <Code className="h-4 w-4" />,
    badge: "```",
    searchTerms: ["code", "snippet", "```"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Table",
    description: "Tabel 3x3",
    icon: <TableIcon className="h-4 w-4" />,
    badge: "3x3",
    searchTerms: ["table", "grid"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run();
    },
  },
  {
    title: "Quote",
    description: "Blok kutipan teks",
    icon: <Quote className="h-4 w-4" />,
    badge: ">",
    searchTerms: ["quote", "citation", ">"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Divider",
    description: "Garis pemisah antar blok",
    icon: <Minus className="h-4 w-4" />,
    badge: "---",
    searchTerms: ["line", "divider", "hr", "---"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

const suggestionItems = createSuggestionItems(
  rawSlashItems.map((item) => ({
    title: item.title,
    description: item.description,
    icon: item.icon,
    searchTerms: item.searchTerms,
    command: item.command,
  }))
);

const slashCommand = Command.configure({
  suggestion: {
    items: () => suggestionItems,
    render: renderItems,
  },
});

const CustomTable = Table.configure({
  resizable: true,
  lastColumnResizable: true,
  cellMinWidth: 50,
});

const defaultExtensions = [
  // 1. StarterKit prioritized first for input rules (1., -, *, >, ```)
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    bulletList: {},
    orderedList: {},
    blockquote: {},
    codeBlock: {},
  }),

  // 2. Dynamic Notion Block Placeholder
  Placeholder.configure({
    placeholder: ({ node, editor, pos }) => {
      if (
        node.type.name === "table" ||
        node.type.name === "tableRow" ||
        node.type.name === "tableCell" ||
        node.type.name === "tableHeader"
      ) {
        return "";
      }
      if (node.type.name === "heading") {
        return `Heading ${node.attrs.level}`;
      }
      if (node.type.name === "blockquote") {
        return "Empty quote";
      }
      if (node.type.name === "codeBlock") {
        return "Write code...";
      }
      if (node.type.name === "taskItem") {
        return "To-do";
      }
      if (editor && typeof pos === "number") {
        try {
          const $pos = editor.state.doc.resolve(pos);
          const parentType = $pos.parent.type.name;
          if (
            parentType === "tableCell" ||
            parentType === "tableHeader" ||
            parentType === "tableRow" ||
            parentType === "table"
          ) {
            return "";
          }
          if (
            parentType === "taskItem" ||
            $pos.node($pos.depth - 1)?.type.name === "taskItem"
          ) {
            return "To-do";
          }
        } catch {
          // Safe fallback
        }
      }
      return "Ketik '/' untuk perintah Notion atau langsung menulis...";
    },
  }),

  // 3. TaskList, Table, Links, Images, SlashCommand & Markdown
  TaskList,
  TaskItem.configure({ nested: true }),
  CustomTable,
  TableRow,
  TableCell,
  TableHeader,
  Link.configure({ openOnClick: false }),
  Image,
  slashCommand,
  GlobalDragHandle,
  Markdown.configure({
    html: false,
    transformPastedText: true,
    transformCopiedText: true,
  }),
];

export function NovelEditor({
  initialTitle = "Getting Started with Markidown",
  initialContent = "# Getting Started with Markidown\n\nWelcome to Markidown! Click anywhere and start typing. Fast, local-first markdown note taking.\n\nStart editing this note...",
  onBack,
  onSave,
}: NovelEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isTitleCustom, setIsTitleCustom] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "dirty" | "saving">("saved");
  const [saveCountdown, setSaveCountdown] = useState<number | null>(null);
  const [editorInstance, setEditorInstance] = useState<any>(null);

  // Refs so the debounced timer always reads the latest values
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const onSaveRef = useRef(onSave);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep refs in sync with state
  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const performSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setSaveCountdown(null);
    setSaveStatus("saving");
    onSaveRef.current?.(titleRef.current, contentRef.current);
    setSaveStatus("saved");
  }, []);

  /** Call this whenever content or title changes — starts/resets 3s countdown */
  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    
    setSaveStatus("dirty");
    setSaveCountdown(3); // Start at 3 seconds

    countdownTimerRef.current = setInterval(() => {
      setSaveCountdown(prev => {
        if (prev === null || prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    saveTimerRef.current = setTimeout(() => {
      performSave();
    }, 3000);
  }, [performSave]);

  // Ensure we save when component unmounts if there are pending changes
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        performSave();
      }
    };
  }, [performSave]);

  // Mass Auto-Sweeper for all unused '/' paragraphs in document
  useEffect(() => {
    if (!editorInstance) return;

    const sweepAllUnusedSlashLines = () => {
      try {
        const { doc, selection } = editorInstance.state;
        const activeBlockPos = selection.$anchor.before(1);

        doc.descendants((node: any, pos: number) => {
          if (node.isBlock && node.type.name === "paragraph" && node.textContent.trim() === "/") {
            if (pos !== activeBlockPos) {
              editorInstance
                .chain()
                .deleteRange({ from: pos, to: pos + node.nodeSize })
                .run();
            }
          }
        });
      } catch {
        // Safe fallback
      }
    };

    const handlePointerDown = () => {
      setTimeout(sweepAllUnusedSlashLines, 80);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTimeout(sweepAllUnusedSlashLines, 40);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editorInstance]);

  const handleExport = (type: ExportType) => {
    const doc: NoteDocument = {
      frontmatter: { title },
      content,
    };
    exportDocument(doc, `<div class="prose"><h1>${title}</h1><div>${content}</div></div>`, type);
  };

  return (
    <div className="flex flex-col h-full w-full bg-background text-txt-primary overflow-y-auto">
      {/* 1. Header Navigation Bar (Google Docs Style Editable Title Input) */}
      {/* Combined Header + Toolbar */}
      <div className="px-3 py-1.5 border-b border-border bg-background flex items-center gap-2 shrink-0 select-none overflow-x-auto">
        {/* Left: Back + Page Title */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1.5 text-txt-secondary hover:text-txt-primary shrink-0"
          onClick={onBack}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>

        <Separator orientation="vertical" className="h-4 shrink-0" />

        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setIsTitleCustom(true);
            scheduleAutoSave();
          }}
          placeholder="Untitled document"
          className="text-xs font-semibold text-txt-primary bg-transparent outline-none border border-transparent hover:border-border focus:border-txt-brand rounded px-2 py-1 w-40 min-w-0 transition-colors shrink-0"
        />

        <Separator orientation="vertical" className="h-4 shrink-0" />

        {/* Undo / Redo */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
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
          className="h-7 w-7 shrink-0"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editorInstance?.chain().focus().redo().run()}
          disabled={!editorInstance?.can().redo()}
          title="Redo"
        >
          <Redo className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-4 shrink-0" />

        {/* Heading Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-medium gap-1 text-txt-secondary shrink-0">
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
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().setParagraph().run()} className="text-xs">Normal text</DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().toggleHeading({ level: 1 }).run()} className="text-xs"><Heading1 className="mr-2 h-3.5 w-3.5" /> Heading 1</DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().toggleHeading({ level: 2 }).run()} className="text-xs"><Heading2 className="mr-2 h-3.5 w-3.5" /> Heading 2</DropdownMenuItem>
            <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().toggleHeading({ level: 3 }).run()} className="text-xs"><Heading3 className="mr-2 h-3.5 w-3.5" /> Heading 3</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-4 shrink-0" />

        {/* Inline Formatting */}
        <Button variant={editorInstance?.isActive("bold") ? "secondary" : "ghost"} size="icon" className="h-7 w-7 shrink-0" onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().toggleBold().run()} title="Bold"><Bold className="h-3.5 w-3.5" /></Button>
        <Button variant={editorInstance?.isActive("italic") ? "secondary" : "ghost"} size="icon" className="h-7 w-7 shrink-0" onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().toggleItalic().run()} title="Italic"><Italic className="h-3.5 w-3.5" /></Button>
        <Button variant={editorInstance?.isActive("strike") ? "secondary" : "ghost"} size="icon" className="h-7 w-7 shrink-0" onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough className="h-3.5 w-3.5" /></Button>
        <Button variant={editorInstance?.isActive("code") ? "secondary" : "ghost"} size="icon" className="h-7 w-7 shrink-0" onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().toggleCode().run()} title="Inline Code"><Code className="h-3.5 w-3.5" /></Button>

        <Separator orientation="vertical" className="h-4 shrink-0" />

        {/* Lists Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={
                editorInstance?.isActive("bulletList") ||
                  editorInstance?.isActive("orderedList") ||
                  editorInstance?.isActive("taskList") ||
                  editorInstance?.isActive("blockquote")
                  ? "secondary"
                  : "ghost"
              }
              size="sm"
              className="h-7 px-2 text-xs font-medium gap-1 text-txt-secondary shrink-0"
              onMouseDown={(e) => e.preventDefault()}
              title="Tipe List"
            >
              {editorInstance?.isActive("orderedList") ? (
                <ListOrdered className="h-3.5 w-3.5" />
              ) : editorInstance?.isActive("taskList") ? (
                <CheckSquare className="h-3.5 w-3.5" />
              ) : editorInstance?.isActive("blockquote") ? (
                <Quote className="h-3.5 w-3.5" />
              ) : (
                <List className="h-3.5 w-3.5" />
              )}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <div className="px-2 py-1 text-[10px] font-semibold text-txt-muted capitalize">Tipe List</div>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editorInstance?.chain().focus().toggleBulletList().run()}
              className={`cursor-pointer text-xs flex items-center justify-between ${editorInstance?.isActive("bulletList") ? "bg-accent text-txt-primary font-medium" : ""}`}
            >
              <div className="flex items-center gap-2"><List className="h-3.5 w-3.5" /> Bullet List</div>
              <span className="text-[10px] font-mono text-txt-muted bg-accent/40 px-1 rounded">-</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editorInstance?.chain().focus().toggleOrderedList().run()}
              className={`cursor-pointer text-xs flex items-center justify-between ${editorInstance?.isActive("orderedList") ? "bg-accent text-txt-primary font-medium" : ""}`}
            >
              <div className="flex items-center gap-2"><ListOrdered className="h-3.5 w-3.5" /> Numbered List</div>
              <span className="text-[10px] font-mono text-txt-muted bg-accent/40 px-1 rounded">1.</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editorInstance?.chain().focus().toggleTaskList().run()}
              className={`cursor-pointer text-xs flex items-center justify-between ${editorInstance?.isActive("taskList") ? "bg-accent text-txt-primary font-medium" : ""}`}
            >
              <div className="flex items-center gap-2"><CheckSquare className="h-3.5 w-3.5" /> To-do List</div>
              <span className="text-[10px] font-mono text-txt-muted bg-accent/40 px-1 rounded">[]</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editorInstance?.chain().focus().toggleBlockquote().run()}
              className={`cursor-pointer text-xs flex items-center justify-between ${editorInstance?.isActive("blockquote") ? "bg-accent text-txt-primary font-medium" : ""}`}
            >
              <div className="flex items-center gap-2"><Quote className="h-3.5 w-3.5" /> Quote</div>
              <span className="text-[10px] font-mono text-txt-muted bg-accent/40 px-1 rounded">&gt;</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>


        {/* Table */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={editorInstance?.isActive("table") ? "secondary" : "ghost"} size="icon" className="h-7 w-7 shrink-0" onMouseDown={(e) => e.preventDefault()} title="Table"><TableIcon className="h-3.5 w-3.5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            {!editorInstance?.isActive("table") ? (
              <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run()} className="cursor-pointer text-xs">Sisipkan Tabel 3x3</DropdownMenuItem>
            ) : (
              <>
                <div className="px-2 py-1 text-[10px] font-semibold text-txt-muted capitalize">Kontrol Tabel</div>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().addRowAfter().run()} className="cursor-pointer text-xs">+ Tambah Baris di Bawah</DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().addRowBefore().run()} className="cursor-pointer text-xs">+ Tambah Baris di Atas</DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().addColumnAfter().run()} className="cursor-pointer text-xs">+ Tambah Kolom Kanan</DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().addColumnBefore().run()} className="cursor-pointer text-xs">+ Tambah Kolom Kiri</DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().mergeOrSplit().run()} className="cursor-pointer text-xs text-purple-400 font-medium">Gabung / Pisahkan Sel</DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().deleteRow().run()} className="cursor-pointer text-xs text-amber-500">- Hapus Baris Ini</DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().deleteColumn().run()} className="cursor-pointer text-xs text-amber-500">- Hapus Kolom Ini</DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().deleteTable().run()} className="cursor-pointer text-xs text-red-500 font-semibold">Hapus Seluruh Tabel</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-4 shrink-0" />

        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear Formatting">
          <RemoveFormatting className="h-3.5 w-3.5 text-txt-muted" />
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: Export Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-txt-secondary hover:text-txt-primary">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-1 text-[11px] font-semibold text-txt-muted capitalize">Export Document</div>
            <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer text-xs"><FileType className="mr-2 h-4 w-4 text-red-500" /> Export to PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("docx")} className="cursor-pointer text-xs"><FileType className="mr-2 h-4 w-4 text-blue-500" /> Export to Word (.docx)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("md")} className="cursor-pointer text-xs"><FileCode className="mr-2 h-4 w-4 text-purple-500" /> Export to Markdown (.md)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 3. Pure 100% Canvas Writing Space */}
      <div className="flex-1 px-16 py-10 max-w-4xl mx-auto w-full">
        {/* Dedicated Relative Wrapper for Editor Canvas & Side Handle Alignment */}
        <div className="relative w-full">
          {/* Notion Block Side Handle (+ and :: Grip) */}
          {editorInstance && (
            <NotionBlockSideHandle
              editor={editorInstance}
              onOpenSlashMenu={() => {
                // Focus and trigger suggestion
              }}
            />
          )}

          {/* Novel Root */}
          <EditorRoot>
            <EditorContent
              initialContent={initialContent as any}
              extensions={defaultExtensions}
              className="prose dark:prose-invert max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:ring-0 [&_.ProseMirror]:border-none text-txt-primary text-base leading-relaxed min-h-[500px]"
              editorProps={{
                handleDOMEvents: {
                  keydown: (_view: unknown, event: KeyboardEvent) => handleCommandNavigation(event),
                },
              }}
              onCreate={({ editor }) => {
                setEditorInstance(editor);
                const text = editor.getText();
                setCharCount(text.length);
                setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
              }}
              onUpdate={({ editor }) => {
                if (!editorInstance) setEditorInstance(editor);
                const text = editor.getText();
                setCharCount(text.length);
                setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);

                // Auto-sync document title if not explicitly edited
                if (!isTitleCustom) {
                  const firstLine = text.split("\n")[0]?.trim();
                  if (firstLine) setTitle(firstLine.slice(0, 50));
                }

                const md = (editor.storage as any)?.markdown?.getMarkdown?.() || editor.getText();
                setContent(md);
                scheduleAutoSave();
              }}
            >
              {/* Notion Slash Commands Popup */}
              <EditorCommand className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-2xl transition-all">
                <EditorCommandEmpty className="p-2 text-xs text-txt-muted">
                  Tidak ada blok yang cocok
                </EditorCommandEmpty>
                <EditorCommandList>
                  {rawSlashItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <EditorCommandItem
                        key={item.title}
                        value={item.title}
                        onCommand={(val) => item.command?.(val)}
                        className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-xs text-txt-primary hover:bg-accent cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-accent/40 text-txt-brand shrink-0">
                            {Icon}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold">{item.title}</span>
                            <span className="text-[10px] text-txt-muted">{item.description}</span>
                          </div>
                        </div>

                        {/* Markdown Hint Badge (Matching Notion UI) */}
                        {item.badge && (
                          <span className="text-[11px] font-mono text-txt-muted px-1.5 py-0.5 rounded border border-border/50 bg-accent/20 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </EditorCommandItem>
                    );
                  })}
                </EditorCommandList>
              </EditorCommand>

              {/* Selection Bubble Toolbar */}
              <EditorBubble
                tippyOptions={{ maxWidth: "none" }}
                className="flex items-center gap-0.5 rounded-xl border border-border bg-popover p-1 shadow-xl backdrop-blur-sm z-50 text-txt-primary w-fit"
              >
                {editorInstance?.isActive("table") && (
                  <>
                    {/* +Col */}
                    <EditorBubbleItem onSelect={(editor) => editor.chain().focus().addColumnAfter().run()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] font-medium text-txt-brand hover:bg-accent gap-1 cursor-pointer"
                        title="Tambah Kolom"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Col</span>
                      </Button>
                    </EditorBubbleItem>

                    {/* +Row */}
                    <EditorBubbleItem onSelect={(editor) => editor.chain().focus().addRowAfter().run()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] font-medium text-txt-brand hover:bg-accent gap-1 cursor-pointer"
                        title="Tambah Baris"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Row</span>
                      </Button>
                    </EditorBubbleItem>

                    <Separator orientation="vertical" className="h-4 mx-0.5" />

                    {/* Merge/Split */}
                    <EditorBubbleItem onSelect={(editor) => editor.chain().focus().mergeOrSplit().run()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] font-medium text-purple-400 hover:bg-accent gap-1 cursor-pointer"
                        title="Merge / Split Sel"
                      >
                        <Combine className="h-3.5 w-3.5" />
                      </Button>
                    </EditorBubbleItem>

                    {/* Delete Row */}
                    <EditorBubbleItem onSelect={(editor) => editor.chain().focus().deleteRow().run()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] font-medium text-amber-400 hover:text-amber-500 hover:bg-amber-500/10 gap-1 cursor-pointer"
                        title="Hapus Baris"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Row</span>
                      </Button>
                    </EditorBubbleItem>

                    {/* Delete Col */}
                    <EditorBubbleItem onSelect={(editor) => editor.chain().focus().deleteColumn().run()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] font-medium text-amber-400 hover:text-amber-500 hover:bg-amber-500/10 gap-1 cursor-pointer"
                        title="Hapus Kolom"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Col</span>
                      </Button>
                    </EditorBubbleItem>

                    {/* Delete Table */}
                    <EditorBubbleItem onSelect={(editor) => editor.chain().focus().deleteTable().run()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] font-medium text-red-400 hover:text-red-500 hover:bg-red-500/10 gap-1 cursor-pointer"
                        title="Hapus Seluruh Tabel"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Table</span>
                      </Button>
                    </EditorBubbleItem>

                    <Separator orientation="vertical" className="h-4 mx-0.5" />
                  </>
                )}

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
      <EditorFooter saveStatus={saveStatus} wordCount={wordCount} charCount={charCount} saveCountdown={saveCountdown} />
    </div>
  );
}
