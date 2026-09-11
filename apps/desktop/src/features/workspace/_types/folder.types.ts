export interface LocalFolderNode {
  id: string;
  name: string;
  path: string;
  noteCount: number;
  isExpanded?: boolean;
  children?: LocalFolderNode[];
}

export type SpecialViewType = "recents" | "starred" | "calendar" | "templates" | "organize" | string;

export interface FolderTreeItemProps {
  folder: LocalFolderNode;
  activeId: string | null;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onCreateSubfolder: (parentId: string, name: string) => void;
  onCreateNote?: (folderPath: string) => void;
  onRenameFolder?: (folderId: string, newName: string) => void;
  depth?: number;
}
