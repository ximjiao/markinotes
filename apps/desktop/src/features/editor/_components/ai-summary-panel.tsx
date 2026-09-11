"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { noteIpc } from "@/features/home/_lib/note-ipc";
import { workspaceConfig } from "@/features/workspace/_lib/workspace-config";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRightToLine,
  Atom,
  Check,
  CheckSquare,
  Copy,
  HelpCircle,
  History,
  Lightbulb,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  SquareArrowLeft,
  Trash2,
  X
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface AiSummaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  noteId?: string;
  workspacePath?: string | null;
  noteTitle?: string;
  onInsertSummary?: (summaryText: string) => void;
  onOpenSettings?: () => void;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  viewMode?: "prettified" | "raw";
  copied?: boolean;
}

function FormattedInline({ text }: { text: string }) {
  if (!text) return null;

  // Unescape markdown characters often escaped by LLMs (e.g. \`code\` -> `code`)
  const normalized = text.replace(/\\([`*_~[\]()])/g, "$1");

  const parts: React.ReactNode[] = [];
  let remaining = normalized;
  let key = 0;

  while (remaining.length > 0) {
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);
    const strikeMatch = remaining.match(/~~([^~]+)~~/);
    const markMatch = remaining.match(/==([^=]+)==/);
    const mathMatch = remaining.match(/\$([^$]+)\$/);

    const candidates = [
      linkMatch && linkMatch.index !== undefined ? { type: "link", index: linkMatch.index, match: linkMatch } : null,
      boldMatch && boldMatch.index !== undefined ? { type: "bold", index: boldMatch.index, match: boldMatch } : null,
      codeMatch && codeMatch.index !== undefined ? { type: "code", index: codeMatch.index, match: codeMatch } : null,
      italicMatch && italicMatch.index !== undefined ? { type: "italic", index: italicMatch.index, match: italicMatch } : null,
      strikeMatch && strikeMatch.index !== undefined ? { type: "strike", index: strikeMatch.index, match: strikeMatch } : null,
      markMatch && markMatch.index !== undefined ? { type: "mark", index: markMatch.index, match: markMatch } : null,
      mathMatch && mathMatch.index !== undefined ? { type: "math", index: mathMatch.index, match: mathMatch } : null,
    ]
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => a.index - b.index);

    if (candidates.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = candidates[0]!;
    const before = remaining.slice(0, first.index);
    if (before) parts.push(before);

    const fullMatchLength = first.match[0].length;
    const innerContent = first.match[1];

    if (first.type === "link") {
      parts.push(
        <a
          key={key++}
          href={first.match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity font-medium"
        >
          <FormattedInline text={innerContent} />
        </a>
      );
    } else if (first.type === "bold") {
      parts.push(
        <strong key={key++} className="font-semibold text-txt-primary">
          <FormattedInline text={innerContent} />
        </strong>
      );
    } else if (first.type === "code") {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-primary/10 text-primary font-mono text-[11px] border border-primary/20 font-medium"
        >
          {innerContent}
        </code>
      );
    } else if (first.type === "italic") {
      parts.push(
        <em key={key++} className="italic text-txt-secondary">
          <FormattedInline text={innerContent} />
        </em>
      );
    } else if (first.type === "strike") {
      parts.push(
        <del key={key++} className="line-through text-txt-secondary opacity-70">
          <FormattedInline text={innerContent} />
        </del>
      );
    } else if (first.type === "mark") {
      parts.push(
        <mark key={key++} className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 px-1 py-0.5 rounded">
          <FormattedInline text={innerContent} />
        </mark>
      );
    } else if (first.type === "math") {
      parts.push(
        <span
          key={key++}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-secondary/80 text-txt-primary font-mono text-[11px] border border-border/50"
        >
          {innerContent}
        </span>
      );
    }

    remaining = remaining.slice(first.index + fullMatchLength);
  }

  return <>{parts}</>;
}

function parseTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);

  const cells: string[] = [];
  let current = "";
  let escaped = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === "\\" && !escaped) {
      escaped = true;
      current += char;
    } else if (char === "|" && !escaped) {
      cells.push(current.trim());
      current = "";
    } else {
      escaped = false;
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function isTableSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("-")) return false;
  const cells = parseTableRow(trimmed);
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c.trim()));
}

function parseTableAlignments(separatorLine: string): ("left" | "center" | "right")[] {
  const cells = parseTableRow(separatorLine);
  return cells.map((cell) => {
    const c = cell.trim();
    if (c.startsWith(":") && c.endsWith(":")) return "center";
    if (c.endsWith(":")) return "right";
    return "left";
  });
}

export function PrettifiedSummary({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code Block
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      elements.push(
        <div key={`code-${i}`} className="my-2 rounded-lg border border-border/70 overflow-hidden bg-secondary/50 shadow-2xs">
          {lang && (
            <div className="px-3 py-1 bg-secondary/80 border-b border-border/50 text-[10px] font-mono text-txt-muted flex items-center justify-between">
              <span>{lang}</span>
            </div>
          )}
          <pre className="p-3 text-[11px] font-mono overflow-x-auto text-txt-primary">
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 2. Table Block
    if (trimmed.includes("|") && (trimmed.startsWith("|") || (i + 1 < lines.length && isTableSeparatorRow(lines[i + 1])))) {
      const tableLines: string[] = [];
      const tableStartIdx = i;
      while (i < lines.length && lines[i].trim().includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = parseTableRow(tableLines[0]);
        let alignments: ("left" | "center" | "right")[] = [];
        let bodyStartIndex = 1;

        if (isTableSeparatorRow(tableLines[1])) {
          alignments = parseTableAlignments(tableLines[1]);
          bodyStartIndex = 2;
        }

        const bodyRows = tableLines.slice(bodyStartIndex).map((l) => parseTableRow(l));

        elements.push(
          <div key={`table-${tableStartIdx}`} className="my-2.5 overflow-x-auto rounded-lg border border-border/70 bg-surface/40 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-secondary/70 border-b border-border/60">
                  {headerCells.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className={cn(
                        "px-3 py-2 font-semibold text-txt-primary text-[11px] whitespace-nowrap",
                        alignments[hIdx] === "center" ? "text-center" : alignments[hIdx] === "right" ? "text-right" : "text-left"
                      )}
                    >
                      <FormattedInline text={h} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-accent/30 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={cn(
                          "px-3 py-2 text-txt-primary text-xs leading-relaxed",
                          alignments[cIdx] === "center" ? "text-center" : alignments[cIdx] === "right" ? "text-right" : "text-left"
                        )}
                      >
                        <FormattedInline text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      } else {
        // Backtrack single line with pipe that isn't a full table
        i = tableStartIdx;
      }
    }

    // 3. Blockquotes (multi-line grouped)
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      const quoteStartIdx = i;
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      elements.push(
        <div key={`quote-${quoteStartIdx}`} className="my-1.5 p-2.5 rounded-r-lg bg-primary/5 border-l-2 border-primary text-xs text-txt-secondary space-y-1">
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx} className="leading-relaxed">
              <FormattedInline text={ql} />
            </p>
          ))}
        </div>
      );
      continue;
    }

    // 4. Empty line
    if (!trimmed) {
      elements.push(<div key={`space-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // 5. Horizontal Rule: --- or *** or ___
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<hr key={`hr-${i}`} className="my-2 border-t border-border/40" />);
      i++;
      continue;
    }

    // 6. Math Block ($$ ... $$)
    if (trimmed.startsWith("$$")) {
      const mathLines: string[] = [];
      const mathStartIdx = i;
      if (trimmed.endsWith("$$") && trimmed.length > 2) {
        mathLines.push(trimmed.slice(2, -2).trim());
        i++;
      } else {
        mathLines.push(trimmed.slice(2));
        i++;
        while (i < lines.length && !lines[i].trim().endsWith("$$")) {
          mathLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          mathLines.push(lines[i].trim().replace(/\$\$$/, ""));
          i++;
        }
      }
      elements.push(
        <div key={`math-${mathStartIdx}`} className="my-2 p-2.5 rounded-lg bg-secondary/60 text-center font-mono text-xs text-primary border border-border/50 overflow-x-auto">
          {mathLines.join("\n")}
        </div>
      );
      continue;
    }

    // 7. Headings
    if (trimmed.startsWith("# ")) {
      elements.push(
        <div key={`h1-${i}`} className="flex items-center gap-2 pt-2 pb-0.5 border-b border-border/40 text-sm font-bold text-txt-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <FormattedInline text={trimmed.slice(2)} />
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <div key={`h2-${i}`} className="flex items-center gap-1.5 pt-2 pb-0.5 text-xs font-bold text-primary uppercase tracking-wider">
          <Sparkles className="h-3 w-3 text-primary shrink-0" />
          <FormattedInline text={trimmed.slice(3)} />
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <div key={`h3-${i}`} className="text-xs font-semibold text-txt-primary pt-1.5 pb-0.5 flex items-center gap-1.5">
          <FormattedInline text={trimmed.slice(4)} />
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("#### ")) {
      elements.push(
        <div key={`h4-${i}`} className="text-xs font-semibold text-txt-primary pt-1.5 pb-0.5 flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-[1px] bg-primary/70 shrink-0" />
          <FormattedInline text={trimmed.slice(5)} />
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("##### ") || trimmed.startsWith("###### ")) {
      const content = trimmed.replace(/^#+\s+/, "");
      elements.push(
        <div key={`h5-${i}`} className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider pt-1.5 pb-0.5">
          <FormattedInline text={content} />
        </div>
      );
      i++;
      continue;
    }

    // 8. Task list items: - [ ] or - [x] or * [ ] or * [x]
    const taskMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[1].toLowerCase() === "x";
      elements.push(
        <div key={`task-${i}`} className="flex items-start gap-1.5 text-xs leading-relaxed text-txt-primary py-0.5 pl-0.5">
          <span className={cn(
            "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 mt-0.5 text-[10px]",
            isChecked ? "bg-primary border-primary text-primary-foreground" : "border-border bg-background"
          )}>
            {isChecked && "✓"}
          </span>
          <div className={cn("flex-1", isChecked && "line-through opacity-70")}>
            <FormattedInline text={taskMatch[2]} />
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 9. Bullet lists: - item, * item, + item (with nested indentation support)
    const bulletMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
    if (bulletMatch) {
      const indentSpaces = bulletMatch[1].length;
      const paddingLeft = indentSpaces >= 4 ? "pl-5" : indentSpaces >= 2 ? "pl-3" : "pl-0.5";
      elements.push(
        <div key={`bullet-${i}`} className={cn("flex items-start gap-2 text-xs leading-relaxed text-txt-primary py-0.5", paddingLeft)}>
          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
          <div className="flex-1">
            <FormattedInline text={bulletMatch[3]} />
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 10. Numbered lists: 1. item (with nested indentation support)
    const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const indentSpaces = numMatch[1].length;
      const paddingLeft = indentSpaces >= 4 ? "pl-5" : indentSpaces >= 2 ? "pl-3" : "pl-0.5";
      elements.push(
        <div key={`num-${i}`} className={cn("flex items-start gap-2 text-xs leading-relaxed text-txt-primary py-0.5", paddingLeft)}>
          <span className="text-[10px] font-bold text-primary bg-primary/10 h-4 min-w-4 px-1 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            {numMatch[2]}
          </span>
          <div className="flex-1">
            <FormattedInline text={numMatch[3]} />
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 11. Paragraph fallback
    elements.push(
      <p key={`p-${i}`} className="text-xs leading-relaxed text-txt-primary py-0.5">
        <FormattedInline text={trimmed} />
      </p>
    );
    i++;
  }

  return (
    <div className="space-y-0.5 select-text selection:bg-primary/20">
      {elements}
      {isStreaming && (
        <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary animate-pulse align-middle" />
      )}
    </div>
  );
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getChatStorageKey(workspacePath?: string | null, noteId?: string) {
  return `marki_ai_chat_${workspacePath || "default"}_${noteId || "general"}`;
}

export function AiSummaryPanel({
  isOpen,
  onClose,
  noteId,
  workspacePath,
  noteTitle = "Note",
  onInsertSummary,
  onOpenSettings,
}: AiSummaryPanelProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [inputPrompt, setInputPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "streaming" | "completed" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Active session and messages
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;
  const messages = activeSession?.messages || [];

  // Load saved chat history per note
  useEffect(() => {
    if (!noteId) {
      const defaultSession: ChatSession = {
        id: crypto.randomUUID(),
        title: "New Conversation",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      setSessions([defaultSession]);
      setActiveSessionId(defaultSession.id);
      setStatus("idle");
      return;
    }

    const key = getChatStorageKey(workspacePath, noteId);
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if old format (array of ChatMessage)
          if ("role" in parsed[0] && !("messages" in parsed[0])) {
            const firstUserMsg = (parsed as ChatMessage[]).find((m) => m.role === "user")?.content || "Conversation";
            const migratedSession: ChatSession = {
              id: crypto.randomUUID(),
              title: firstUserMsg.length > 32 ? firstUserMsg.slice(0, 32) + "..." : firstUserMsg,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              messages: parsed as ChatMessage[],
            };
            setSessions([migratedSession]);
            setActiveSessionId(migratedSession.id);
            setStatus("completed");
            return;
          } else if ("messages" in parsed[0]) {
            const sessionList = parsed as ChatSession[];
            setSessions(sessionList);
            setActiveSessionId(sessionList[0].id);
            setStatus(sessionList[0].messages.length > 0 ? "completed" : "idle");
            return;
          }
        }
      }
    } catch (e) {
      console.error("Failed to load chat history", e);
    }

    const defaultSession: ChatSession = {
      id: crypto.randomUUID(),
      title: "New Conversation",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setSessions([defaultSession]);
    setActiveSessionId(defaultSession.id);
    setStatus("idle");
  }, [noteId, workspacePath]);

  // Sync sessions to localStorage whenever sessions change
  useEffect(() => {
    if (!noteId || sessions.length === 0) return;
    const key = getChatStorageKey(workspacePath, noteId);
    const nonEmpty = sessions.filter((s) => s.messages.length > 0);
    const toSave = nonEmpty.length > 0 ? nonEmpty : sessions;
    try {
      localStorage.setItem(key, JSON.stringify(toSave));
    } catch (e) {
      console.error("Failed to save chat sessions", e);
    }
  }, [sessions, noteId, workspacePath]);

  // Auto-scroll when new chunks arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 20);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle New Chat CTA
  const handleNewChat = () => {
    if (activeSession && activeSession.messages.length === 0) {
      setIsHistoryOpen(false);
      inputRef.current?.focus();
      return;
    }
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: "New Conversation",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setStatus("idle");
    setErrorMessage("");
    setIsHistoryOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Handle Rename
  const handleSaveRename = (sessionId: string) => {
    const trimmed = editingTitle.trim();
    if (trimmed) {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: trimmed } : s))
      );
    }
    setEditingSessionId(null);
  };

  // Handle Delete Session
  const handleDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const remaining = sessions.filter((s) => s.id !== sessionId);
    if (remaining.length === 0) {
      const fresh: ChatSession = {
        id: crypto.randomUUID(),
        title: "New Conversation",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      setStatus("idle");
    } else {
      setSessions(remaining);
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id);
        setStatus(remaining[0].messages.length > 0 ? "completed" : "idle");
      }
    }
  };

  // Handle Clear All History
  const handleClearAllHistory = () => {
    if (noteId) {
      try {
        localStorage.removeItem(getChatStorageKey(workspacePath, noteId));
      } catch (e) {
        console.error("Failed to clear chat history", e);
      }
    }
    const fresh: ChatSession = {
      id: crypto.randomUUID(),
      title: "New Conversation",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
    setStatus("idle");
    setErrorMessage("");
    setIsHistoryOpen(false);
  };

  // Send a message
  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend ?? inputPrompt).trim();
    if (!text || status === "streaming") return;

    if (!noteId || !workspacePath) {
      setErrorMessage("Note ID or workspace path not found.");
      setStatus("error");
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const assistantMsgId = crypto.randomUUID();
    const assistantPlaceholder: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      viewMode: "prettified",
    };

    const currentMessages = activeSession?.messages || [];
    const newHistory = [...currentMessages, userMsg];
    const sessionTitle =
      (!currentMessages.length || activeSession?.title === "New Conversation")
        ? (text.length > 32 ? text.slice(0, 32) + "..." : text)
        : activeSession.title;

    const currentSessionId = activeSessionId;

    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === currentSessionId);
      const updatedMessages = [...newHistory, assistantPlaceholder];
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          title: sessionTitle,
          updatedAt: Date.now(),
          messages: updatedMessages,
        };
        return updated;
      }
      const newSess: ChatSession = {
        id: currentSessionId,
        title: sessionTitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: updatedMessages,
      };
      return [newSess, ...prev];
    });

    setInputPrompt("");
    setErrorMessage("");
    setStatus("streaming");

    try {
      const config = workspaceConfig.get();
      const isSystemMode = config.aiMode === "system";

      if (isSystemMode) {
        const quota = workspaceConfig.checkSystemAiQuota();
        if (!quota.allowed) {
          setStatus("error");
          setErrorMessage("System AI Quota reached. Please open Settings to upgrade to Markinotes Pro or switch to 'Custom API Key' (BYOK) mode.");
          return;
        }

        const chatPayload = newHistory.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        await noteIpc.chatStream(
          workspacePath,
          noteId,
          chatPayload,
          (chunk) => {
            setSessions((prev) =>
              prev.map((s) =>
                s.id === currentSessionId
                  ? {
                    ...s,
                    updatedAt: Date.now(),
                    messages: s.messages.map((msg) =>
                      msg.id === assistantMsgId
                        ? { ...msg, content: msg.content + chunk }
                        : msg
                    ),
                  }
                  : s
              )
            );
          },
          undefined,
          "gemini-3.6-flash",
          "system"
        );
        workspaceConfig.consumeSystemAiQuota(1);
        setStatus("completed");
      } else {
        const apiKey = (config.aiApiKey || config.geminiApiKey || "").trim() || undefined;
        const chatPayload = newHistory.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        await noteIpc.chatStream(
          workspacePath,
          noteId,
          chatPayload,
          (chunk) => {
            setSessions((prev) =>
              prev.map((s) =>
                s.id === currentSessionId
                  ? {
                    ...s,
                    updatedAt: Date.now(),
                    messages: s.messages.map((msg) =>
                      msg.id === assistantMsgId
                        ? { ...msg, content: msg.content + chunk }
                        : msg
                    ),
                  }
                  : s
              )
            );
          },
          apiKey,
          config.aiModel || config.geminiModel || "gemini-3.6-flash",
          config.aiProvider
        );
        setStatus("completed");
      }
    } catch (err: any) {
      setStatus("error");
      const raw = typeof err === "string" ? err : err?.message || "";
      if (
        raw.toLowerCase().includes("api key") ||
        raw.toLowerCase().includes("unauthorized") ||
        raw.toLowerCase().includes("forbidden") ||
        raw.toLowerCase().includes("not found")
      ) {
        setErrorMessage("Failed to connect to AI. API Key is missing or invalid. Please configure in .env or Settings.");
      } else if (raw.toLowerCase().includes("503") || raw.toLowerCase().includes("unavailable")) {
        setErrorMessage("Gemini API is currently experiencing high demand (HTTP 503 Service Unavailable). Please click Retry or try again in a few moments.");
      } else {
        setErrorMessage(raw || "An error occurred while generating AI response.");
      }
    }
  };

  const handleCopyMessage = async (msgId: string, content: string) => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
            ...s,
            messages: s.messages.map((m) =>
              m.id === msgId ? { ...m, copied: true } : m
            ),
          }
          : s
      )
    );
    setTimeout(() => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === msgId ? { ...m, copied: false } : m
              ),
            }
            : s
        )
      );
    }, 2000);
  };

  const handleToggleViewMode = (msgId: string, mode: "prettified" | "raw") => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
            ...s,
            messages: s.messages.map((m) =>
              m.id === msgId ? { ...m, viewMode: mode } : m
            ),
          }
          : s
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const PRESET_CHIPS = [
    {
      label: "Summarize Note",
      icon: <Sparkles className="h-3.5 w-3.5 text-primary" />,
      prompt: "Please provide a comprehensive and structured summary of this note with key takeaways and action items.",
    },
    {
      label: "Action Items",
      icon: <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />,
      prompt: "Extract all actionable tasks, next steps, and checklist items from this note.",
    },
    {
      label: "Explain Simply",
      icon: <Lightbulb className="h-3.5 w-3.5 text-amber-500" />,
      prompt: "Explain the core concepts and arguments in this note in simple, easy-to-understand terms.",
    },
    {
      label: "Review Questions",
      icon: <HelpCircle className="h-3.5 w-3.5 text-blue-500" />,
      prompt: "Generate 3 insightful review questions with concise answers based on this note.",
    },
  ];

  if (!shouldRender) return null;

  return (
    <aside
      className={cn(
        "h-full border-border/80 bg-surface/50 backdrop-blur-md flex flex-col shrink-0 select-none overflow-hidden z-20 transition-all duration-250 ease-in-out",
        isAnimating
          ? "w-96 sm:w-[420px] border-l opacity-100 translate-x-0"
          : "w-0 border-l-0 opacity-0 translate-x-8 pointer-events-none"
      )}
    >
      <div className="w-96 sm:w-[420px] h-full flex flex-col min-w-[384px] sm:min-w-[420px]">
        {/* Panel Header */}
        <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between gap-2 bg-background/80 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-txt-primary truncate">
                MarkAI
              </span>
              <span className="text-[10px] text-txt-muted truncate">
                {noteTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {status === "streaming" && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 text-primary border-primary/30 bg-primary/10 animate-pulse">
                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Thinking
              </Badge>
            )}

            {/* 1. Chat History Popover */}
            <Popover open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 text-txt-muted hover:text-txt-primary cursor-pointer relative",
                    isHistoryOpen && "bg-accent text-txt-primary"
                  )}
                  title="Chat History"
                >
                  <History className="h-3.5 w-3.5" />
                  {sessions.filter((s) => s.messages.length > 0).length > 1 && (
                    <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 shadow-lg border-border/80 bg-surface/95 backdrop-blur-md rounded-xl overflow-hidden z-50">
                {/* Popover Header */}
                <div className="p-3 border-b border-border/60 flex items-center justify-between gap-2 bg-background/60">
                  <div className="flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-txt-primary">Chat History</span>
                    <span className="text-[10px] text-txt-muted font-medium">
                      ({sessions.filter((s) => s.messages.length > 0).length})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNewChat}
                    className="h-6 px-2 text-[11px] gap-1 text-primary hover:bg-primary/10 cursor-pointer font-medium"
                  >
                    <Plus className="h-3 w-3" /> New Chat
                  </Button>
                </div>

                {/* Popover History List */}
                <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
                  {sessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    const isEditing = session.id === editingSessionId;
                    const messageCount = session.messages.length;

                    return (
                      <div
                        key={session.id}
                        onClick={() => {
                          if (!isEditing) {
                            setActiveSessionId(session.id);
                            setStatus(session.messages.length > 0 ? "completed" : "idle");
                            setIsHistoryOpen(false);
                          }
                        }}
                        className={cn(
                          "group relative flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer",
                          isActive
                            ? "bg-primary/15 text-primary font-medium border border-primary/30 shadow-2xs"
                            : "hover:bg-accent/60 text-txt-secondary hover:text-txt-primary border border-transparent"
                        )}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveRename(session.id);
                                if (e.key === "Escape") setEditingSessionId(null);
                              }}
                              autoFocus
                              className="flex-1 bg-background border border-primary/50 rounded px-1.5 py-0.5 text-xs text-txt-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              onClick={() => handleSaveRename(session.id)}
                              className="p-1 text-primary hover:bg-primary/20 rounded cursor-pointer"
                              title="Save title"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingSessionId(null)}
                              className="p-1 text-txt-muted hover:bg-secondary rounded cursor-pointer"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <MessageSquare className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", isActive ? "text-primary" : "text-txt-muted")} />
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="truncate text-xs leading-tight font-medium">
                                  {session.title || "New Conversation"}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] text-txt-muted mt-0.5">
                                  <span>{formatRelativeTime(session.updatedAt)}</span>
                                  {messageCount > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>{messageCount} {messageCount === 1 ? "msg" : "msgs"}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="h-6 w-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 text-txt-muted hover:text-txt-primary hover:bg-accent/80 transition-opacity cursor-pointer"
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32 text-xs z-50">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSessionId(session.id);
                                      setEditingTitle(session.title);
                                    }}
                                    className="cursor-pointer gap-2"
                                  >
                                    <Pencil className="h-3 w-3" /> Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => handleDeleteSession(session.id, e)}
                                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Popover Footer (Clear All History) */}
                {sessions.some((s) => s.messages.length > 0) && (
                  <div className="p-2 border-t border-border/50 bg-background/40 flex justify-between items-center">
                    <button
                      onClick={handleClearAllHistory}
                      className="text-[10px] text-destructive hover:underline flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-destructive/10 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" /> Clear all history
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* 2. Close Panel */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 text-txt-muted hover:text-txt-primary cursor-pointer"
              title="Close AI Panel"
            >
              <ArrowRightToLine className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Conversation Stream */}
        <div ref={scrollRef} className="flex-1 p-3.5 overflow-y-auto bg-background/50">
          {/* 1. Empty Hero State */}
          {messages.length === 0 && (
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-3 gap-3.5">
              <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-primary/15 to-primary/5 text-primary border border-primary/20 shadow-xs">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-[260px]">
                <h3 className="text-xs font-semibold text-txt-primary">
                  AI Note Assistant
                </h3>
                <p className="text-[11px] text-txt-muted leading-relaxed">
                  Generate structured summaries or converse freely about this note.
                </p>
              </div>

              {/* Primary Action Button */}
              <Button
                variant="default"
                size="sm"
                onClick={() => handleSendMessage(PRESET_CHIPS[0].prompt)}
                disabled={status === "streaming"}
                className="px-4 py-2.5 text-xs gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm mt-1 cursor-pointer font-medium"
              >
                <Sparkles className="h-3.5 w-3.5" /> Start Summarizing
              </Button>

              {/* Preset suggestion chips */}
              <div className="w-full grid grid-cols-1 gap-1.5 pt-2 max-w-[300px]">
                {PRESET_CHIPS.slice(1).map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip.prompt)}
                    disabled={status === "streaming"}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border/60 bg-surface/60 hover:bg-accent hover:border-primary/30 text-left text-[11px] text-txt-secondary hover:text-txt-primary transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="p-1 rounded bg-secondary/80 group-hover:bg-primary/10 transition-colors shrink-0">
                      {chip.icon}
                    </div>
                    <span className="truncate flex-1 font-medium">{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Messages List */}
          {messages.length > 0 && (
            <div className="space-y-4 pb-2">
              {messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const isLastAssistant = !isUser && idx === messages.length - 1;
                const viewMode = msg.viewMode || "prettified";

                if (isUser) {
                  return (
                    <div key={msg.id} className="flex justify-end gap-2 pl-8">
                      <div className="rounded-2xl rounded-tr-xs bg-primary/50 text-primary-foreground px-2.5 py-1 text-xs leading-relaxed shadow-xs max-w-[88%] select-text border border-primary/20">
                        {msg.content}
                      </div>

                    </div>
                  );
                }

                // Assistant Message Bubble
                return (
                  <div key={msg.id} className="flex flex-col gap-1.5 pr-1">
                    <div className="flex items-center justify-between gap-1 text-[10px] text-txt-muted px-1">
                      <div className="flex items-center gap-1.5 font-medium text-primary">
                        <Atom className="h-3.5 w-3.5" />
                      </div>

                      {/* View mode switcher */}
                      <SegmentedTabs
                        size="xs"
                        value={viewMode}
                        onValueChange={(val) => handleToggleViewMode(msg.id, val)}
                        options={[
                          { value: "prettified", label: "Prettified" },
                          { value: "raw", label: "Raw MD" },
                        ]}
                      />
                    </div>

                    {/* Content Box */}
                    <div className="p-3.5 rounded-xl border border-border/70 bg-surface/60 backdrop-blur-xs text-xs leading-relaxed select-text shadow-2xs">
                      {!msg.content && status === "streaming" && isLastAssistant ? (
                        <div className="flex items-center gap-2 text-txt-muted text-xs py-1">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          <span>Generating response...</span>
                        </div>
                      ) : viewMode === "prettified" ? (
                        <PrettifiedSummary
                          content={msg.content}
                          isStreaming={status === "streaming" && isLastAssistant}
                        />
                      ) : (
                        <div className="font-mono text-[11px] whitespace-pre-wrap text-txt-primary bg-secondary/30 p-2.5 rounded border border-border/40">
                          {msg.content}
                        </div>
                      )}
                    </div>

                    {/* Action Bar per Assistant Message */}
                    {msg.content && (
                      <div className="flex items-center gap-1 px-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="h-6 px-2 text-[10px] gap-1 text-txt-muted hover:text-txt-primary cursor-pointer"
                        >
                          {msg.copied ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </Button>

                        {onInsertSummary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onInsertSummary(msg.content)}
                            className="h-6 px-2 text-[10px] gap-1 text-primary hover:bg-primary/10 cursor-pointer"
                          >
                            <SquareArrowLeft className="h-3 w-3" />
                            <span>Insert into Note</span>
                          </Button>
                        )}

                        {isLastAssistant && status !== "streaming" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const lastUser = [...messages].reverse().find((m) => m.role === "user");
                              if (lastUser) handleSendMessage(lastUser.content);
                            }}
                            className="h-6 px-2 text-[10px] gap-1 text-txt-muted hover:text-txt-primary cursor-pointer ml-auto"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Retry</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Error Banner */}
          {status === "error" && (
            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5 my-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Generation Failed</p>
                <p className="text-[11px] mt-1 opacity-90 leading-normal">{errorMessage}</p>
                <div className="flex items-center gap-2 mt-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const lastUser = [...messages].reverse().find((m) => m.role === "user");
                      if (lastUser) {
                        handleSendMessage(lastUser.content);
                      } else {
                        handleSendMessage(PRESET_CHIPS[0].prompt);
                      }
                    }}
                    className="h-7 text-xs gap-1.5 border-destructive/30 hover:bg-destructive/10 text-destructive cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry
                  </Button>
                  {onOpenSettings && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onOpenSettings}
                      className="h-7 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
                    >
                      <Settings className="h-3 w-3" /> Open Settings
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Interactive Chat Input Bar */}
        <div className="p-3 border-t border-border/70 bg-background/90 flex flex-col gap-2 shrink-0">
          {/* Suggestion pills if chat is active */}
          {messages.length > 0 && status !== "streaming" && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px]">
              {PRESET_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(chip.prompt)}
                  className="px-2 py-0.5 rounded-full border border-border/60 bg-surface hover:border-primary/40 text-txt-muted hover:text-txt-primary shrink-0 transition-colors cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Textarea + Action Button */}
          <div className="relative flex items-center rounded-xl border border-border/80 bg-surface/80 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <textarea
              ref={inputRef}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about this note..."
              rows={1}
              disabled={status === "streaming"}
              className="w-full resize-none bg-transparent px-3 py-2.5 text-xs text-txt-primary placeholder:text-txt-muted focus:outline-none max-h-24 min-h-[38px]"
            />

            <div className="pr-1.5 shrink-0 flex items-center">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => handleSendMessage()}
                disabled={!inputPrompt.trim() || status === "streaming"}
                className={cn(
                  "h-7 w-7 rounded-lg transition-all",
                  inputPrompt.trim() && status !== "streaming"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
                    : "text-txt-muted opacity-50 cursor-not-allowed"
                )}
                title="Send message (Enter)"
              >
                {status === "streaming" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-txt-muted px-1">
            <span>Powered by Gemini AI</span>
            <span>Press <kbd className="font-mono bg-secondary/80 px-1 py-0.5 rounded border border-border/50 text-[9px]">Enter ↵</kbd> to send</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
