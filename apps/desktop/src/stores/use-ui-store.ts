import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIOrganizeResponse } from "../features/home/_types/home.types";

interface UiState {
  // Modal / Dialog States
  isTemplateDialogOpen: boolean;
  movingNoteId: string | null;
  aiOrganizeDialog: {
    isOpen: boolean;
    isLoading: boolean;
    suggestions: AIOrganizeResponse;
  };

  // Editor Preferences (Persistent)
  editorFontStyle: "default" | "serif" | "mono";
  editorIsSmallText: boolean;
  editorIsFullWidth: boolean;

  // Actions
  setTemplateDialogOpen: (open: boolean) => void;
  setMovingNoteId: (id: string | null) => void;
  setAiOrganizeDialog: (state: Partial<{ isOpen: boolean; isLoading: boolean; suggestions: AIOrganizeResponse }>) => void;
  setEditorFontStyle: (style: "default" | "serif" | "mono") => void;
  setEditorIsSmallText: (val: boolean) => void;
  setEditorIsFullWidth: (val: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isTemplateDialogOpen: false,
      movingNoteId: null,
      aiOrganizeDialog: {
        isOpen: false,
        isLoading: false,
        suggestions: {},
      },

      editorFontStyle: "default",
      editorIsSmallText: false,
      editorIsFullWidth: false,

      setTemplateDialogOpen: (isTemplateDialogOpen) => set({ isTemplateDialogOpen }),
      setMovingNoteId: (movingNoteId) => set({ movingNoteId }),
      setAiOrganizeDialog: (partial) =>
        set((state) => ({
          aiOrganizeDialog: { ...state.aiOrganizeDialog, ...partial },
        })),

      setEditorFontStyle: (editorFontStyle) => set({ editorFontStyle }),
      setEditorIsSmallText: (editorIsSmallText) => set({ editorIsSmallText }),
      setEditorIsFullWidth: (editorIsFullWidth) => set({ editorIsFullWidth }),
    }),
    {
      name: "marki_ui_preferences",
      partialize: (state) => ({
        editorFontStyle: state.editorFontStyle,
        editorIsSmallText: state.editorIsSmallText,
        editorIsFullWidth: state.editorIsFullWidth,
      }),
    }
  )
);
