import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NoteCardData, ViewMode } from "../features/home/_types/home.types";
import { noteIpc } from "../features/home/_lib/note-ipc";
import { workspaceConfig } from "../features/workspace/_lib/workspace-config";
import { stripMarkdown } from "@/lib/utils";
import { generateSmartExcerpt } from "../features/home/_lib/excerpt-utils";

interface ActiveNoteRef {
  id: string;
  path: string;
  title: string;
}

interface NotesState {
  notes: NoteCardData[];
  selectedFolder: string;
  searchQuery: string;
  viewMode: ViewMode;

  // Active Note in Editor
  activeNoteRef: ActiveNoteRef | null;
  activeNoteContent: string;
  isContentLoading: boolean;

  // Actions
  loadNotes: (workspacePath: string, extraPaths?: string[]) => Promise<void>;
  setSelectedFolder: (folder: string) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: ViewMode) => void;

  openNote: (id: string, fallbackPath?: string, fallbackTitle?: string) => Promise<void>;
  closeNote: () => void;
  createNote: (workspacePath: string, folderPath: string, title: string) => Promise<NoteCardData | null>;
  updateNote: (workspacePath: string, notePath: string, title: string, content: string, tags?: string[]) => Promise<void>;
  deleteNote: (workspacePath: string, notePath: string) => Promise<void>;
  toggleStar: (workspacePath: string, notePath: string, starred: boolean) => Promise<void>;
  moveNote: (workspacePath: string, notePath: string, newFolderPath: string) => Promise<void>;
  updateNoteStatus: (workspacePath: string, noteId: string, status: string) => Promise<void>;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      selectedFolder: "recents",
      searchQuery: "",
      viewMode: "grid",

      activeNoteRef: null,
      activeNoteContent: "",
      isContentLoading: false,

      setSelectedFolder: (selectedFolder) => set({ selectedFolder }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setViewMode: (viewMode) => set({ viewMode }),

      loadNotes: async (workspacePath: string, extraPaths?: string[]) => {
        if (!workspacePath) return;
        try {
          const config = workspaceConfig.get();
          const allExtras = extraPaths || (config.folders || []).map((f) => f.path).filter((p) => p && p !== workspacePath);
          const data = await noteIpc.list(workspacePath, allExtras);
          const statusKey = `marki_status_${workspacePath}`;
          const existingMapStr = typeof window !== "undefined" ? localStorage.getItem(statusKey) : null;
          const statusMap = existingMapStr ? JSON.parse(existingMapStr) : {};

          const enriched = data.map((n) => {
            let status = statusMap[n.id];
            if (!status) {
              const lowerTags = (n.tags || []).map((t) => t.toLowerCase());
              if (lowerTags.includes("done") || lowerTags.includes("completed")) status = "Done";
              else if (lowerTags.includes("in-progress") || lowerTags.includes("doing") || lowerTags.includes("wip")) status = "In Progress";
              else if (lowerTags.includes("review")) status = "Review";
              else status = "To Do";
            }
            return {
              ...n,
              status,
            };
          });

          set({ notes: enriched });
        } catch (e) {
          console.error("Failed to load notes in store:", e);
        }
      },

      openNote: async (id: string, fallbackPath?: string, fallbackTitle?: string) => {
        const { notes } = get();
        const note = notes.find((n) => n.id === id);

        const targetRef: ActiveNoteRef = note
          ? { id: note.id, path: note.path, title: note.title }
          : { id, path: fallbackPath || "", title: fallbackTitle || "Untitled" };

        set({
          activeNoteRef: targetRef,
          isContentLoading: true,
          activeNoteContent: "",
        });

        try {
          const content = await noteIpc.read(targetRef.path);
          let resolvedContent = content;

          // If content on disk is empty or just the title header, but note card had an excerpt, recover it
          if (
            (!resolvedContent ||
              resolvedContent.trim() === `# ${targetRef.title}` ||
              resolvedContent.trim() === targetRef.title) &&
            note?.excerpt &&
            note.excerpt.trim().length > targetRef.title.length + 5
          ) {
            resolvedContent = `# ${targetRef.title}\n\n${note.excerpt}`;
          }

          set({
            activeNoteContent: resolvedContent || `# ${targetRef.title}\n\n`,
            isContentLoading: false,
          });
        } catch (e) {
          console.error("Failed to read note content:", e);
          const fallback = note?.excerpt ? `# ${targetRef.title}\n\n${note.excerpt}` : `# ${targetRef.title}\n\n`;
          set({
            activeNoteContent: fallback,
            isContentLoading: false,
          });
        }
      },

      closeNote: () => {
        set({
          activeNoteRef: null,
          activeNoteContent: "",
          isContentLoading: false,
        });
      },

      createNote: async (workspacePath: string, folderPath: string, title: string) => {
        if (!workspacePath) return null;
        try {
          const newNote = await noteIpc.create(workspacePath, folderPath, title);
          if (newNote) {
            set((state) => {
              const exists = state.notes.some((n) => n.id === newNote.id || n.path === newNote.path);
              return {
                notes: exists ? state.notes : [newNote, ...state.notes],
              };
            });
            await get().loadNotes(workspacePath);
          }
          return newNote;
        } catch (e) {
          console.error("Failed to create note:", e);
          return null;
        }
      },

      updateNote: async (workspacePath: string, notePath: string, title: string, content: string, tags: string[] = []) => {
        if (!workspacePath) return;
        try {
          await noteIpc.update(workspacePath, notePath, title, content, tags);

          // Optimistic update in notes list
          set((state) => ({
            notes: state.notes.map((n) =>
              n.path === notePath
                ? {
                    ...n,
                    title,
                    excerpt: generateSmartExcerpt(content, 3000),
                    tags: tags.length > 0 ? tags : n.tags,
                  }
                : n
            ),
          }));
        } catch (e) {
          console.error("Failed to update note:", e);
        }
      },

      deleteNote: async (workspacePath: string, notePath: string) => {
        if (!workspacePath) return;
        try {
          await noteIpc.delete(workspacePath, notePath);
          set((state) => ({
            notes: state.notes.filter((n) => n.path !== notePath),
            activeNoteRef: state.activeNoteRef?.path === notePath ? null : state.activeNoteRef,
          }));
        } catch (e) {
          console.error("Failed to delete note:", e);
        }
      },

      toggleStar: async (workspacePath: string, notePath: string, starred: boolean) => {
        if (!workspacePath) return;
        try {
          await noteIpc.toggleStar(workspacePath, notePath, starred);
          set((state) => ({
            notes: state.notes.map((n) => (n.path === notePath ? { ...n, isStarred: starred } : n)),
          }));
        } catch (e) {
          console.error("Failed to toggle star:", e);
        }
      },

      moveNote: async (workspacePath: string, notePath: string, newFolderPath: string) => {
        if (!workspacePath) return;
        try {
          await noteIpc.move(workspacePath, notePath, newFolderPath);
          await get().loadNotes(workspacePath);
        } catch (e) {
          console.error("Failed to move note:", e);
          throw e;
        }
      },

      updateNoteStatus: async (workspacePath: string, noteId: string, status: string) => {
        if (!workspacePath || !noteId) return;

        // Persist status in local storage map for workspace unconditionally
        try {
          const statusKey = `marki_status_${workspacePath}`;
          const existingMapStr = typeof window !== "undefined" ? localStorage.getItem(statusKey) : null;
          const statusMap = existingMapStr ? JSON.parse(existingMapStr) : {};
          statusMap[noteId] = status;
          if (typeof window !== "undefined") {
            localStorage.setItem(statusKey, JSON.stringify(statusMap));
          }
        } catch (e) {
          console.error("Failed to save note status to localStorage:", e);
        }

        // Optimistic update in notes state
        set((state) => ({
          notes: state.notes.map((n) => (n.id === noteId ? { ...n, status } : n)),
        }));
      },
    }),
    {
      name: "marki_notes_preferences",
      partialize: (state) => ({
        viewMode: state.viewMode,
        selectedFolder: state.selectedFolder,
      }),
    }
  )
);
