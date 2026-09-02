"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { templateCategories, type NoteTemplate, type TemplateCategory } from "../_lib/templates-data";
import * as LucideIcons from "lucide-react";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: NoteTemplate) => void;
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

function CategorySection({ category, onSelectTemplate, onClose }: {
  category: TemplateCategory;
  onSelectTemplate: (t: NoteTemplate) => void;
  onClose: () => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-txt-primary mb-3">{category.title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {category.templates.map((template) => {
          const IconComponent = (LucideIcons as any)[template.icon] || LucideIcons.FileText;
          return (
            <button
              key={template.id}
              onClick={() => { onSelectTemplate(template); onClose(); }}
              className="group text-left flex flex-col gap-2 focus:outline-none"
            >
              {/* Paper thumbnail */}
              <div className="w-full rounded-lg border border-border overflow-hidden shadow-sm group-hover:shadow-md group-hover:border-primary/50 transition-all duration-200 aspect-[3/4] bg-gray-50 dark:bg-neutral-800">
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
    </div>
  );
}

export function TemplateDialog({ isOpen, onClose, onSelectTemplate }: TemplateDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden flex flex-col max-h-[90vh] bg-background gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <div>
            <DialogTitle className="text-xl font-bold text-txt-primary flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-txt-brand" />
              Template Gallery
            </DialogTitle>
            <p className="text-sm text-txt-muted font-normal mt-0.5">
              Choose a template to quickly start your next document.
            </p>
          </div>
        </div>

        {/* Scrollable grid */}
        <div className="flex-1 px-6 pb-6 overflow-y-auto space-y-8">
          {templateCategories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              onSelectTemplate={onSelectTemplate}
              onClose={onClose}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
