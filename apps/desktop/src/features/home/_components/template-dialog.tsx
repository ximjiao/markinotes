"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { templateCategories, type NoteTemplate } from "../_lib/templates-data";
import * as LucideIcons from "lucide-react";
import { Sparkles, Loader2, Wand2, Check, AlertCircle, ArrowRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  { label: "📋 1-on-1 Catchup", prompt: "Weekly 1-on-1 sync template between Lead and Engineer covering recap, blockers, and action items." },
  { label: "🚀 Launch Checklist", prompt: "Feature release launch checklist covering timeline, QA sign-off, deployment steps, and metrics." },
  { label: "💡 Brainstorming", prompt: "Feature ideation template covering problem context, wild ideas, priority matrix, and next steps." },
  { label: "📐 Architecture RFC", prompt: "Architecture Decision Record (ADR) template covering context, decision, trade-offs, and alternatives." },
];

export function TemplateDialog({ isOpen, onClose, onSelectTemplate, workspacePath }: TemplateDialogProps) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMarkdown, setGeneratedMarkdown] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten all template categories into a unified list
  const allTemplates = templateCategories.flatMap((c) => c.templates);

  const handleGenerateTemplate = async () => {
    if (!aiPrompt.trim()) {
      inputRef.current?.focus();
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");
    setGeneratedMarkdown("");

    try {
      const config = workspaceConfig.get();
      const wsPath = workspacePath || config.rootPath || "";

      const instruction = `Create a clean, well-structured, and professional Markdown document template tailored for: "${aiPrompt.trim()}".\n` +
        `Formatting rules:\n` +
        `1. The first line MUST be the document title as a Heading 1 (e.g., # Document Title).\n` +
        `2. Provide logical Heading 2 (##) sections, bullet lists, checklist to-dos ([ ]), or tables where helpful.\n` +
        `3. Include brief placeholder hints or guidance prompts in each section.\n` +
        `4. Output ONLY clean Markdown with no conversational filler or wrapping quotes.`;

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
      const finalTitle = firstLine || "AI Custom Template";
      setGeneratedTitle(finalTitle);

      // Immediately apply and create note with generated template!
      onSelectTemplate({
        id: "custom-ai-" + Date.now(),
        title: finalTitle,
        description: aiPrompt.slice(0, 60) || "Custom document template crafted with AI.",
        icon: "Sparkles",
        content: fullOutput,
      });
      setAiPrompt("");
      setGeneratedMarkdown("");
      setGeneratedTitle("");
      onClose();
    } catch (err: any) {
      setErrorMessage(typeof err === "string" ? err : err?.message || "Couldn't craft your template right now. Please check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden flex flex-col max-h-[90vh] bg-background gap-0 shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <div>
            <DialogTitle className="text-xl font-bold text-txt-primary flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-txt-brand" />
              Template Gallery
            </DialogTitle>
            <p className="text-sm text-txt-muted font-normal mt-0.5">
              Choose a template below or describe your document ideas to let AI craft one for you.
            </p>
          </div>
        </div>

        {/* 1. Integrated AI Prompt Bar (Seamless & Native) */}
        <div className="px-6 pb-4">
          <div className="p-2.5 rounded-xl bg-accent/40 border border-border/80 focus-within:border-txt-brand/60 focus-within:bg-accent/60 transition-all space-y-2">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-txt-muted shrink-0 ml-1" />
              <input
                ref={inputRef}
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && aiPrompt.trim() && !isGenerating) {
                    handleGenerateTemplate();
                  }
                }}
                placeholder="What would you like to create? (e.g. 'Weekly 1:1 sync with tech lead')..."
                className="flex-1 bg-transparent text-xs text-txt-primary border-none outline-none placeholder:text-txt-muted"
              />
              <Button
                size="sm"
                onClick={handleGenerateTemplate}
                disabled={!aiPrompt.trim() || isGenerating}
                className="h-7 px-3 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium shrink-0 rounded-lg shadow-xs cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Crafting...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3 w-3" />
                    Generate with AI
                  </>
                )}
              </Button>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              <span className="text-[10px] text-txt-muted shrink-0 font-medium pl-1">Try prompts:</span>
              {AI_PROMPT_SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setAiPrompt(s.prompt)}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-border/80 bg-background hover:bg-accent hover:text-txt-primary text-txt-secondary transition-colors cursor-pointer shrink-0"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* 2. Unified Template Grid (Only Real Templates) */}
        <div className="flex-1 px-6 pb-6 overflow-y-auto">
          <TooltipProvider delayDuration={250}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {allTemplates.map((template) => {
                const IconComponent = (LucideIcons as any)[template.icon] || LucideIcons.FileText;
                return (
                  <Tooltip key={template.id}>
                    <TooltipTrigger asChild>
                      <button
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

                        {/* Label below: fixed single line ellipsis */}
                        <div className="w-full min-w-0">
                          <div className="flex items-center gap-1.5">
                            <IconComponent className="h-3.5 w-3.5 text-txt-brand shrink-0" />
                            <span className="text-sm font-medium text-txt-primary group-hover:text-txt-brand transition-colors truncate">
                              {template.title}
                            </span>
                          </div>
                          <p className="text-xs text-txt-muted mt-0.5 truncate">
                            {template.description}
                          </p>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      align="center"
                      className="max-w-[240px] p-2.5 shadow-xl bg-popover text-popover-foreground border border-border rounded-lg text-left"
                    >
                      <p className="font-semibold text-xs text-txt-primary leading-tight">{template.title}</p>
                      <p className="text-[11px] text-txt-secondary mt-1 leading-snug font-normal">{template.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
