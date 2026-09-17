import type { LocalFolderNode } from "../../workspace/_types/folder.types";
import type { NoteTemplate } from "../_lib/templates-data";

export type ViewMode = "grid" | "list" | "board";

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
  status?: string;
  parent?: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  dueDate?: string;
}

export interface WorkspaceFolderInfo {
  name: string;
  path: string;
  totalNotes: number;
  folders: LocalFolderNode[];
}

export interface AIOrganizeResponse {
  moves?: { [noteId: string]: string };
  creates?: { [noteId: string]: string };
}

export interface NoteCardProps {
  note: NoteCardData;
  variant?: "grid" | "kanban";
  className?: string;
  onOpen?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onMove?: (id: string) => void;
  onExport?: (id: string) => void;
}

export interface NoteGridProps {
  notes: NoteCardData[];
  viewMode: ViewMode;
  onOpenNote?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onMove?: (id: string) => void;
  onExport?: (id: string) => void;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  dotColor?: string;
}

export interface NoteKanbanBoardProps {
  notes: NoteCardData[];
  workspacePath?: string | null;
  onOpenNote?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onMove?: (id: string) => void;
  onExport?: (id: string) => void;
  onUpdateStatus?: (id: string, newStatus: string) => void;
  onCreateNoteInColumn?: (status: string) => void;
}

export interface KanbanCardProps {
  note: NoteCardData;
  onOpen?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onMove?: (id: string) => void;
  onExport?: (id: string) => void;
  onDragStart?: (e: React.DragEvent, noteId: string) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export interface NotePreviewRendererProps {
  content: string;
  title?: string;
  className?: string;
}

export interface HomeHeaderProps {
  onNewNote: () => void;
}

export interface HomeSidebarProps {
  onCreateNote?: (folderPath: string) => void;
}

export interface TemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: NoteTemplate) => void;
  workspacePath?: string | null;
  onOpenSettings?: () => void;
}

export interface MoveNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  noteTitle: string;
  folders: LocalFolderNode[];
  onMove: (folderPath: string) => Promise<void>;
}

export interface AIOrganizeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: AIOrganizeResponse;
  draftTitles: { id: string; title: string }[];
  onConfirm: (approvedMoves: AIOrganizeResponse) => void;
  isLoading?: boolean;
  errorMessage?: string;
  onOpenSettings?: () => void;
}

export interface AIOrganizeItemRow {
  noteId: string;
  noteTitle: string;
  type: "move" | "create";
  folderDisplayName: string;
  rawTarget: string;
}

export interface OnboardingViewProps {
  onSelectFolder: () => void;
}
