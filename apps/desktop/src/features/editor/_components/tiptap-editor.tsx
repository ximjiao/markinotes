"use client";

import { useEditorAutosave } from "../_hooks/use-editor-autosave";

export function TiptapEditor() {
  const { saveStatus } = useEditorAutosave();

  return (
    <div className="flex flex-col h-full w-full bg-background text-txt-primary">
      <div className="flex justify-between items-center px-4 py-2 border-b border-border">
        <span className="text-xs text-txt-secondary font-medium">Editor</span>
        <span className="text-xs text-txt-muted capitalize">Status: {saveStatus}</span>
      </div>
      <div className="flex-1 p-6 overflow-auto">
        <p className="text-txt-secondary text-sm">Start typing your Markdown note...</p>
      </div>
    </div>
  );
}
