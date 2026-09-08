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
          className="px-1.5 py-0.5 mx-0.5 rounded bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 font-mono text-[11px] border border-purple-500/20 font-medium"
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
      elements.push(<div key={`space-${idx}`} className="h-2" />);
      return;
    }

    // Horizontal Rule: --- or *** or ___
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(
        <hr key={`hr-${idx}`} className="my-3 border-t border-border/70" />
      );
      return;
    }

    // Headings
    if (trimmed.startsWith("# ")) {
      elements.push(
        <div key={`h1-${idx}`} className="flex items-center gap-2 pt-3 pb-1 border-b border-border/60 text-sm font-bold text-txt-primary">
          <span className="h-2 w-2 rounded-full bg-purple-500" />
          <FormattedInline text={trimmed.slice(2)} />
        </div>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <div key={`h2-${idx}`} className="flex items-center gap-1.5 pt-3 pb-1 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0" />
          <FormattedInline text={trimmed.slice(3)} />
        </div>
      );
      return;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <div key={`h3-${idx}`} className="text-xs font-semibold text-txt-primary pt-2.5 pb-0.5 flex items-center gap-1.5">
          <FormattedInline text={trimmed.slice(4)} />
        </div>
      );
      return;
    }

    if (trimmed.startsWith("#### ")) {
      elements.push(
        <div key={`h4-${idx}`} className="text-xs font-semibold text-txt-primary pt-2 pb-0.5 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-[2px] bg-purple-500/70 shrink-0" />
          <FormattedInline text={trimmed.slice(5)} />
        </div>
      );
      return;
    }

    if (trimmed.startsWith("##### ") || trimmed.startsWith("###### ")) {
      const content = trimmed.replace(/^#+\s+/, "");
      elements.push(
        <div key={`h5-${idx}`} className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider pt-2 pb-0.5">
          <FormattedInline text={content} />
        </div>
      );
      return;
    }

    // Blockquotes
    if (trimmed.startsWith("> ")) {
      elements.push(
        <div key={`quote-${idx}`} className="p-2.5 my-1.5 rounded-r-lg bg-purple-500/5 border-l-2 border-purple-500 text-xs text-txt-secondary italic">
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
        <div key={`task-${idx}`} className="flex items-start gap-2 text-xs leading-relaxed text-txt-primary py-0.5 pl-1">
          <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 mt-0.5 text-[10px] ${
            isChecked
              ? "bg-purple-600 border-purple-600 text-white"
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
        <div key={`bullet-${idx}`} className="flex items-start gap-2 text-xs leading-relaxed text-txt-primary py-0.5 pl-1">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0 mt-1.5" />
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
        <div key={`num-${idx}`} className="flex items-start gap-2 text-xs leading-relaxed text-txt-primary py-0.5 pl-1">
          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 h-4 min-w-4 px-1 rounded-full flex items-center justify-center shrink-0 mt-0.5">
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
      <pre key="code-ongoing" className="p-3 rounded-lg bg-secondary/80 border border-border text-[11px] font-mono overflow-x-auto text-txt-primary my-2">
        <code>{codeBuffer.join("\n")}</code>
      </pre>
    );
  }

  return (
    <div className="space-y-0.5 select-text selection:bg-purple-500/20">
      {elements}
      {isStreaming && (
        <span className="inline-block w-1.5 h-3.5 ml-1 bg-purple-500 animate-pulse align-middle" />
      )}
    </div>
  );
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
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<"idle" | "streaming" | "completed" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"prettified" | "raw">("prettified");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new chunks arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [summary]);

  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);

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

  // Reset state and trigger auto-summarize when opened if empty
  useEffect(() => {
    if (isOpen && !summary && status === "idle") {
      handleStartSummarize();
    }
  }, [isOpen, noteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartSummarize = async () => {
    if (!noteId || !workspacePath) {
      setErrorMessage("Note ID or workspace path not found.");
      setStatus("error");
      return;
    }

    setSummary("");
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

        await noteIpc.summarizeStream(
          workspacePath,
          noteId,
          (chunk) => {
            setSummary((prev) => prev + chunk);
          },
          undefined,
          "gemini-3.6-flash",
          "system"
        );
        workspaceConfig.consumeSystemAiQuota(1);
        setStatus("completed");
      } else {
        const apiKey = (config.aiApiKey || config.geminiApiKey || "").trim() || undefined;

        await noteIpc.summarizeStream(
          workspacePath,
          noteId,
          (chunk) => {
            setSummary((prev) => prev + chunk);
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
      if (raw.toLowerCase().includes("api key") || raw.toLowerCase().includes("unauthorized") || raw.toLowerCase().includes("forbidden") || raw.toLowerCase().includes("not found")) {
        setErrorMessage("Failed to connect to AI. API Key is missing or invalid. Please configure in .env or Settings.");
      } else {
        setErrorMessage(raw || "An error occurred while generating summary.");
      }
    }
  };

  const handleCopy = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleInsert = () => {
    if (!summary) return;
    onInsertSummary?.(summary);
  };

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
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-txt-primary truncate">
              AI Summary & Insights
            </span>
            <span className="text-[10px] text-txt-muted truncate">
              {noteTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {status === "streaming" && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 text-purple-600 border-purple-500/30 bg-purple-500/10 animate-pulse">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Streaming
            </Badge>
          )}
          {status === "completed" && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
              <Check className="h-2.5 w-2.5" /> Done
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-txt-muted hover:text-txt-primary"
            title="Close Summary Panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-background/60 overflow-hidden">
        {/* Sub-header info / View switcher / Word stats */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 text-[11px] text-txt-muted bg-surface/30">
          <div className="flex items-center gap-1.5">
            <Bot className="h-3 w-3 text-purple-500" />
            <div className="flex items-center bg-secondary/70 p-0.5 rounded-md border border-border/50 text-[10px]">
              <button
                onClick={() => setViewMode("prettified")}
                className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                  viewMode === "prettified"
                    ? "bg-background text-purple-600 dark:text-purple-400 shadow-xs"
                    : "text-txt-muted hover:text-txt-primary"
                }`}
              >
                Prettified
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                  viewMode === "raw"
                    ? "bg-background text-purple-600 dark:text-purple-400 shadow-xs"
                    : "text-txt-muted hover:text-txt-primary"
                }`}
              >
                Raw MD
              </button>
            </div>
          </div>

          {summary && (
            <span className="text-[10px]">
              {summary.split(/\s+/).filter(Boolean).length} words
            </span>
          )}
        </div>

        <ScrollArea ref={scrollRef} className="flex-1 p-4 overflow-y-auto">
          {status === "idle" && !summary && (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-txt-muted text-xs text-center gap-3 p-4">
              <div className="p-3 rounded-full bg-purple-500/10 text-purple-500">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="max-w-[240px]">
                Click <strong>&ldquo;Start Summarizing&rdquo;</strong> to extract key takeaways from this note using AI.
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={handleStartSummarize}
                className="h-8 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-xs mt-1"
              >
                <Sparkles className="h-3.5 w-3.5" /> Start Summarizing
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5 my-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Failed to generate summary:</p>
                <p className="text-[11px] mt-1 opacity-90 leading-normal">{errorMessage}</p>
                <div className="flex items-center gap-2 mt-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartSummarize}
                    className="h-7 text-xs gap-1.5 border-destructive/30 hover:bg-destructive/10 text-destructive cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry
                  </Button>
                  {onOpenSettings && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onOpenSettings}
                      className="h-7 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer"
                    >
                      <Settings className="h-3 w-3" /> Open Settings
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {summary && viewMode === "prettified" && (
            <PrettifiedSummary content={summary} isStreaming={status === "streaming"} />
          )}

          {summary && viewMode === "raw" && (
            <div className="text-xs leading-relaxed font-mono text-txt-primary whitespace-pre-wrap select-text selection:bg-purple-500/20 bg-secondary/30 p-3 rounded-md border border-border/50">
              {summary}
              {status === "streaming" && (
                <span className="inline-block w-1.5 h-3.5 ml-1 bg-purple-500 animate-pulse align-middle" />
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-border/70 bg-background flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-2">
          {summary && (isCopied ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="flex-1 h-8 text-xs gap-1.5 text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
            >
              <Check className="h-3.5 w-3.5" />
              Copied!
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!summary}
              className="flex-1 h-8 text-xs gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>
          ))}

          {summary && onInsertSummary && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInsert}
              disabled={status === "streaming"}
              className="flex-1 h-8 text-xs gap-1.5 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
            >
              <FileDown className="h-3.5 w-3.5" />
              Insert into Note
            </Button>
          )}
        </div>

        <Button
          variant={summary ? "outline" : "default"}
          size="sm"
          onClick={handleStartSummarize}
          disabled={status === "streaming"}
          className={`w-full h-8 text-xs gap-1.5 ${
            summary
              ? "border-border hover:bg-accent"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          }`}
        >
          {status === "streaming" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Summarizing...
            </>
          ) : summary ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Start Summarizing
            </>
          )}
        </Button>
      </div>
      </div>
    </aside>
  );
}
