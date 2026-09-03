"use client";

import { useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Link } from "@tiptap/extension-link";
import { CustomImageExtension } from "../_components/custom-image-extension";
import { Markdown } from "tiptap-markdown";
import { useState, useEffect } from "react";
import type { NoteFrontmatter } from "../_types/editor.types";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

interface UseTiptapEditorOptions {
  initialContent?: string;
  initialFrontmatter?: NoteFrontmatter;
  onContentChange?: (markdown: string, frontmatter: NoteFrontmatter) => void;
}

export function useTiptapEditor({
  initialContent = "# Getting Started\n\nStart typing markdown notes here... Type `/` to insert blocks.",
  initialFrontmatter = { title: "Getting Started" },
  onContentChange,
}: UseTiptapEditorOptions = {}) {
  const [frontmatter, setFrontmatter] = useState<NoteFrontmatter>(initialFrontmatter);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Placeholder.configure({
        placeholder: "Press '/' for commands or start typing...",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true, lastColumnResizable: true, cellMinWidth: 80 }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({ openOnClick: false }),
      CustomImageExtension,
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      setSaveStatus("dirty");

      try {
        const text = editor.getText();
        setCharCount(text.length);
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        setWordCount(words);

        let markdown = "";
        try {
          markdown = (editor.storage as any)?.markdown?.getMarkdown?.() || editor.getText() || "";
        } catch {
          markdown = editor.getText() || "";
        }

        onContentChange?.(markdown, frontmatter);
      } catch {
        // Safe update fallback
      }

      setTimeout(() => {
        setSaveStatus("saved");
      }, 600);
    },
  });

  useEffect(() => {
    if (editor && initialContent) {
      try {
        const text = editor.getText();
        setCharCount(text.length);
        setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
      } catch {
        // Safe initial calculation
      }
    }
  }, [editor, initialContent]);

  return {
    editor: isMounted ? editor : null,
    frontmatter,
    setFrontmatter,
    saveStatus,
    wordCount,
    charCount,
  };
}
