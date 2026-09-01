import type { Editor } from "@tiptap/react";

export interface NoteFrontmatter {
  title?: string;
  tags?: string[];
  group?: string;
  createdAt?: string;
  updatedAt?: string;
  author?: string;
}

export interface NoteDocument {
  frontmatter: NoteFrontmatter;
  content: string;
}

export type ExportType = "pdf" | "docx" | "md" | "txt";

export interface SlashCommandItem {
  title: string;
  description: string;
  iconName: string;
  command: (editor: Editor) => void;
}
