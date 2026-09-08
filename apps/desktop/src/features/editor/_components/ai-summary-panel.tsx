"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  FileDown,
  AlertCircle,
  RefreshCw,
  X,
  Bot,
  Settings,
  Send,
  User,
  Trash2,
  CheckSquare,
  Lightbulb,
  HelpCircle,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { noteIpc } from "@/features/home/_lib/note-ipc";
import { workspaceConfig } from "@/features/workspace/_lib/workspace-config";

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
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);
    const strikeMatch = remaining.match(/~~([^~]+)~~/);
    const markMatch = remaining.match(/==([^=]+)==/);

    const candidates = [
      boldMatch && boldMatch.index !== undefined ? { type: "bold", index: boldMatch.index, match: boldMatch } : null,
      codeMatch && codeMatch.index !== undefined ? { type: "code", index: codeMatch.index, match: codeMatch } : null,
      italicMatch && italicMatch.index !== undefined ? { type: "italic", index: italicMatch.index, match: italicMatch } : null,
      strikeMatch && strikeMatch.index !== undefined ? { type: "strike", index: strikeMatch.index, match: strikeMatch } : null,
      markMatch && markMatch.index !== undefined ? { type: "mark", index: markMatch.index, match: markMatch } : null,
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

    if (first.type === "bold") {
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
    }

    remaining = remaining.slice(first.index + fullMatchLength);
  }

  return <>{parts}</>;
}

export function PrettifiedSummary({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${idx}`}
            className="p-3 rounded-lg bg-secondary/80 border border-border text-[11px] font-mono overflow-x-auto text-txt-primary my-2"
          >
            <code>{codeBuffer.join("\n")}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    if (!trimmed) {
      // Small natural paragraph gap (collapse multiple consecutive empty lines)
      const prevLine = idx > 0 ? lines[idx - 1]?.trim() : "";
      if (prevLine && !prevLine.startsWith("#") && !/^(-{3,}|\*{3,}|_{3,})$/.test(prevLine)) {
        elements.push(<div key={`space-${idx}`} className="h-1.5" />);
      }
      return;
    }

    // Horizontal Rule: --- or *** or ___
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(
        <hr key={`hr-${idx}`} className="my-2 border-t border-border/40" />
      );
      return;
    }

    // Headings
    if (trimmed.startsWith("# ")) {
      elements.push(
        <div key={`h1-${idx}`} className="flex items-center gap-2 pt-2 pb-0.5 border-b border-border/40 text-sm font-bold text-txt-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <FormattedInline text={trimmed.slice(2)} />
        </div>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <div key={`h2-${idx}`} className="flex items-center gap-1.5 pt-2 pb-0.5 text-xs font-bold text-primary uppercase tracking-wider">
          <Sparkles className="h-3 w-3 text-primary shrink-0" />
          <FormattedInline text={trimmed.slice(3)} />
        </div>
      );
      return;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <div key={`h3-${idx}`} className="text-xs font-semibold text-txt-primary pt-1.5 pb-0.5 flex items-center gap-1.5">
          <FormattedInline text={trimmed.slice(4)} />
        </div>
      );
      return;
    }

    if (trimmed.startsWith("#### ")) {
      elements.push(
        <div key={`h4-${idx}`} className="text-xs font-semibold text-txt-primary pt-1.5 pb-0.5 flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-[1px] bg-primary/70 shrink-0" />
          <FormattedInline text={trimmed.slice(5)} />
        </div>
      );
      return;
    }

    if (trimmed.startsWith("##### ") || trimmed.startsWith("###### ")) {
      const content = trimmed.replace(/^#+\s+/, "");
      elements.push(
        <div key={`h5-${idx}`} className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider pt-1.5 pb-0.5">
          <FormattedInline text={content} />
        </div>
      );
      return;
    }

    // Blockquotes
    if (trimmed.startsWith("> ")) {
      elements.push(
        <div key={`quote-${idx}`} className="p-2 my-1 rounded-r-md bg-primary/5 border-l-2 border-primary text-xs text-txt-secondary italic">
          <FormattedInline text={trimmed.slice(2)} />
        </div>
      );
      return;
    }

    // Task list items: - [ ] or - [x] or * [ ] or * [x]
    const taskMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[1].toLowerCase() === "x";
      elements.push(
        <div key={`task-${idx}`} className="flex items-start gap-1.5 text-xs leading-relaxed text-txt-primary py-0.5 pl-0.5">
          <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 mt-0.5 text-[10px] ${isChecked
              ? "bg-primary border-primary text-primary-foreground"
              : "border-border bg-background"
            }`}>
            {isChecked && "✓"}
          </span>
          <div className={`flex-1 ${isChecked ? "line-through opacity-70" : ""}`}>
            <FormattedInline text={taskMatch[2]} />
          </div>
        </div>
      );
      return;
    }

    // Bullet lists: - item, * item, + item
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("+ ")) {
      elements.push(
        <div key={`bullet-${idx}`} className="flex items-start gap-2 text-xs leading-relaxed text-txt-primary py-0.5 pl-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
          <div className="flex-1">
            <FormattedInline text={trimmed.slice(2)} />
          </div>
        </div>
      );
      return;
    }

    // Numbered lists: 1. item
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={`num-${idx}`} className="flex items-start gap-2 text-xs leading-relaxed text-txt-primary py-0.5 pl-0.5">
          <span className="text-[10px] font-bold text-primary bg-primary/10 h-4 min-w-4 px-1 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            {numMatch[1]}
          </span>
          <div className="flex-1">
            <FormattedInline text={numMatch[2]} />
          </div>
        </div>
      );
      return;
    }

    // Paragraph fallback
    elements.push(
      <p key={`p-${idx}`} className="text-xs leading-relaxed text-txt-primary py-0.5">
        <FormattedInline text={trimmed} />
      </p>
    );
  });

  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <pre key="code-ongoing" className="p-2.5 rounded-lg bg-secondary/80 border border-border text-[11px] font-mono overflow-x-auto text-txt-primary my-1.5">
        <code>{codeBuffer.join("\n")}</code>
      </pre>
    );
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "streaming" | "completed" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load saved chat history per note
  useEffect(() => {
    if (!noteId) {
      setMessages([]);
      setStatus("idle");
      return;
    }
    const key = getChatStorageKey(workspacePath, noteId);
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setStatus("completed");
          return;
        }
      }
    } catch (e) {
      console.error("Failed to load chat history", e);
    }
    setMessages([]);
    setStatus("idle");
  }, [noteId, workspacePath]);

  // Sync messages to localStorage whenever messages change
  useEffect(() => {
    if (!noteId) return;
    const key = getChatStorageKey(workspacePath, noteId);
    if (messages.length > 0) {
      const validMessages = messages.filter(
        (m) => m.role === "user" || (m.role === "assistant" && m.content.trim().length > 0)
      );
      if (validMessages.length > 0) {
        try {
          localStorage.setItem(key, JSON.stringify(validMessages));
        } catch (e) {
          console.error("Failed to save chat history", e);
        }
      }
    }
  }, [messages, noteId, workspacePath]);

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

  // Send a message (either custom prompt or quick suggestion)
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

    const newHistory = [...messages, userMsg];
    setMessages([...newHistory, assistantPlaceholder]);
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
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: msg.content + chunk }
                  : msg
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
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: msg.content + chunk }
                  : msg
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
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, copied: true } : m))
    );
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, copied: false } : m))
      );
    }, 2000);
  };

  const handleToggleViewMode = (msgId: string, mode: "prettified" | "raw") => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, viewMode: mode } : m))
    );
  };

  const handleClearChat = () => {
    if (noteId) {
      try {
        localStorage.removeItem(getChatStorageKey(workspacePath, noteId));
      } catch (e) {
        console.error("Failed to clear chat history", e);
      }
    }
    setMessages([]);
    setErrorMessage("");
    setStatus("idle");
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
                AI Summary & Chat
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
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearChat}
                className="h-7 w-7 text-txt-muted hover:text-txt-primary cursor-pointer"
                title="Clear chat history"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 text-txt-muted hover:text-txt-primary cursor-pointer"
              title="Close AI Panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Conversation Stream */}
        <ScrollArea ref={scrollRef} className="flex-1 p-3.5 overflow-y-auto bg-background/50">
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
                      <div className="rounded-2xl rounded-tr-xs bg-primary text-primary-foreground px-3.5 py-2 text-xs leading-relaxed shadow-xs max-w-[88%] select-text">
                        {msg.content}
                      </div>
                      <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  );
                }

                // Assistant Message Bubble
                return (
                  <div key={msg.id} className="flex flex-col gap-1.5 pr-1">
                    <div className="flex items-center justify-between gap-1 text-[10px] text-txt-muted px-1">
                      <div className="flex items-center gap-1.5 font-medium text-primary">
                        <Bot className="h-3.5 w-3.5" />
                        <span>AI Assistant</span>
                      </div>

                      {/* View mode switcher */}
                      <div className="flex items-center bg-secondary/80 p-0.5 rounded border border-border/50 text-[10px]">
                        <button
                          onClick={() => handleToggleViewMode(msg.id, "prettified")}
                          className={cn(
                            "px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer",
                            viewMode === "prettified"
                              ? "bg-background text-primary shadow-2xs"
                              : "text-txt-muted hover:text-txt-primary"
                          )}
                        >
                          Prettified
                        </button>
                        <button
                          onClick={() => handleToggleViewMode(msg.id, "raw")}
                          className={cn(
                            "px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer",
                            viewMode === "raw"
                              ? "bg-background text-primary shadow-2xs"
                              : "text-txt-muted hover:text-txt-primary"
                          )}
                        >
                          Raw MD
                        </button>
                      </div>
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
                            <FileDown className="h-3 w-3" />
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
        </ScrollArea>

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
