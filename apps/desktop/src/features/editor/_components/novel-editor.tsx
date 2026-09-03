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
import { Mark, mergeAttributes } from "@tiptap/core";
import { CustomImageExtension } from "./custom-image-extension";
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
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  Copy,
  CopyPlus,
  Maximize2,
  Minimize2,
  FolderOutput,
  Tag,
  Paintbrush,
  Eraser,
  TableProperties,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { exportDocument } from "../_lib/export-engine";
import type { ExportType, NoteDocument } from "../_types/editor.types";
import { EditorFooter } from "./editor-footer";
import { AiSummaryDialog } from "./ai-summary-dialog";
import { NotionBlockSideHandle } from "./notion-block-side-handle";
import { ImageDialog } from "./image-dialog";

interface NovelEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  allWorkspaceTags?: string[];
  onBack?: () => void;
  onSave?: (title: string, content: string, tags: string[]) => void;
  noteId?: string;
  workspacePath?: string | null;
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
    title: "Image",
    description: "Unggah gambar atau tautan URL",
    icon: <ImageIcon className="h-4 w-4" />,
    badge: "img",
    searchTerms: ["image", "photo", "picture", "upload", "img"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setImage({ src: "" }).run();
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

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-background-color") || element.style.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) return {};
          return {
            style: `background-color: ${attributes.backgroundColor}`,
            "data-background-color": attributes.backgroundColor,
          };
        },
      },
      colwidth: {
        default: null,
        parseHTML: (element) => {
          const colwidth = element.getAttribute("colwidth");
          return colwidth ? colwidth.split(",").map((item) => parseInt(item, 10)) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.colwidth) return {};
          return {
            colwidth: attributes.colwidth.join(","),
          };
        },
      },
    };
  },
});

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-background-color") || element.style.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) return {};
          return {
            style: `background-color: ${attributes.backgroundColor}`,
            "data-background-color": attributes.backgroundColor,
          };
        },
      },
      colwidth: {
        default: null,
        parseHTML: (element) => {
          const colwidth = element.getAttribute("colwidth");
          return colwidth ? colwidth.split(",").map((item) => parseInt(item, 10)) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.colwidth) return {};
          return {
            colwidth: attributes.colwidth.join(","),
          };
        },
      },
    };
  },
});

const TextStyle = Mark.create({
  name: "textStyle",
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  parseHTML() {
    return [
      {
        tag: "span",
        getAttrs: (element) => {
          const hasStyles = (element as HTMLElement).hasAttribute("style");
          if (!hasStyles) return false;
          return {};
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

const TextColor = Mark.create({
  name: "textColor",
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => (element as HTMLElement).style.color || element.getAttribute("data-color") || null,
        renderHTML: (attributes) => {
          if (!attributes.color) return {};
          return {
            style: `color: ${attributes.color}`,
            "data-color": attributes.color,
          };
        },
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "span",
        getAttrs: (element) => {
          const hasColor = (element as HTMLElement).style.color || (element as HTMLElement).hasAttribute("data-color");
          if (!hasColor) return false;
          return {};
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

const TABLE_TEXT_COLORS = [
  { label: "Default", value: "inherit" },
  { label: "Gray", value: "#9ca3af" },
  { label: "Brown", value: "#b45309" },
  { label: "Orange", value: "#f97316" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#22c55e" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
  { label: "Red", value: "#ef4444" },
];

const TABLE_BG_COLORS = [
  { label: "Default", value: "transparent" },
  { label: "Gray", value: "rgba(156, 163, 175, 0.2)" },
  { label: "Brown", value: "rgba(180, 83, 9, 0.2)" },
  { label: "Orange", value: "rgba(249, 115, 22, 0.2)" },
  { label: "Yellow", value: "rgba(234, 179, 8, 0.2)" },
  { label: "Green", value: "rgba(34, 197, 94, 0.2)" },
  { label: "Blue", value: "rgba(59, 130, 246, 0.2)" },
  { label: "Purple", value: "rgba(168, 85, 247, 0.2)" },
  { label: "Pink", value: "rgba(236, 72, 153, 0.2)" },
  { label: "Red", value: "rgba(239, 68, 68, 0.2)" },
];

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

  // 3. TaskList, Table, Links, Images, SlashCommand, Color & Markdown
  TaskList,
  TaskItem.configure({ nested: true }),
  CustomTable,
  TableRow,
  CustomTableCell,
  CustomTableHeader,
  TextStyle,
  TextColor,
  Link.configure({ openOnClick: false }),
  CustomImageExtension,
  slashCommand,
  GlobalDragHandle,
  Markdown.configure({
    html: true,
    transformPastedText: true,
    transformCopiedText: true,
  }),
];

export function NovelEditor({
  initialTitle = "Getting Started with Markidown",
  initialContent = "# Getting Started with Markidown\n\nWelcome to Markidown! Click anywhere and start typing. Fast, local-first markdown note taking.\n\nStart editing this note...",
  initialTags = [],
  allWorkspaceTags = [],
  onBack,
  onSave,
  noteId,
  workspacePath,
}: NovelEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isTitleCustom, setIsTitleCustom] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "dirty" | "saving">("saved");
  const [saveCountdown, setSaveCountdown] = useState<number | null>(null);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [fontStyle, setFontStyle] = useState<"default" | "serif" | "mono">("default");
  const [isSmallText, setIsSmallText] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);

  useEffect(() => {
    const handleOpenImageDialog = () => setIsImageDialogOpen(true);
    window.addEventListener("open-image-dialog", handleOpenImageDialog);
    return () => window.removeEventListener("open-image-dialog", handleOpenImageDialog);
  }, []);

  const handleInsertSummary = (summaryMarkdown: string) => {
    if (editorInstance) {
      editorInstance.commands.focus("end");
      editorInstance.commands.insertContent(`\n\n## 🤖 Summary\n\n${summaryMarkdown}\n\n`);
      scheduleAutoSave();
    }
  };

  // Refs so the debounced timer always reads the latest values
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const tagsRef = useRef(tags);
  const onSaveRef = useRef(onSave);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep refs in sync with state
  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { tagsRef.current = tags; }, [tags]);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const performSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setSaveCountdown(null);
    setSaveStatus("saving");
    onSaveRef.current?.(titleRef.current, contentRef.current, tagsRef.current);
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

  // Check if current selection is inside a table or CellSelection (even across multi-cell column highlighting)
  const isTableActive = useCallback(() => {
    if (!editorInstance || editorInstance.isDestroyed) return false;
    try {
      const { selection } = editorInstance.state;
      if (!selection) return false;

      // 1. Check CellSelection (multi-cell/column selection)
      if (
        (selection as any).$headCell ||
        (selection as any).$anchorCell ||
        selection.constructor.name === "CellSelection"
      ) {
        return true;
      }

      // 2. Standard isActive checks
      if (
        editorInstance.isActive("table") ||
        editorInstance.isActive("tableCell") ||
        editorInstance.isActive("tableHeader") ||
        editorInstance.isActive("tableRow")
      ) {
        return true;
      }

      // 3. Document depth ancestor lookup
      const { $from } = selection;
      for (let d = $from.depth; d > 0; d--) {
        const typeName = $from.node(d).type.name;
        if (["table", "tableRow", "tableCell", "tableHeader"].includes(typeName)) {
          return true;
        }
      }
    } catch {
      // Safe fallback
    }
    return false;
  }, [editorInstance]);

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
    <div className="flex flex-col h-full w-full bg-background text-txt-primary overflow-hidden">
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

        {/* Tags Popover Editor */}
        <Popover open={isEditingTags} onOpenChange={setIsEditingTags}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-medium gap-1.5 text-txt-secondary hover:text-txt-primary shrink-0 ml-0.5"
              title="Manage document tags"
            >
              <Tag className="h-3.5 w-3.5 text-txt-brand" />
              <span>Tags</span>
              {tags.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px] font-semibold bg-accent border border-border">
                  {tags.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3 bg-popover border border-border shadow-xl rounded-xl space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-semibold text-txt-primary flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-txt-brand" /> Tags
              </span>
              <span className="text-[10px] text-txt-muted font-normal">{tags.length} selected</span>
            </div>

            {/* Current Active Tags with Remove X & Click-to-Rename */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-accent/30 rounded-lg border border-border/40">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[10px] px-2 py-0.5 rounded font-normal flex items-center gap-1.5 bg-background text-txt-primary border border-border/60 shadow-xs"
                  >
                    {editingTag === tag ? (
                      <input
                        autoFocus
                        className="w-16 bg-transparent outline-none border-b border-txt-brand text-[10px] font-semibold text-txt-primary"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        onBlur={() => {
                          if (editingValue.trim() && editingValue.trim() !== tag) {
                            setTags(tags.map((t) => (t === tag ? editingValue.trim() : t)));
                            scheduleAutoSave();
                          }
                          setEditingTag(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editingValue.trim()) {
                            e.preventDefault();
                            setTags(tags.map((t) => (t === tag ? editingValue.trim() : t)));
                            scheduleAutoSave();
                            setEditingTag(null);
                          }
                          if (e.key === "Escape") {
                            setEditingTag(null);
                          }
                        }}
                      />
                    ) : (
                      <span
                        onClick={() => {
                          setEditingTag(tag);
                          setEditingValue(tag);
                        }}
                        className="cursor-pointer hover:underline hover:text-txt-brand transition-colors"
                        title="Click to rename tag"
                      >
                        #{tag}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setTags(tags.filter((t) => t !== tag));
                        scheduleAutoSave();
                      }}
                      className="hover:text-destructive transition-colors focus:outline-none cursor-pointer"
                      title="Remove tag"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* New Tag Input */}
            <input
              autoFocus
              placeholder="Type tag & press Enter..."
              className="text-xs px-2.5 py-1.5 w-full bg-background border border-border rounded-lg outline-none focus:border-txt-brand text-txt-primary transition-colors"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTagInput.trim()) {
                  e.preventDefault();
                  if (!tags.includes(newTagInput.trim())) {
                    setTags([...tags, newTagInput.trim()]);
                    scheduleAutoSave();
                  }
                  setNewTagInput("");
                }
              }}
            />

            {/* Existing Workspace Tags to pick from */}
            {(() => {
              const availableTags = allWorkspaceTags.filter(t => !tags.includes(t) && t.includes(newTagInput));
              if (availableTags.length === 0) return null;
              return (
                <div className="pt-1">
                  <div className="text-[10px] text-txt-muted mb-1.5 font-medium px-0.5">Workspace Tags</div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {availableTags.map(tag => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0.5 cursor-pointer hover:bg-accent hover:text-txt-primary transition-colors text-txt-secondary font-normal"
                        onClick={(e) => {
                          e.preventDefault();
                          setTags([...tags, tag]);
                          scheduleAutoSave();
                          setNewTagInput("");
                        }}
                      >
                        +#{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })()}
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-4 shrink-0" />

        {/* Undo / Redo */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editorInstance?.chain().focus().undo().scrollIntoView().run()}
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
          onClick={() => editorInstance?.chain().focus().redo().scrollIntoView().run()}
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

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editorInstance?.chain().focus().setImage({ src: "" }).run()}
          title="Insert Image"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-4 shrink-0" />

        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear Formatting">
          <RemoveFormatting className="h-3.5 w-3.5 text-txt-muted" />
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: Save Status & AI Actions (Sebelah kiri dari More icon) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Save Status Indicator */}
          {saveStatus === "saved" && (
            <Badge variant="outline" className="h-6 px-2 text-[10px] gap-1 font-normal text-emerald-600 border-emerald-600/30 bg-emerald-500/10">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </Badge>
          )}
          {saveStatus === "saving" && (
            <Badge variant="outline" className="h-6 px-2 text-[10px] gap-1 font-normal text-amber-600 border-amber-600/30 bg-amber-500/10">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </Badge>
          )}
          {saveStatus === "dirty" && (
            <Badge variant="outline" className="h-6 px-2 text-[10px] gap-1 font-normal text-txt-muted border-border">
              Unsaved {saveCountdown !== null ? `(${saveCountdown}s)` : ""}
            </Badge>
          )}

          {/* Summarize with AI Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAiDialogOpen(true)}
            className="h-6 px-2 text-[10px] gap-1.5 font-medium text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:text-purple-700 dark:hover:text-purple-300 transition-colors shadow-xs rounded-full"
          >
            <Sparkles className="h-3 w-3 text-purple-500" />
            Summarize with AI
          </Button>
        </div>

        <Separator orientation="vertical" className="h-4 shrink-0 mx-0.5" />

        {/* Right: Notion-Style 3-Dots Page Options Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-txt-secondary hover:text-txt-primary">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2 bg-popover border border-border shadow-2xl rounded-xl space-y-1">
            {/* 1. Font Style Selector */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-accent/40 rounded-lg text-center select-none mb-1">
              <button
                type="button"
                onClick={() => setFontStyle("default")}
                className={cn(
                  "py-1 rounded text-xs flex flex-col items-center transition-all cursor-pointer",
                  fontStyle === "default" ? "bg-background font-bold text-txt-brand shadow-xs" : "text-txt-muted hover:text-txt-primary"
                )}
              >
                <span className="text-sm font-sans font-semibold">Ag</span>
                <span className="text-[9px]">Default</span>
              </button>
              <button
                type="button"
                onClick={() => setFontStyle("serif")}
                className={cn(
                  "py-1 rounded text-xs flex flex-col items-center transition-all cursor-pointer",
                  fontStyle === "serif" ? "bg-background font-bold text-txt-brand shadow-xs" : "text-txt-muted hover:text-txt-primary"
                )}
              >
                <span className="text-sm font-serif font-semibold">Ag</span>
                <span className="text-[9px]">Serif</span>
              </button>
              <button
                type="button"
                onClick={() => setFontStyle("mono")}
                className={cn(
                  "py-1 rounded text-xs flex flex-col items-center transition-all cursor-pointer",
                  fontStyle === "mono" ? "bg-background font-bold text-txt-brand shadow-xs" : "text-txt-muted hover:text-txt-primary"
                )}
              >
                <span className="text-sm font-mono font-semibold">Ag</span>
                <span className="text-[9px]">Mono</span>
              </button>
            </div>

            <DropdownMenuSeparator />

            {/* 2. Actions */}
            <DropdownMenuItem
              onClick={() => {
                if (editorInstance) {
                  navigator.clipboard.writeText(editorInstance.getText());
                }
              }}
              className="text-xs cursor-pointer gap-2 py-1.5"
            >
              <Copy className="h-3.5 w-3.5" /> Copy page contents
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                handleExport("md");
              }}
              className="text-xs cursor-pointer gap-2 py-1.5"
            >
              <CopyPlus className="h-3.5 w-3.5" /> Duplicate as Markdown
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={onBack}
              className="text-xs cursor-pointer gap-2 py-1.5 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Move to Trash
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* 3. Canvas Layout Switches */}
            <div
              onClick={() => setIsSmallText(!isSmallText)}
              className="flex items-center justify-between px-2 py-1.5 text-xs text-txt-primary hover:bg-accent rounded-md cursor-pointer select-none transition-colors"
            >
              <span className="flex items-center gap-2 text-xs">
                <span className="text-[10px] font-bold border border-current rounded px-0.5">A↓</span> Small text
              </span>
              <Switch checked={isSmallText} onCheckedChange={setIsSmallText} className="scale-75" />
            </div>

            <div
              onClick={() => setIsFullWidth(!isFullWidth)}
              className="flex items-center justify-between px-2 py-1.5 text-xs text-txt-primary hover:bg-accent rounded-md cursor-pointer select-none transition-colors"
            >
              <span className="flex items-center gap-2 text-xs">
                <Maximize2 className="h-3.5 w-3.5" /> Full width
              </span>
              <Switch checked={isFullWidth} onCheckedChange={setIsFullWidth} className="scale-75" />
            </div>

            <DropdownMenuSeparator />

            {/* 4. Export Menu Sub-Header */}
            <div className="px-2 py-0.5 text-[11px] font-semibold text-txt-muted capitalize">Export</div>
            <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer text-xs py-1">
              <FileType className="mr-2 h-3.5 w-3.5 text-red-500" /> Export to PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("docx")} className="cursor-pointer text-xs py-1">
              <FileType className="mr-2 h-3.5 w-3.5 text-blue-500" /> Export to Word (.docx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("md")} className="cursor-pointer text-xs py-1">
              <FileCode className="mr-2 h-3.5 w-3.5 text-purple-500" /> Export to Markdown (.md)
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* 5. Page Info Footer */}
            <div className="px-2.5 py-1.5 text-[10px] text-txt-muted space-y-0.5 select-none bg-accent/30 rounded-lg">
              <div className="font-semibold text-txt-secondary">{wordCount} words ({charCount} characters)</div>
              <div>Last edited Today</div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 3. Pure 100% Canvas Writing Space (Scrollable Area) */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className={cn("py-10 mx-auto w-full transition-all duration-200", isFullWidth ? "max-w-none px-24" : "max-w-4xl px-16")}>
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
              className={cn(
                "prose dark:prose-invert max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:ring-0 [&_.ProseMirror]:border-none text-txt-primary min-h-[500px]",
                fontStyle === "serif" ? "font-serif" : fontStyle === "mono" ? "font-mono" : "font-sans",
                isSmallText ? "text-sm leading-relaxed" : "text-base leading-relaxed"
              )}
              editorProps={{
                handleDOMEvents: {
                  keydown: (_view: unknown, event: KeyboardEvent) => {
                    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
                      event.preventDefault();
                      if (event.shiftKey) {
                        editorInstance?.chain().focus().redo().scrollIntoView().run();
                      } else {
                        editorInstance?.chain().focus().undo().scrollIntoView().run();
                      }
                      return true;
                    }
                    if (["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(event.key)) {
                      return handleCommandNavigation(event);
                    }
                    return false;
                  },
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
                {isTableActive() && (
                  <>
                    {/* Compact Notion-Style Table Menu Popover */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs font-medium text-txt-brand hover:bg-accent gap-1 cursor-pointer"
                          title="Menu Aksi Tabel"
                        >
                          <TableIcon className="h-3.5 w-3.5" />
                          <span>Table</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                      </PopoverTrigger>

                      <PopoverContent align="start" className="w-52 p-1.5 bg-popover border border-border rounded-xl shadow-2xl z-50 text-xs space-y-0.5">
                        {/* 1. Header Cell Switch Toggle */}
                        <div
                          onClick={() => editorInstance?.chain().focus().toggleHeaderCell().run()}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-accent text-txt-primary cursor-pointer select-none transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <TableProperties className="h-3.5 w-3.5 text-txt-brand" />
                            <span>Header</span>
                          </div>
                          <Switch
                            checked={editorInstance?.isActive("tableHeader") ?? false}
                            onCheckedChange={() => editorInstance?.chain().focus().toggleHeaderCell().run()}
                            className="scale-75 pointer-events-none"
                          />
                        </div>

                        {/* 2. Color Submenu Popover */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-accent text-txt-primary cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Paintbrush className="h-3.5 w-3.5 text-purple-400" />
                                <span>Color</span>
                              </div>
                              <span className="text-txt-muted text-xs">›</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent side="right" align="start" className="w-56 p-2 bg-popover border border-border rounded-xl shadow-2xl z-50 text-xs">
                            <div className="font-semibold text-txt-muted px-1 pb-1 text-[11px]">Text color</div>
                            <div className="grid grid-cols-5 gap-1 pb-2">
                              {TABLE_TEXT_COLORS.map((c) => (
                                <button
                                  key={c.label}
                                  type="button"
                                  onClick={() => {
                                    if (c.value === "inherit") editorInstance?.chain().focus().unsetMark("textColor").run();
                                    else editorInstance?.chain().focus().setMark("textColor", { color: c.value }).run();
                                  }}
                                  className="h-6 w-full rounded flex items-center justify-center font-bold text-xs border border-border/40 hover:scale-110 hover:border-txt-brand bg-accent/20 cursor-pointer"
                                  style={{ color: c.value === "inherit" ? undefined : c.value }}
                                  title={c.label}
                                >
                                  A
                                </button>
                              ))}
                            </div>
                            <Separator className="my-1" />
                            <div className="font-semibold text-txt-muted px-1 py-1 text-[11px]">Background color</div>
                            <div className="grid grid-cols-5 gap-1">
                              {TABLE_BG_COLORS.map((c) => (
                                <button
                                  key={c.label}
                                  type="button"
                                  onClick={() => {
                                    editorInstance
                                      ?.chain()
                                      .focus()
                                      .setCellAttribute("backgroundColor", c.value === "transparent" ? null : c.value)
                                      .run();
                                  }}
                                  className="h-6 w-full rounded border border-border/40 hover:scale-110 hover:border-txt-brand cursor-pointer flex items-center justify-center"
                                  style={{ backgroundColor: c.value }}
                                  title={c.label}
                                >
                                  {c.value === "transparent" && <span className="text-[10px] text-txt-muted">∅</span>}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Separator className="my-1" />

                        {/* 3. Insert Row / Col */}
                        <button
                          type="button"
                          onClick={() => editorInstance?.chain().focus().addColumnAfter().run()}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-accent text-txt-primary cursor-pointer transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5 text-txt-brand" /> Insert column
                        </button>
                        <button
                          type="button"
                          onClick={() => editorInstance?.chain().focus().addRowAfter().run()}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-accent text-txt-primary cursor-pointer transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5 text-txt-brand" /> Insert row
                        </button>
                        <button
                          type="button"
                          onClick={() => editorInstance?.chain().focus().mergeOrSplit().run()}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-accent text-txt-primary cursor-pointer transition-colors"
                        >
                          <Combine className="h-3.5 w-3.5 text-purple-400" /> Merge / Split cells
                        </button>

                        <Separator className="my-1" />

                        {/* 4. Clear & Delete Actions */}
                        <button
                          type="button"
                          onClick={() => editorInstance?.chain().focus().deleteRange(editorInstance.state.selection).run()}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-accent text-txt-muted hover:text-txt-primary cursor-pointer transition-colors"
                        >
                          <Eraser className="h-3.5 w-3.5" /> Clear contents
                        </button>
                        <button
                          type="button"
                          onClick={() => editorInstance?.chain().focus().deleteRow().run()}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/10 text-amber-500 cursor-pointer transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete row
                        </button>
                        <button
                          type="button"
                          onClick={() => editorInstance?.chain().focus().deleteColumn().run()}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/10 text-amber-500 cursor-pointer transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete column
                        </button>
                        <button
                          type="button"
                          onClick={() => editorInstance?.chain().focus().deleteTable().run()}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-500 cursor-pointer transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete table
                        </button>
                      </PopoverContent>
                    </Popover>

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
      </div>

      {/* 5. AI Summary Dialog */}
      <AiSummaryDialog
        isOpen={isAiDialogOpen}
        onClose={() => setIsAiDialogOpen(false)}
        noteId={noteId}
        workspacePath={workspacePath}
        noteTitle={title}
        onInsertSummary={handleInsertSummary}
      />

      {/* 6. Image Dialog */}
      <ImageDialog
        isOpen={isImageDialogOpen}
        onClose={() => setIsImageDialogOpen(false)}
        onInsertImage={(src) => {
          if (editorInstance) {
            editorInstance.chain().focus().setImage({ src }).run();
            scheduleAutoSave();
          }
        }}
      />
    </div>
  );
}
