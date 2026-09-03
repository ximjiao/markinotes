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
} from "lucide-react";
import { noteIpc } from "@/features/home/_lib/note-ipc";

interface AiSummaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  noteId?: string;
  workspacePath?: string | null;
  noteTitle?: string;
  onInsertSummary?: (summaryText: string) => void;
}

function FormattedInline({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/s);
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/s);
    const italicMatch = remaining.match(/^(.*?)\*([^*]+)\*(.*)$/s);

    const matches = [
      boldMatch ? { type: "bold", index: boldMatch[1].length, match: boldMatch } : null,
      codeMatch ? { type: "code", index: codeMatch[1].length, match: codeMatch } : null,
      italicMatch ? { type: "italic", index: italicMatch[1].length, match: italicMatch } : null,
    ]
      .filter(Boolean)
      .sort((a: any, b: any) => a.index - b.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    if (first.type === "bold") {
      const [, before, content, after] = first.match;
      if (before) parts.push(before);
      parts.push(
        <strong key={key++} className="font-semibold text-txt-primary">
          {content}
        </strong>
      );
      remaining = after;
    } else if (first.type === "code") {
      const [, before, content, after] = first.match;
      if (before) parts.push(before);
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 font-mono text-[11px] border border-purple-500/20"
        >
          {content}
        </code>
      );
      remaining = after;
    } else if (first.type === "italic") {
      const [, before, content, after] = first.match;
      if (before) parts.push(before);
      parts.push(
        <em key={key++} className="italic text-txt-secondary">
          {content}
        </em>
      );
      remaining = after;
    }
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
          <Sparkles className="h-3.5 w-3.5 text-purple-500" />
          <FormattedInline text={trimmed.slice(3)} />
        </div>
      );
      return;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <div key={`h3-${idx}`} className="text-xs font-semibold text-txt-primary pt-2 pb-0.5">
          <FormattedInline text={trimmed.slice(4)} />
        </div>
      );
      return;
    }

    if (trimmed.startsWith("> ")) {
      elements.push(
        <div key={`quote-${idx}`} className="p-2.5 my-1.5 rounded-r-lg bg-purple-500/5 border-l-2 border-purple-500 text-xs text-txt-secondary italic">
          <FormattedInline text={trimmed.slice(2)} />
        </div>
      );
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
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
  noteTitle = "Catatan",
  onInsertSummary,
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

  // Reset state and trigger auto-summarize when opened if empty
  useEffect(() => {
    if (isOpen && !summary && status === "idle") {
      handleStartSummarize();
    }
  }, [isOpen, noteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartSummarize = async () => {
    if (!noteId || !workspacePath) {
      setErrorMessage("ID catatan atau path workspace tidak ditemukan.");
      setStatus("error");
      return;
    }

    setSummary("");
    setErrorMessage("");
    setStatus("streaming");

    try {
      await noteIpc.summarizeStream(
        workspacePath,
        noteId,
        (chunk) => {
          setSummary((prev) => prev + chunk);
        }
      );
      setStatus("completed");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(typeof err === "string" ? err : err?.message || "Terjadi kesalahan saat memproses ringkasan.");
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

  if (!isOpen) return null;

  return (
    <aside className="w-96 sm:w-[420px] h-full border-l border-border/80 bg-surface/50 backdrop-blur-md flex flex-col shrink-0 animate-in slide-in-from-right duration-200 select-none overflow-hidden z-20">
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
              <Check className="h-2.5 w-2.5" /> Selesai
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-txt-muted hover:text-txt-primary"
            title="Tutup Panel Summary"
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
              {summary.split(/\s+/).filter(Boolean).length} kata
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
                Tekan tombol <strong>&ldquo;Mulai Ringkas&rdquo;</strong> untuk mengekstrak poin penting catatan ini dengan Gemini AI.
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={handleStartSummarize}
                className="h-8 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-xs mt-1"
              >
                <Sparkles className="h-3.5 w-3.5" /> Mulai Ringkas
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5 my-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Gagal memproses ringkasan:</p>
                <p className="text-[11px] mt-1 opacity-90 leading-normal">{errorMessage}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartSummarize}
                  className="h-7 text-xs gap-1.5 mt-2.5 border-destructive/30 hover:bg-destructive/10 text-destructive"
                >
                  <RefreshCw className="h-3 w-3" /> Coba Lagi
                </Button>
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
          {summary && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={status === "streaming"}
              className="flex-1 h-8 text-xs gap-1.5"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {isCopied ? "Tersalin!" : "Salin Teks"}
            </Button>
          )}

          {summary && onInsertSummary && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInsert}
              disabled={status === "streaming"}
              className="flex-1 h-8 text-xs gap-1.5 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
            >
              <FileDown className="h-3.5 w-3.5" />
              Sisipkan
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
              Merangkum...
            </>
          ) : summary ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Ringkas Ulang
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Mulai Ringkas
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
