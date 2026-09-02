"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import { noteIpc } from "@/features/home/_lib/note-ipc";

interface AiSummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  noteId?: string;
  workspacePath?: string | null;
  noteTitle?: string;
  onInsertSummary?: (summaryText: string) => void;
}

export function AiSummaryDialog({
  isOpen,
  onClose,
  noteId,
  workspacePath,
  noteTitle = "Catatan",
  onInsertSummary,
}: AiSummaryDialogProps) {
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<"idle" | "streaming" | "completed" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new chunks arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [summary]);

  // Reset state and trigger auto-summarize when opened
  useEffect(() => {
    if (isOpen) {
      setSummary("");
      setErrorMessage("");
      setStatus("idle");
    }
  }, [isOpen]);

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
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-6 gap-4">
        <DialogHeader className="gap-1">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <span className="p-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Sparkles className="h-4 w-4" />
              </span>
              Summarize with Gemini AI
            </DialogTitle>
            {status === "streaming" && (
              <Badge variant="outline" className="gap-1 text-purple-600 border-purple-500/30 bg-purple-500/10 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" /> Streaming...
              </Badge>
            )}
            {status === "completed" && (
              <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                <Check className="h-3 w-3" /> Selesai
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-txt-muted">
            Merangkum <strong>&ldquo;{noteTitle}&rdquo;</strong> dengan pointer kata kunci terbanyak & konteks utuh.
          </DialogDescription>
        </DialogHeader>

        {/* Content Preview / Stream Output */}
        <div className="flex-1 min-h-[240px] max-h-[400px] flex flex-col rounded-lg border border-border bg-background overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/40 text-[11px] text-txt-muted">
            <span>Hasil Ringkasan (Markdown)</span>
            {summary && (
              <span>{summary.split(/\s+/).filter(Boolean).length} kata</span>
            )}
          </div>

          <ScrollArea ref={scrollRef} className="flex-1 p-4 overflow-y-auto">
            {status === "idle" && !summary && (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-txt-muted text-xs text-center gap-2">
                <Sparkles className="h-8 w-8 text-purple-400/40" />
                <p>Klik tombol <strong>&ldquo;Mulai Ringkas&rdquo;</strong> untuk merangkum catatan dengan Gemini AI.</p>
              </div>
            )}

            {status === "error" && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Gagal memproses ringkasan:</p>
                  <p className="text-[11px] mt-0.5 opacity-90">{errorMessage}</p>
                </div>
              </div>
            )}

            {summary && (
              <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-txt-primary">
                {summary}
                {status === "streaming" && (
                  <span className="inline-block w-1.5 h-3.5 ml-1 bg-purple-500 animate-pulse align-middle" />
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-1 border-t border-border">
          <div className="flex items-center gap-2">
            {summary && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={status === "streaming"}
                className="h-8 text-xs gap-1.5"
              >
                {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {isCopied ? "Tersalin!" : "Salin"}
              </Button>
            )}
            {summary && onInsertSummary && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleInsert}
                disabled={status === "streaming"}
                className="h-8 text-xs gap-1.5 text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
              >
                <FileDown className="h-3.5 w-3.5" />
                Sisipkan ke Catatan
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs"
            >
              Tutup
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleStartSummarize}
              disabled={status === "streaming"}
              className="h-8 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
