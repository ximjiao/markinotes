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
import { Table, TableView } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Link } from "@tiptap/extension-link";
import { Mark, mergeAttributes, Extension } from "@tiptap/core";
import { CustomImageExtension } from "./custom-image-extension";
import { Markdown } from "tiptap-markdown";
import { common, createLowlight } from "lowlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import TextAlign from "@tiptap/extension-text-align";

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
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
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
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
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
import { AiSummaryPanel } from "./ai-summary-panel";
import { NotionBlockSideHandle } from "./notion-block-side-handle";
import { NotionTocMinimap } from "./notion-toc-minimap";
import { NotionTablePillHandles } from "./notion-table-pill-handles";
import { NotionSelectionPopover } from "./notion-selection-popover";
import { NotionLinkHoverCard } from "./notion-link-hover-card";
import { ImageDialog } from "./image-dialog";
import { noteIpc } from "@/features/home/_lib/note-ipc";
import { useUiStore } from "@/stores";

interface NovelEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  allWorkspaceTags?: string[];
  onBack?: () => void;
  onSave?: (title: string, content: string, tags: string[]) => void;
  onOpenSettings?: () => void;
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
    description: "Large section heading",
    icon: <Heading1 className="h-4 w-4" />,
    badge: "#",
    searchTerms: ["h1", "heading", "title", "#"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: <Heading2 className="h-4 w-4" />,
    badge: "##",
    searchTerms: ["h2", "subtitle", "##"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small sub-section heading",
    icon: <Heading3 className="h-4 w-4" />,
    badge: "###",
    searchTerms: ["h3", "sub-subtitle", "###"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a simple bulleted list",
    icon: <List className="h-4 w-4" />,
    badge: "-",
    searchTerms: ["bullet", "list", "unordered", "-"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a list with numbering",
    icon: <ListOrdered className="h-4 w-4" />,
    badge: "1.",
    searchTerms: ["numbered", "list", "ordered", "1."],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "To-do List",
    description: "Track tasks with a to-do checklist",
    icon: <CheckSquare className="h-4 w-4" />,
    badge: "[]",
    searchTerms: ["todo", "task", "checklist", "[]"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Code Block",
    description: "Capture code snippets with syntax highlighting",
    icon: <Code className="h-4 w-4" />,
    badge: "```",
    searchTerms: ["code", "snippet", "```"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Table",
    description: "Insert a 3x3 table grid",
    icon: <TableIcon className="h-4 w-4" />,
    badge: "3x3",
    searchTerms: ["table", "grid"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: "Image",
    description: "Upload an image or paste URL",
    icon: <ImageIcon className="h-4 w-4" />,
    badge: "img",
    searchTerms: ["image", "photo", "picture", "upload", "img"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setImage({ src: "" }).run();
    },
  },
  {
    title: "Quote",
    description: "Capture a notable quote or callout",
    icon: <Quote className="h-4 w-4" />,
    badge: ">",
    searchTerms: ["quote", "citation", ">"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Divider",
    description: "Visually divide blocks with a horizontal rule",
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

class CustomTableView extends TableView {
  constructor(node: any, cellMinWidth: number) {
    super(node, cellMinWidth);
    this.updateCustomAttributes(node);
  }

  update(node: any) {
    const result = super.update(node);
    if (result) {
      this.updateCustomAttributes(node);
    }
    return result;
  }

  updateCustomAttributes(node: any) {
    const attrs = node.attrs || {};

    // 1. data-zebra
    if (attrs.zebra) {
      this.table.setAttribute("data-zebra", "true");
      this.dom.setAttribute("data-zebra", "true");
    } else {
      this.table.removeAttribute("data-zebra");
      this.dom.removeAttribute("data-zebra");
    }

    // 2. data-zebra-color
    if (attrs.zebraColor && attrs.zebraColor !== "default") {
      this.table.setAttribute("data-zebra-color", attrs.zebraColor);
      this.dom.setAttribute("data-zebra-color", attrs.zebraColor);
    } else {
      this.table.removeAttribute("data-zebra-color");
      this.dom.removeAttribute("data-zebra-color");
    }

    // 3. data-header-color
    if (attrs.headerColor && attrs.headerColor !== "default") {
      this.table.setAttribute("data-header-color", attrs.headerColor);
      this.dom.setAttribute("data-header-color", attrs.headerColor);
    } else {
      this.table.removeAttribute("data-header-color");
      this.dom.removeAttribute("data-header-color");
    }
  }
}

const CustomTable = Table.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      View: CustomTableView,
    };
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      zebra: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-zebra") === "true",
        renderHTML: (attributes) => {
          if (!attributes.zebra) return {};
          return {
            "data-zebra": "true",
          };
        },
      },
      headerColor: {
        default: "default",
        parseHTML: (element) => element.getAttribute("data-header-color") || "default",
        renderHTML: (attributes) => {
          if (!attributes.headerColor || attributes.headerColor === "default") return {};
          return {
            "data-header-color": attributes.headerColor,
          };
        },
      },
      zebraColor: {
        default: "default",
        parseHTML: (element) => element.getAttribute("data-zebra-color") || "default",
        renderHTML: (attributes) => {
          if (!attributes.zebraColor || attributes.zebraColor === "default") return {};
          return {
            "data-zebra-color": attributes.zebraColor,
          };
        },
      },
    };
  },
}).configure({
  resizable: true,
  lastColumnResizable: true,
  cellMinWidth: 50,
  View: CustomTableView,
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
        tag: "span[data-color]",
        getAttrs: (element) => {
          const color = (element as HTMLElement).getAttribute("data-color");
          return color ? { color } : false;
        },
      },
      {
        tag: "span[style*='color']",
        getAttrs: (element) => {
          const color = (element as HTMLElement).style.color || (element as HTMLElement).getAttribute("data-color");
          return color ? { color } : false;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

const TextHighlight = Mark.create({
  name: "textHighlight",
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => (element as HTMLElement).style.backgroundColor || element.getAttribute("data-highlight") || null,
        renderHTML: (attributes) => {
          if (!attributes.color) return {};
          return {
            style: `background-color: ${attributes.color}`,
            "data-highlight": attributes.color,
            class: "px-1 py-0.5 rounded",
          };
        },
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "mark",
        getAttrs: (element) => {
          const bg = (element as HTMLElement).getAttribute("data-highlight") || (element as HTMLElement).style.backgroundColor || "rgba(234, 179, 8, 0.25)";
          return { color: bg };
        },
      },
      {
        tag: "span[data-highlight]",
        getAttrs: (element) => {
          const bg = (element as HTMLElement).getAttribute("data-highlight");
          return bg ? { color: bg } : false;
        },
      },
      {
        tag: "span[style*='background']",
        getAttrs: (element) => {
          const bg = (element as HTMLElement).style.backgroundColor || (element as HTMLElement).getAttribute("data-highlight");
          return bg ? { color: bg } : false;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

const IndentExtension = Extension.create({
  name: "indent",
  addOptions() {
    return {
      types: ["paragraph", "heading", "blockquote"],
      minLevel: 0,
      maxLevel: 6,
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const dataIndent = element.getAttribute("data-indent");
              return dataIndent ? parseInt(dataIndent, 10) : 0;
            },
            renderHTML: (attributes) => {
              if (!attributes.indent || attributes.indent <= 0) {
                return {};
              }
              return {
                "data-indent": attributes.indent,
                style: `margin-left: ${attributes.indent * 28}px;`,
              };
            },
          },
        },
      },
    ];
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

const TABLE_HEADER_COLORS = [
  { label: "Default", value: "default", bg: "hsl(var(--accent) / 0.6)" },
  { label: "Gray", value: "gray", bg: "rgba(156, 163, 175, 0.25)" },
  { label: "Blue", value: "blue", bg: "rgba(59, 130, 246, 0.22)" },
  { label: "Green", value: "green", bg: "rgba(34, 197, 94, 0.22)" },
  { label: "Yellow", value: "yellow", bg: "rgba(234, 179, 8, 0.25)" },
  { label: "Pink", value: "pink", bg: "rgba(236, 72, 153, 0.22)" },
  { label: "Orange", value: "orange", bg: "rgba(249, 115, 22, 0.22)" },
  { label: "Purple", value: "purple", bg: "rgba(168, 85, 247, 0.22)" },
  { label: "Red", value: "red", bg: "rgba(239, 68, 68, 0.22)" },
];

const lowlight = createLowlight(common);

const defaultExtensions = [
  // 1. StarterKit prioritized first for input rules (1., -, *, >, ```)
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    bulletList: {},
    orderedList: {},
    blockquote: {},
    codeBlock: false,
  }),
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: "javascript",
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
  IndentExtension,
  TextAlign.configure({
    types: ["heading", "paragraph", "blockquote"],
    alignments: ["left", "center", "right", "justify"],
    defaultAlignment: "left",
  }),
  TextStyle,
  TextColor,
  TextHighlight,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: "editor-link cursor-pointer",
    },
  }),
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
  onOpenSettings,
  noteId,
  workspacePath,
}: NovelEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isTitleCustom, setIsTitleCustom] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "dirty" | "saving" | "streaming" | "error">("saved");
  const [saveCountdown, setSaveCountdown] = useState<number | null>(null);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const fontStyle = useUiStore((s) => s.editorFontStyle);
  const setFontStyle = useUiStore((s) => s.setEditorFontStyle);
  const isSmallText = useUiStore((s) => s.editorIsSmallText);
  const setIsSmallText = useUiStore((s) => s.setEditorIsSmallText);
  const isFullWidth = useUiStore((s) => s.editorIsFullWidth);
  const setIsFullWidth = useUiStore((s) => s.setEditorIsFullWidth);

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

  const performSave = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setSaveCountdown(null);
    setSaveStatus("streaming");
    try {
      await Promise.resolve(onSaveRef.current?.(titleRef.current, contentRef.current, tagsRef.current));
      setSaveStatus("saved");
    } catch (err) {
      console.error("Save stream error:", err);
      setSaveStatus("error");
    }
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
      {/* 1. Header Navigation Bar (Top Bar: Back, Title, Tags, Actions) */}
      <div className="px-4 py-2 border-b border-border/80 bg-background/95 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0 select-none">
        {/* Left: Back + Page Title + Tags */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
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
            className="text-sm font-semibold text-txt-primary bg-transparent outline-none border border-transparent hover:border-border focus:border-txt-brand rounded px-2 py-0.5 max-w-xs sm:max-w-md w-auto min-w-[120px] transition-colors truncate"
          />

          {/* Tags Popover Editor */}
          <Popover open={isEditingTags} onOpenChange={setIsEditingTags}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 shrink-0 ml-1 px-1.5 py-0.5 rounded hover:bg-accent/50 transition-colors">
                {tags.length === 0 ? (
                  <span className="text-[10px] text-txt-muted flex items-center gap-0.5 border border-dashed border-transparent hover:border-border rounded px-1">
                    <Plus className="h-2.5 w-2.5" /> Add Tag
                  </span>
                ) : (
                  <>
                    {tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0 h-4 rounded-sm font-normal text-txt-secondary border-border">
                        #{tag}
                      </Badge>
                    ))}
                    {tags.length > 2 && (
                      <span className="text-[10px] text-txt-muted font-medium px-0.5">+{tags.length - 2}</span>
                    )}
                  </>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-2.5 space-y-2 bg-popover border-border shadow-md rounded-lg">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0.5 rounded font-normal flex items-center gap-1 bg-accent/50 text-txt-secondary border-border hover:bg-accent transition-colors">
                      #{tag}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setTags(tags.filter(t => t !== tag));
                          scheduleAutoSave();
                        }}
                        className="hover:text-destructive transition-colors focus:outline-none"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <input
                autoFocus
                placeholder="Type tag & press enter..."
                className="text-xs px-2 py-1.5 w-full bg-background border border-border rounded-md outline-none focus:border-txt-brand text-txt-primary transition-colors shadow-sm"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newTagInput && !tags.includes(newTagInput)) {
                      setTags([...tags, newTagInput]);
                      scheduleAutoSave();
                    }
                    setNewTagInput("");
                  }
                }}
              />
              {(() => {
                const availableTags = allWorkspaceTags.filter(t => !tags.includes(t) && t.includes(newTagInput));
                if (availableTags.length === 0) return null;
                return (
                  <div className="pt-2">
                    <div className="text-[10px] text-txt-muted mb-1.5 font-medium px-0.5">Existing Tags</div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
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
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </PopoverContent>
          </Popover>
        </div>

        {/* Right Side: Save Status Indicator, AI Summarize, & Export */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Save Status Indicator */}
          {saveStatus === "saved" && (
            <div className="flex items-center h-6 px-2 text-[11px] gap-1 font-medium text-emerald-600 bg-emerald-500/10 rounded-full border border-emerald-600/30">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </div>
          )}
          {saveStatus === "streaming" && (
            <div className="flex items-center h-6 px-2 text-[11px] gap-1 font-medium text-sky-600 dark:text-sky-400 bg-sky-500/10 rounded-full border border-sky-500/30 animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500" /> Streaming...
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
          <Button
            variant={isAiDialogOpen ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsAiDialogOpen(prev => !prev)}
            className={`h-7 px-2.5 text-xs gap-1.5 font-medium transition-colors shadow-xs rounded-full cursor-pointer ${
              isAiDialogOpen
                ? "text-purple-700 dark:text-purple-300 border-purple-500/50 bg-purple-500/20"
                : "text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:text-purple-700 dark:hover:text-purple-300"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            {isAiDialogOpen ? "Tutup Summary" : "Summarize with AI"}
          </Button>

          {/* Export Menu */}
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
      </div>

      {/* 2. Formatting Toolbar Row */}
      <div className="px-4 py-1 border-b border-border/50 bg-secondary/20 flex items-center gap-1 shrink-0 select-none overflow-x-auto">
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

        <Separator orientation="vertical" className="h-4 shrink-0 mx-1" />

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

        <Separator orientation="vertical" className="h-4 shrink-0 mx-1" />

        {/* Inline Formatting */}
        <Button variant={editorInstance?.isActive("bold") ? "secondary" : "ghost"} size="icon" className="h-7 w-7 shrink-0" onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().toggleBold().run()} title="Bold"><Bold className="h-3.5 w-3.5" /></Button>
        <Button variant={editorInstance?.isActive("italic") ? "secondary" : "ghost"} size="icon" className="h-7 w-7 shrink-0" onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().toggleItalic().run()} title="Italic"><Italic className="h-3.5 w-3.5" /></Button>
        <Button variant={editorInstance?.isActive("strike") ? "secondary" : "ghost"} size="icon" className="h-7 w-7 shrink-0" onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough className="h-3.5 w-3.5" /></Button>
        <Button variant={editorInstance?.isActive("code") ? "secondary" : "ghost"} size="icon" className="h-7 w-7 shrink-0" onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().toggleCode().run()} title="Inline Code"><Code className="h-3.5 w-3.5" /></Button>

        <Separator orientation="vertical" className="h-4 shrink-0 mx-1" />

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

        <Separator orientation="vertical" className="h-4 shrink-0 mx-1" />

        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onMouseDown={(e) => e.preventDefault()} onClick={() => editorInstance?.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear Formatting">
          <RemoveFormatting className="h-3.5 w-3.5 text-txt-muted" />
        </Button>
      </div>

      {/* 3. Main Split View Container */}
      <div className="flex-1 flex overflow-hidden min-h-0 w-full">
        {/* Left Side: Canvas & Editor Space */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto min-w-0">
          <div className="flex-1 px-8 sm:px-14 py-8 max-w-4xl mx-auto w-full">
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
          <EditorFooter
            wordCount={wordCount}
            charCount={charCount}
          />
        </div>

        {/* Right Side: Split Screen AI Summary Panel */}
        <AiSummaryPanel
          isOpen={isAiDialogOpen}
          onClose={() => setIsAiDialogOpen(false)}
          noteId={noteId}
          workspacePath={workspacePath}
          noteTitle={title}
          onInsertSummary={handleInsertSummary}
          onOpenSettings={onOpenSettings}
        />
      </div>
    </div>
  );
}
