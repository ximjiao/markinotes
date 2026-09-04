"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { templateCategories, type NoteTemplate } from "../_lib/templates-data";
import * as LucideIcons from "lucide-react";
import { Sparkles, ArrowLeft, Loader2, Wand2, Check, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { noteIpc } from "../_lib/note-ipc";
import { workspaceConfig } from "../../workspace/_lib/workspace-config";

interface TemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: NoteTemplate) => void;
  workspacePath?: string | null;
}

// Visual "paper" preview per template id
function TemplatePreview({ templateId }: { templateId: string }) {
  const base = "bg-gray-200 dark:bg-neutral-600 rounded-sm";
  const line = (w: string, h = "h-[3px]") => (
    <div className={cn(base, h, w)} />
  );
  const gap = (size = "mb-1.5") => <div className={size} />;
  const bullet = (w: string) => (
    <div className="flex items-center gap-1">
      <div className={cn("w-1 h-1 rounded-full bg-gray-300 dark:bg-neutral-500 shrink-0")} />
      {line(w)}
    </div>
  );
  const heading = (w: string, accent = false) => (
    <div className={cn("h-[4px] rounded-sm", w, accent ? "bg-primary/60" : "bg-gray-400 dark:bg-neutral-500")} />
  );
  const checkbox = (w: string) => (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-[2px] border border-gray-300 dark:border-neutral-500 shrink-0" />
      {line(w)}
    </div>
  );

  const previews: Record<string, React.ReactNode> = {
    "meeting-notes": (
      <div className="space-y-1.5 p-2">
        {heading("w-20", true)}
        {gap("mb-1")}
        {line("w-16")}
        {line("w-24")}
        {gap()}
        {heading("w-12")}
        {gap("mb-0.5")}
        {bullet("w-14")}
        {bullet("w-10")}
        {gap()}
        {heading("w-14")}
        {gap("mb-0.5")}
        {bullet("w-16")}
        {gap()}
        {heading("w-16")}
        {gap("mb-0.5")}
        {checkbox("w-12")}
        {checkbox("w-16")}
      </div>
    ),
    "daily-standup": (
      <div className="space-y-1.5 p-2">
        {heading("w-20", true)}
        {gap("mb-1")}
        {line("w-14")}
        {gap()}
        {heading("w-16")}
        {gap("mb-0.5")}
        {bullet("w-10")}
        {bullet("w-14")}
        {gap()}
        {heading("w-14")}
        {gap("mb-0.5")}
        {bullet("w-12")}
        {bullet("w-8")}
        {gap()}
        {heading("w-10")}
        {gap("mb-0.5")}
        {bullet("w-16")}
      </div>
    ),
    "prd": (
      <div className="space-y-1.5 p-2">
        {heading("w-24", true)}
        {gap()}
        {heading("w-20")}
        {gap("mb-0.5")}
        {line("w-full")}
        {line("w-4/5")}
        {gap()}
        {heading("w-16")}
        {gap("mb-0.5")}
        {bullet("w-12")}
        {bullet("w-16")}
        {gap()}
        {heading("w-10")}
        {gap("mb-0.5")}
        {bullet("w-14")}
        {bullet("w-10")}
        {gap()}
        {heading("w-14")}
        {gap("mb-0.5")}
        {bullet("w-8")}
      </div>
    ),
    "bug-report": (
      <div className="space-y-1.5 p-2">
        {heading("w-24", true)}
        {gap()}
        {heading("w-16")}
        {gap("mb-0.5")}
        {line("w-full")}
        {line("w-3/4")}
        {gap()}
        {heading("w-16")}
        {gap("mb-0.5")}
        {line("w-12")}
        {line("w-16")}
        {gap()}
        {heading("w-20")}
        {gap("mb-0.5")}
        <div className="flex items-start gap-1">{line("w-3 h-[3px] mt-0.5")}{line("w-14")}</div>
        <div className="flex items-start gap-1">{line("w-3 h-[3px] mt-0.5")}{line("w-10")}</div>
        <div className="flex items-start gap-1">{line("w-3 h-[3px] mt-0.5")}{line("w-12")}</div>
      </div>
    ),
    "daily-journal": (
      <div className="space-y-1.5 p-2">
        {heading("w-28", true)}
        {gap()}
        {heading("w-16")}
        {gap("mb-0.5")}
        {checkbox("w-10")}
        {checkbox("w-8")}
        {checkbox("w-12")}
        {checkbox("w-8")}
        {gap()}
        {heading("w-20")}
        {gap("mb-0.5")}
        {bullet("w-14")}
        {bullet("w-10")}
        {gap()}
        {heading("w-16")}
        {gap("mb-0.5")}
        {line("w-full")}
        {line("w-4/5")}
      </div>
    ),
    "blog-post": (
      <div className="space-y-1.5 p-2">
        {heading("w-28", true)}
        {gap()}
        {line("w-16")}
        {line("w-20")}
        <div className="my-1 border-t border-gray-200 dark:border-neutral-600" />
        {heading("w-10")}
        {gap("mb-0.5")}
        <div className="flex items-start gap-1"><div className="w-2 h-2 rounded-sm bg-gray-200 dark:bg-neutral-600 shrink-0 mt-0.5 text-[4px] flex items-center justify-center text-gray-400">1</div>{line("w-14")}</div>
        <div className="flex items-start gap-1"><div className="w-2 h-2 rounded-sm bg-gray-200 dark:bg-neutral-600 shrink-0 mt-0.5 text-[4px] flex items-center justify-center text-gray-400">2</div>{line("w-10")}</div>
        <div className="flex items-start gap-1"><div className="w-2 h-2 rounded-sm bg-gray-200 dark:bg-neutral-600 shrink-0 mt-0.5 text-[4px] flex items-center justify-center text-gray-400">3</div>{line("w-12")}</div>
        {gap()}
        {heading("w-14")}
        {gap("mb-0.5")}
        {line("w-full")}
        {line("w-4/5")}
      </div>
    ),
  };

  return (
    <div className="w-full h-full bg-white dark:bg-neutral-900 rounded overflow-hidden text-[6px] leading-none">
      {previews[templateId] ?? (
        <div className="p-2 space-y-1.5">
          <div className="h-[4px] w-20 bg-gray-400 dark:bg-neutral-500 rounded-sm" />
          <div className="h-[3px] w-full bg-gray-200 dark:bg-neutral-600 rounded-sm" />
          <div className="h-[3px] w-4/5 bg-gray-200 dark:bg-neutral-600 rounded-sm" />
        </div>
      )}
    </div>
  );
}

const AI_PROMPT_SUGGESTIONS = [
  { label: "📋 1-on-1 Meeting Notes", prompt: "Template 1-on-1 meeting mingguan antara Engineering Lead dan Software Engineer, ada bagian recap minggu lalu, blockers, karir/feedback, dan action items." },
  { label: "🚀 Product Launch Plan", prompt: "Template checklist dan roadmap peluncuran fitur produk baru, mencakup goals, timeline release, marketing sync, QA checklist, dan metrics evaluasi." },
  { label: "💡 Brainstorming Framework", prompt: "Template sesi brainstorming ide produk (Crazy 8s / How Might We), mencakup latar belakang masalah, ide gila, voting prioritas, dan next steps." },
  { label: "📐 Architecture Decision (ADR)", prompt: "Template Architecture Decision Record (ADR) untuk software engineering: Context, Decision, Consequences, Status, dan Alternatives Considered." },
];

export function TemplateDialog({ isOpen, onClose, onSelectTemplate, workspacePath }: TemplateDialogProps) {
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMarkdown, setGeneratedMarkdown] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Flatten all template categories into a unified list
  const allTemplates = templateCategories.flatMap((c) => c.templates);

  const handleResetAi = () => {
    setIsAiMode(false);
    setAiPrompt("");
    setGeneratedMarkdown("");
    setGeneratedTitle("");
    setErrorMessage("");
    setIsGenerating(false);
  };

  const handleGenerateTemplate = async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    setErrorMessage("");
    setGeneratedMarkdown("");

    try {
      const config = workspaceConfig.get();
      const wsPath = workspacePath || config.rootPath || "";

      const instruction = `Buatlah sebuah template dokumen Markdown yang terstruktur, lengkap, dan profesional untuk kebutuhan berikut: "${aiPrompt.trim()}".\n` +
        `Aturan output:\n` +
        `1. Baris pertama WAJIB berupa judul Heading 1 (misal: # Judul Template).\n` +
        `2. Berikan seksi-seksi Heading 2 (##) yang relevan, list poin, to-do ([ ]), atau tabel jika cocok.\n` +
        `3. Berikan teks placeholder atau panduan singkat di setiap seksi.\n` +
        `4. Output HANYA Markdown murni tanpa basa-basi atau kata pembuka/penutup.`;

      let fullOutput = "";
      await noteIpc.editWithAiStream(
        wsPath,
        "",
        instruction,
        (chunk) => {
          fullOutput += chunk;
          setGeneratedMarkdown(fullOutput);
        },
        config.geminiApiKey,
        config.geminiModel
      );

      // Extract title from first line
      const firstLine = fullOutput.split("\n")[0]?.replace(/^#+\s*/, "").trim();
      setGeneratedTitle(firstLine || "AI Custom Template");
    } catch (err: any) {
      setErrorMessage(typeof err === "string" ? err : err?.message || "Gagal membuat template dengan AI.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyAiTemplate = () => {
    if (!generatedMarkdown.trim()) return;

    const title = generatedTitle || "Custom Template";
    onSelectTemplate({
      id: "custom-ai-" + Date.now(),
      title,
      description: aiPrompt.slice(0, 60) || "Template dibuat secara kustom dengan AI.",
      icon: "Sparkles",
      content: generatedMarkdown,
    });
    handleResetAi();
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleResetAi();
        onClose();
      }}
    >
      <DialogContent className="max-w-3xl p-0 overflow-hidden flex flex-col max-h-[90vh] bg-background gap-0 shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
          <div>
            <DialogTitle className="text-lg font-bold text-txt-primary flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              {isAiMode ? "AI Template Generator" : "Template Gallery"}
            </DialogTitle>
            <p className="text-xs text-txt-muted font-normal mt-0.5">
              {isAiMode
                ? "Deskripsikan kebutuhan dokumenmu, AI akan membuatkan format template siap pakai."
                : "Pilih template atau rancang template kustom instan dengan AI."}
            </p>
          </div>

          {isAiMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAiMode(false)}
              className="text-xs text-txt-muted hover:text-txt-primary gap-1.5 h-8"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke Galeri
            </Button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 px-6 py-5 overflow-y-auto">
          {!isAiMode ? (
            /* 1. Flat Clean Grid (Ungrouped) */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {/* ✨ Magic Tile #1: Custom AI Template Generator Card */}
              <button
                type="button"
                onClick={() => setIsAiMode(true)}
                className="group text-left flex flex-col gap-2 focus:outline-none cursor-pointer"
              >
                {/* Magic Card Thumbnail */}
                <div className="w-full rounded-lg border-2 border-dashed border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-emerald-500/10 hover:from-purple-500/20 hover:to-emerald-500/20 hover:border-purple-500 hover:shadow-lg transition-all duration-200 aspect-[3/4] flex flex-col items-center justify-center p-3 relative overflow-hidden">
                  <div className="h-10 w-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-500 shadow-xs mb-2 group-hover:scale-110 transition-transform">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  </div>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-300 text-center">
                    Generate with AI
                  </span>
                  <span className="text-[10px] text-txt-muted text-center mt-1 leading-tight line-clamp-2 px-1">
                    Bikin template kustom dari prompt ide kamu
                  </span>
                  <Badge variant="outline" className="mt-2 text-[9px] px-1.5 py-0 text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10">
                    AI Magic
                  </Badge>
                </div>

                {/* Label */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <Wand2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 group-hover:underline transition-colors line-clamp-1">
                      Custom AI Template
                    </span>
                  </div>
                  <p className="text-xs text-txt-muted mt-0.5 line-clamp-1">Rancang dari instruksi bebas</p>
                </div>
              </button>

              {/* Standard Templates */}
              {allTemplates.map((template) => {
                const IconComponent = (LucideIcons as any)[template.icon] || LucideIcons.FileText;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      onSelectTemplate(template);
                      onClose();
                    }}
                    className="group text-left flex flex-col gap-2 focus:outline-none cursor-pointer"
                  >
                    {/* Paper thumbnail */}
                    <div className="w-full rounded-lg border border-border overflow-hidden shadow-xs group-hover:shadow-md group-hover:border-txt-brand/60 transition-all duration-200 aspect-[3/4] bg-gray-50 dark:bg-neutral-800">
                      <TemplatePreview templateId={template.id} />
                    </div>

                    {/* Label below */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <IconComponent className="h-3.5 w-3.5 text-txt-brand shrink-0" />
                        <span className="text-sm font-medium text-txt-primary group-hover:text-txt-brand transition-colors line-clamp-1">
                          {template.title}
                        </span>
                      </div>
                      <p className="text-xs text-txt-muted mt-0.5 line-clamp-1">{template.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* 2. Interactive AI Mode Prompt & Preview */
            <div className="space-y-4 max-w-2xl mx-auto">
              <div>
                <label className="text-xs font-semibold text-txt-primary mb-1.5 block">
                  Kebutuhan Template Dokumen:
                </label>
                <textarea
                  autoFocus
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Contoh: Template 1-on-1 sprint review mingguan untuk engineer dan lead, ada seksi recap, blockers, action items..."
                  className="w-full text-xs p-3 rounded-lg bg-accent/30 border border-border outline-none focus:border-purple-500 text-txt-primary transition-all resize-none shadow-xs"
                />
              </div>

              {/* Quick Prompt Suggestion Chips */}
              <div>
                <span className="text-[11px] font-medium text-txt-muted mb-1.5 block">
                  Ide Cepat:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {AI_PROMPT_SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setAiPrompt(s.prompt)}
                      className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-accent/20 hover:bg-accent hover:text-txt-primary text-txt-secondary transition-colors cursor-pointer text-left"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Generate */}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  onClick={handleGenerateTemplate}
                  disabled={!aiPrompt.trim() || isGenerating}
                  className="h-8 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Sedang Merancang Template...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      {generatedMarkdown ? "Generate Ulang" : "Buat Template dengan AI"}
                    </>
                  )}
                </Button>
              </div>

              {/* Live Preview Box */}
              {generatedMarkdown && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-txt-primary flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      Hasil Template AI ({generatedTitle})
                    </span>
                    <Button
                      size="sm"
                      onClick={handleApplyAiTemplate}
                      className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                    >
                      <Sparkles className="h-3 w-3" />
                      Gunakan Template Ini
                    </Button>
                  </div>
                  <div className="p-3 bg-accent/40 rounded-lg border border-border text-xs font-mono text-txt-primary max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                    {generatedMarkdown}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
