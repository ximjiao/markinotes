/**
 * Types & Interfaces for AI Chat & Summary Feature
 */

export type AiStatus = "idle" | "streaming" | "completed" | "error";

export type AiActionType =
  | "summarize"
  | "key_takeaways"
  | "action_items"
  | "fix_grammar"
  | "custom";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  viewMode?: "prettified" | "raw";
  copied?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface AiSummaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  noteId?: string;
  workspacePath?: string | null;
  noteTitle?: string;
  onInsertSummary?: (summaryText: string) => void;
  onOpenSettings?: () => void;
}

export interface PrettifiedSummaryProps {
  content: string;
  isStreaming?: boolean;
}
