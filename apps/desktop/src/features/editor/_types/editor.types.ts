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
  id?: string;
  path?: string;
  frontmatter: NoteFrontmatter;
  content: string;
}

export type ExportType = "pdf" | "docx" | "md" | "txt";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "streaming" | "dirty";

export interface SlashCommandItem {
  title: string;
  description: string;
  iconName: string;
  command: (editor: Editor) => void;
}

export interface EditorToolbarProps {
  editor: Editor | null;
  doc: NoteDocument;
  saveStatus?: SaveStatus;
  saveCountdown?: number | null;
  onSummarize?: () => void;
  isSummarizing?: boolean;
  onOpenImageDialog?: () => void;
}

export interface SlashCommandMenuProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenImageDialog?: () => void;
}

export type SlashMenuProps = SlashCommandMenuProps;

export interface CommandItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  shortcut?: string;
  onClick: () => void;
  active?: boolean;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
  pos: number;
}

export type HeadingItem = TocItem;

export interface NotionTocMinimapProps {
  editor: Editor | null;
  className?: string;
  isAiOpen?: boolean;
}

export interface ActiveLinkData {
  href: string;
  element: HTMLElement;
  rect: DOMRect;
}

export interface NotionLinkHoverCardProps {
  editor: Editor | null;
}

export interface NotionSelectionPopoverProps {
  editor: any;
  workspacePath?: string | null;
  noteId?: string;
  onAiApplied?: (action: string) => void;
  onAiUsed?: () => void;
}

export interface NotionBlockSideHandleProps {
  editor: Editor | null;
  onOpenSlashMenu?: () => void;
  gutterOffset?: number;
  clampInsideContainer?: boolean;
}

export interface NotionTablePillHandlesProps {
  editor: Editor | null;
  workspacePath?: string | null;
}

export interface BubbleToolbarProps {
  editor: Editor | null;
}

export interface EditorFooterProps {
  wordCount?: number;
  characterCount?: number;
  readingTime?: number;
}

export interface ImageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImage: (src: string, alt?: string, title?: string) => void;
}

export interface TiptapEditorProps {
  initialContent?: string;
  initialTitle?: string;
  onSave?: (markdown: string, doc: NoteDocument) => void;
  noteId?: string;
  workspacePath?: string | null;
}

export interface AiSummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  noteId?: string;
  workspacePath?: string | null;
  noteTitle?: string;
  onInsertSummary?: (summary: string) => void;
  onOpenSettings?: () => void;
}

export interface NovelEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  allWorkspaceTags?: string[];
  onBack?: () => void;
  onSave?: (title: string, content: string, tags: string[]) => void;
  onOpenSettings?: () => void;
  noteId?: string;
  workspacePath?: string | null;
}

export interface CustomSlashItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  searchTerms: string[];
  command: (props: any) => void;
}
