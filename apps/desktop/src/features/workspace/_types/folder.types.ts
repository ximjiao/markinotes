export interface LocalFolderNode {
  id: string;
  name: string;
  path: string;
  noteCount: number;
  isExpanded?: boolean;
  children?: LocalFolderNode[];
}

export type SpecialViewType = "recents" | "starred" | "calendar" | "templates" | "organize" | string;
