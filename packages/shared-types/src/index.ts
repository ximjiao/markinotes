/** Master metadata block stored as YAML frontmatter inside each .md file. */
export interface NoteFrontmatter {
  group?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/** A parsed note ready for the editor: frontmatter + Tiptap-ready body. */
export interface ParsedNote {
  frontmatter: NoteFrontmatter;
  /** Raw markdown body, without the frontmatter block. */
  body: string;
}

/** Row shape mirrored from the SQLite read-cache (tauri-backend owns the schema). */
export interface NoteIndexEntry {
  path: string;
  title: string;
  group?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  excerpt: string;
}

export interface FolderTreeNode {
  path: string;
  name: string;
  kind: "folder" | "file";
  children?: FolderTreeNode[];
}

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/** Payload of the `fs:changed` Tauri event emitted by the notify-based watcher. */
export interface FsChangeEvent {
  path: string;
  kind: "create" | "modify" | "remove" | "rename";
}
