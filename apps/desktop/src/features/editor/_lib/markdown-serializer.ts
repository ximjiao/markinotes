import type { NoteDocument, NoteFrontmatter } from "../_types/editor.types";

export function parseNoteMarkdown(rawContent: string): NoteDocument {
  // Placeholder parser for YAML frontmatter + markdown body
  return {
    frontmatter: {},
    content: rawContent,
  };
}

export function serializeNoteMarkdown(doc: NoteDocument): string {
  // Placeholder serializer
  return doc.content;
}
