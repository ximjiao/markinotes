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

export interface WorkspaceFolderInfo {
  name: string;
  path: string;
  totalNotes: number;
}
