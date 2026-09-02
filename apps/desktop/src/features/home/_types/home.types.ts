export type ViewMode = "grid" | "list";

export interface NoteCardData {
  id: string;
  path: string;
  title: string;
  excerpt: string;
  groupName?: string;
  updatedAt: string;
  isStarred?: boolean;
  tags?: string[];
  coverColor?: string;
}

import type { LocalFolderNode } from "../../workspace/_types/folder.types";

export interface WorkspaceFolderInfo {
  name: string;
  path: string;
  totalNotes: number;
  folders: LocalFolderNode[];
}
