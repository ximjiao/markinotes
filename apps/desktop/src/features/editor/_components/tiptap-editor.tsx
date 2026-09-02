"use client";

import React, { useState, useEffect } from "react";
import { EditorContent } from "@tiptap/react";
import { useTiptapEditor } from "../_hooks/use-tiptap-editor";
import { EditorToolbar } from "./editor-toolbar";
import { NotionBlockSideHandle } from "./notion-block-side-handle";
import { SlashCommandMenu } from "./slash-command-menu";
import { BubbleToolbar } from "./bubble-toolbar";
import { EditorFooter } from "./editor-footer";
import { AiSummaryDialog } from "./ai-summary-dialog";
import type { NoteDocument } from "../_types/editor.types";

interface TiptapEditorProps {
  initialContent?: string;
  initialTitle?: string;
  onSave?: (markdown: string, doc: NoteDocument) => void;
  noteId?: string;
  workspacePath?: string | null;
}

export function TiptapEditor({
  initialContent,
  initialTitle = "Getting Started with Markidown",
  onSave,
  noteId,
  workspacePath,
}: TiptapEditorProps) {
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState(initialTitle);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);

  const { editor, frontmatter, saveStatus, wordCount, charCount } = useTiptapEditor({
    initialContent,
    initialFrontmatter: { title: initialTitle },
    onContentChange: (markdown, fm) => {
      onSave?.(markdown, { frontmatter: { ...fm, title: noteTitle }, content: markdown });
    },
  });

  useEffect(() => {
    const handleOpenSlashMenu = () => setIsSlashMenuOpen(true);
    window.addEventListener("open-slash-menu", handleOpenSlashMenu);
    return () => window.removeEventListener("open-slash-menu", handleOpenSlashMenu);
  }, []);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-xs text-txt-muted">
        Loading editor...
      </div>
    );
  }

  const currentDoc: NoteDocument = {
    frontmatter: { ...frontmatter, title: noteTitle },
    content: (editor.storage as any).markdown?.getMarkdown?.() || editor.getText() || "",
  };

  return (
    <div className="flex flex-col h-full w-full bg-background text-txt-primary overflow-y-auto">
      {/* 1. Top Docs Formatting Toolbar with Ellipsis Export Button */}
      <EditorToolbar editor={editor} doc={currentDoc} />

      {/* 2. Main Writing Canvas Area (Outer Scrollable Container) */}
      <div className="relative flex-1 px-16 py-10 max-w-4xl mx-auto w-full">
        {/* Inline Editable Page Title H1 */}
        <input
          type="text"
          value={noteTitle}
          onChange={(e) => setNoteTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full text-4xl font-black text-txt-primary bg-transparent outline-none border-b border-border/40 pb-3 mb-8 placeholder:text-txt-muted tracking-tight"
        />

        {/* Notion-style Block Side Handle (+ and :: Grip) */}
        <NotionBlockSideHandle editor={editor} onOpenSlashMenu={() => setIsSlashMenuOpen(true)} />

        {/* Floating Text Selection Bubble Toolbar */}
        <BubbleToolbar editor={editor} />

        {/* Slash Command Menu (Triggered by / or + button) */}
        <SlashCommandMenu
          editor={editor}
          isOpen={isSlashMenuOpen}
          onClose={() => setIsSlashMenuOpen(false)}
        />

        {/* Tiptap Canvas without blue focus box */}
        <div className="w-full" suppressHydrationWarning>
          <EditorContent
            editor={editor}
            className="prose dark:prose-invert max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:ring-0 [&_.ProseMirror]:border-none text-txt-primary text-base leading-relaxed min-h-[600px]"
          />
        </div>
      </div>

      {/* 3. Footer Bar */}
      <EditorFooter
        saveStatus={saveStatus}
        wordCount={wordCount}
        charCount={charCount}
        onSummarize={() => setIsAiDialogOpen(true)}
      />

      {/* 4. AI Summary Dialog */}
      <AiSummaryDialog
        isOpen={isAiDialogOpen}
        onClose={() => setIsAiDialogOpen(false)}
        noteId={noteId}
        workspacePath={workspacePath}
        noteTitle={noteTitle}
        onInsertSummary={(summary) => {
          if (editor) {
            editor.commands.focus("end");
            editor.commands.insertContent(`\n\n## 🤖 Summary\n\n${summary}\n\n`);
          }
        }}
      />
    </div>
  );
}
