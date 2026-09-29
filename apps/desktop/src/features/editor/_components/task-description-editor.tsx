"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  EditorRoot,
  EditorContent,
  EditorCommand,
  EditorCommandItem,
  EditorCommandEmpty,
  EditorCommandList,
  EditorBubble,
  Command,
  createSuggestionItems,
  renderItems,
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
import { Markdown } from "tiptap-markdown";
import { common, createLowlight } from "lowlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import TextAlign from "@tiptap/extension-text-align";
import type { Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { AllSelection } from "@tiptap/pm/state";
import { CustomImageExtension } from "./custom-image-extension";
import { NotionBlockSideHandle } from "./notion-block-side-handle";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const lowlight = createLowlight(common);

interface TaskSlashItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  searchTerms: string[];
  command: ({ editor, range }: { editor: Editor; range: any }) => void;
}

const taskSlashItems: TaskSlashItem[] = [
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
    searchTerms: ["h2", "heading", "subtitle", "##"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: <Heading3 className="h-4 w-4" />,
    badge: "###",
    searchTerms: ["h3", "heading", "sub", "###"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run();
    },
  },
  {
    title: "To-do List",
    description: "Track tasks with a checklist",
    icon: <CheckSquare className="h-4 w-4" />,
    badge: "[]",
    searchTerms: ["todo", "task", "checklist", "check", "[]"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
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
    title: "Code Block",
    description: "Capture code with syntax highlighting",
    icon: <Code className="h-4 w-4" />,
    badge: "```",
    searchTerms: ["code", "block", "snippet", "pre", "```"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Table",
    description: "Insert a 3x3 table",
    icon: <TableIcon className="h-4 w-4" />,
    badge: "table",
    searchTerms: ["table", "grid", "sheet"],
    command: ({ editor, range }: any) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
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
    description: "Visually divide blocks with a line",
    icon: <Minus className="h-4 w-4" />,
    badge: "---",
    searchTerms: ["line", "divider", "hr", "---"],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

const suggestionItems = createSuggestionItems(
  taskSlashItems.map((item) => ({
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

interface TaskDescriptionEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
}

export function TaskDescriptionEditor({
  value,
  onChange,
  placeholder = "Type '/' for commands or write task notes...",
  className,
}: TaskDescriptionEditorProps) {
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const isInternalUpdateRef = useRef(false);

  const extensions = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      codeBlock: false,
    }),
    CodeBlockLowlight.configure({
      lowlight,
    }),
    Placeholder.configure({
      placeholder,
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true, lastColumnResizable: true, cellMinWidth: 60 }),
    TableRow,
    TableCell,
    TableHeader,
    Link.configure({ openOnClick: false }),
    TextAlign.configure({
      types: ["heading", "paragraph", "blockquote"],
      alignments: ["left", "center", "right", "justify"],
      defaultAlignment: "left",
    }),
    CustomImageExtension,
    slashCommand,
    Markdown.configure({
      html: true,
      transformPastedText: true,
      transformCopiedText: true,
    }),
  ];

  // Sync external value updates (e.g. switching cards)
  useEffect(() => {
    if (!editorInstance || editorInstance.isDestroyed) return;

    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    let currentMarkdown = "";
    try {
      currentMarkdown = (editorInstance.storage as any)?.markdown?.getMarkdown?.() || "";
    } catch {
      currentMarkdown = editorInstance.getText() || "";
    }

    if (value !== currentMarkdown) {
      editorInstance.commands.setContent(value || "", false, { preserveWhitespace: true });
    }
  }, [value, editorInstance]);

  return (
    <div
      onKeyDown={(e) => e.stopPropagation()}
      className={cn(
        "group relative flex flex-col rounded-xl border border-border/80 bg-secondary/15 shadow-xs focus-within:border-primary/60 transition-colors",
        className
      )}
    >
      {/* Main Writing Canvas & Side Handle Wrapper */}
      <div className="relative w-full p-4 pl-12 min-h-[220px]">
        {/* Notion-style Element Side Handle (+ and :: Drag Grip) */}
        {editorInstance && (
          <NotionBlockSideHandle
            editor={editorInstance}
            gutterOffset={38}
            clampInsideContainer={true}
            onOpenSlashMenu={() => {
              // Trigger suggestion command
            }}
          />
        )}

        {/* Novel Root Editor */}
        <EditorRoot>
          <EditorContent
            initialContent={value as any}
            extensions={extensions}
            className="prose dark:prose-invert max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:ring-0 [&_.ProseMirror]:border-none text-txt-primary text-xs leading-relaxed min-h-[180px]"
            editorProps={{
              handleDOMEvents: {
                keydown: (_view: unknown, event: KeyboardEvent) => {
                  event.stopPropagation();

                  // 1. Select All (Cmd+A / Ctrl+A)
                  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
                    event.preventDefault();
                    const editorView = _view as any;
                    if (editorView?.dispatch && editorView?.state) {
                      try {
                        editorView.dispatch(editorView.state.tr.setSelection(new AllSelection(editorView.state.doc)));
                        return true;
                      } catch {
                        // fallback
                      }
                    }
                    if (editorInstance && !editorInstance.isDestroyed) {
                      try {
                        const { state, view } = editorInstance;
                        view.dispatch(state.tr.setSelection(new AllSelection(state.doc)));
                      } catch {
                        editorInstance.chain().focus().selectAll().run();
                      }
                    }
                    return true;
                  }

                  // 2. Undo / Redo
                  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
                    event.preventDefault();
                    if (event.shiftKey) {
                      editorInstance?.chain().focus().redo().run();
                    } else {
                      editorInstance?.chain().focus().undo().run();
                    }
                    return true;
                  }

                  // 2. Tab & Shift+Tab (Notion-Style Block Leveling & Indent)
                  if (event.key === "Tab") {
                    event.preventDefault();
                    if (!editorInstance || editorInstance.isDestroyed) return true;

                    // Inside Table
                    if (editorInstance.isActive("table")) {
                      if (event.shiftKey) {
                        editorInstance.chain().focus().goToPreviousCell().run();
                      } else {
                        editorInstance.chain().focus().goToNextCell().run();
                      }
                      return true;
                    }

                    // Inside List / Task Item
                    if (editorInstance.isActive("listItem") || editorInstance.isActive("taskItem")) {
                      if (event.shiftKey) {
                        editorInstance.chain().focus().liftListItem("listItem").liftListItem("taskItem").run();
                      } else {
                        editorInstance.chain().focus().sinkListItem("listItem").sinkListItem("taskItem").run();
                      }
                      return true;
                    }

                    // Inside CodeBlock
                    if (editorInstance.isActive("codeBlock")) {
                      editorInstance.chain().focus().insertContent("  ").run();
                      return true;
                    }

                    // Indent / Outdent for standard block
                    const { selection } = editorInstance.state;
                    const { $from } = selection;
                    const currentBlock = $from.node($from.depth);
                    if (currentBlock) {
                      const currentIndent = currentBlock.attrs.indent || 0;
                      if (event.shiftKey) {
                        if (currentIndent > 0) {
                          editorInstance.commands.updateAttributes(currentBlock.type.name, {
                            indent: currentIndent - 1,
                          });
                        }
                      } else {
                        if (currentIndent < 6) {
                          editorInstance.commands.updateAttributes(currentBlock.type.name, {
                            indent: currentIndent + 1,
                          });
                        }
                      }
                      return true;
                    }
                    return true;
                  }

                  // 3. Backspace at beginning of indented block -> outdent
                  if (event.key === "Backspace") {
                    if (editorInstance && !editorInstance.isDestroyed) {
                      const { selection } = editorInstance.state;
                      if (selection.empty && selection.$from.parentOffset === 0) {
                        const currentBlock = selection.$from.node(selection.$from.depth);
                        if (currentBlock && (currentBlock.attrs.indent || 0) > 0) {
                          event.preventDefault();
                          editorInstance.commands.updateAttributes(currentBlock.type.name, {
                            indent: currentBlock.attrs.indent - 1,
                          });
                          return true;
                        }
                      }
                    }
                  }

                  // 4. Slash command navigation
                  if (["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(event.key)) {
                    return handleCommandNavigation(event);
                  }
                  return false;
                },
              },
            }}
            onCreate={({ editor }) => {
              setEditorInstance(editor);
              if (value) {
                try {
                  editor.commands.setContent(value, false, { preserveWhitespace: true });
                } catch {
                  // Fallback
                }
              }
            }}
            onUpdate={({ editor }) => {
              if (!editorInstance) setEditorInstance(editor);
              isInternalUpdateRef.current = true;
              const md = (editor.storage as any)?.markdown?.getMarkdown?.() || editor.getText();
              onChange(md);
            }}
          >
            {/* Notion Slash Commands Popup */}
            <EditorCommand className="z-[99] h-auto max-h-[300px] w-64 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-2xl transition-all">
              <EditorCommandEmpty className="p-2 text-xs text-txt-muted">
                No matching blocks found
              </EditorCommandEmpty>
              <EditorCommandList>
                {taskSlashItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <EditorCommandItem
                      key={item.title}
                      value={item.title}
                      onCommand={(val) => item.command?.(val)}
                      className="flex items-center justify-between gap-2.5 rounded-lg px-2 py-1.5 text-xs text-txt-primary hover:bg-accent cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded border border-border bg-accent/40 text-txt-brand shrink-0">
                          {Icon}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs">{item.title}</span>
                          <span className="text-[10px] text-txt-muted">{item.description}</span>
                        </div>
                      </div>

                      {item.badge && (
                        <span className="text-[10px] font-mono text-txt-muted px-1.5 py-0.5 rounded border border-border/50 bg-accent/20 shrink-0">
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
              tippyOptions={{ maxWidth: "none", placement: "top" }}
              shouldShow={({ editor, state }) => {
                if (!editor || !state) return false;
                if (state.selection.empty || state.selection.from === state.selection.to) {
                  return false;
                }
                if (editor.isActive("image")) return false;
                return true;
              }}
              className="z-[99] flex items-center gap-0.5 rounded-lg border border-border bg-popover/95 p-1 shadow-2xl backdrop-blur text-txt-primary"
            >
              {editorInstance && (
                <>
                  <Button
                    type="button"
                    variant={editorInstance.isActive("bold") ? "secondary" : "ghost"}
                    size="icon"
                    className="h-6 w-6 rounded"
                    onClick={() => editorInstance.chain().focus().toggleBold().run()}
                  >
                    <Bold className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant={editorInstance.isActive("italic") ? "secondary" : "ghost"}
                    size="icon"
                    className="h-6 w-6 rounded"
                    onClick={() => editorInstance.chain().focus().toggleItalic().run()}
                  >
                    <Italic className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant={editorInstance.isActive("strike") ? "secondary" : "ghost"}
                    size="icon"
                    className="h-6 w-6 rounded"
                    onClick={() => editorInstance.chain().focus().toggleStrike().run()}
                  >
                    <Strikethrough className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant={editorInstance.isActive("code") ? "secondary" : "ghost"}
                    size="icon"
                    className="h-6 w-6 rounded"
                    onClick={() => editorInstance.chain().focus().toggleCode().run()}
                  >
                    <Code className="h-3 w-3" />
                  </Button>
                </>
              )}
            </EditorBubble>
          </EditorContent>
        </EditorRoot>
      </div>
    </div>
  );
}
