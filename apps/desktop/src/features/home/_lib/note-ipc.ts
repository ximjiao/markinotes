"use client";

import type { NoteCardData } from "../_types/home.types";
import { invoke } from "@tauri-apps/api/core";

export const isTauri = () => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

export const noteIpc = {
  list: async (workspacePath: string): Promise<NoteCardData[]> => {
    if (isTauri()) {
      return invoke("note_list", { workspacePath });
    }
    // Web fallback
    const stored = localStorage.getItem(`marki_notes_${workspacePath}`);
    return stored ? JSON.parse(stored) : [];
  },

  create: async (workspacePath: string, folderPath: string, title: string): Promise<NoteCardData> => {
    if (isTauri()) {
      return invoke("note_create", { workspacePath, folderPath, title });
    }
    // Web fallback
    const notes = await noteIpc.list(workspacePath);
    const newNote: NoteCardData = {
      id: crypto.randomUUID(),
      path: `${folderPath}/${title}.md`,
      title,
      excerpt: "",
      updatedAt: "Just now",
    };
    localStorage.setItem(`marki_notes_${workspacePath}`, JSON.stringify([...notes, newNote]));
    return newNote;
  },

  read: async (notePath: string): Promise<string> => {
    if (isTauri()) {
      return invoke("note_read", { notePath });
    }
    // Web fallback
    return localStorage.getItem(`marki_content_${notePath}`) || "";
  },

  update: async (workspacePath: string, notePath: string, title: string, content: string, tags: string[] = []): Promise<NoteCardData> => {
    if (isTauri()) {
      return invoke("note_update", { workspacePath, notePath, title, content, tags });
    }
    // Web fallback
    // We just mock the update returning a new object and saving content
    localStorage.setItem(`marki_content_${notePath}`, content);
    return {} as NoteCardData;
  },

  move: async (workspacePath: string, notePath: string, newFolderPath: string): Promise<string> => {
    if (isTauri()) {
      return invoke("note_move", { workspacePath, notePath, newFolderPath });
    }
    // Web fallback
    return notePath;
  },

  delete: async (workspacePath: string, notePath: string): Promise<void> => {
    if (isTauri()) {
      return invoke("note_delete", { workspacePath, notePath });
    }
    // Web fallback
    const notes = await noteIpc.list(workspacePath);
    const newNotes = notes.filter(n => n.path !== notePath);
    localStorage.setItem(`marki_notes_${workspacePath}`, JSON.stringify(newNotes));
    localStorage.removeItem(`marki_content_${notePath}`);
  },

  toggleStar: async (workspacePath: string, notePath: string, starred: boolean): Promise<NoteCardData> => {
    if (isTauri()) {
      return invoke("note_toggle_star", { workspacePath, notePath, starred });
    }
    // Web fallback
    return {
        id: "mock",
        path: notePath,
        title: "Mock",
        excerpt: "",
        updatedAt: "Just now",
        isStarred: starred
    };
  }
};
