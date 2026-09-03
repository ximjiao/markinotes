"use client";

import type { NoteCardData } from "../_types/home.types";
import { invoke, Channel } from "@tauri-apps/api/core";

export const isTauri = () => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

export interface BufferedNoteData {
  content: string;
  sizeBytes: number;
  lineCount: number;
}

export const noteIpc = {
  list: async (workspacePath: string): Promise<NoteCardData[]> => {
    if (isTauri()) {
      return invoke("note_list", { workspacePath });
    }
    // Web fallback
    const stored = localStorage.getItem(`marki_notes_${workspacePath}`);
    return stored ? JSON.parse(stored) : [];
  },

  getAllTags: async (workspacePath: string): Promise<string[]> => {
    if (isTauri()) {
      return invoke("note_get_all_tags", { workspacePath });
    }
    // Web fallback
    return [];
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

  readBuffered: async (notePath: string): Promise<BufferedNoteData> => {
    if (isTauri()) {
      const res: any = await invoke("note_read_buffered", { notePath });
      return {
        content: res.content || "",
        sizeBytes: res.size_bytes ?? (res.content?.length || 0),
        lineCount: res.line_count ?? 0,
      };
    }
    // Web fallback
    const content = localStorage.getItem(`marki_content_${notePath}`) || "";
    return {
      content,
      sizeBytes: new Blob([content]).size,
      lineCount: content.split("\n").length,
    };
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

  saveStream: async (workspacePath: string, notePath: string, title: string, content: string, tags: string[] = []): Promise<number> => {
    if (isTauri()) {
      return invoke("note_save_stream", { workspacePath, notePath, title, content, tags });
    }
    // Web fallback
    localStorage.setItem(`marki_content_${notePath}`, content);
    return content.length;
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
  },

  summarizeStream: async (
    workspacePath: string, 
    noteId: string, 
    onChunk: (chunk: string) => void,
    customApiKey?: string,
    customModel?: string
  ): Promise<void> => {
    if (isTauri()) {
      const channel = new Channel<string>();
      channel.onmessage = onChunk;
      return invoke("note_summarize_stream", {
        workspacePath,
        noteId,
        onChunk: channel,
        customApiKey,
        customModel
      });
    }

    // Web fallback mock
    for (let i = 0; i < 20; i++) {
      const char = i % 2 === 0 ? " word" : ".";
      await new Promise((r) => setTimeout(r, 25));
      onChunk(char);
    }
  },

  organizeDrafts: async (
    workspacePath: string,
    draftsJson: string,
    foldersJson: string,
    customApiKey?: string,
    customModel?: string
  ): Promise<string> => {
    if (isTauri()) {
      return invoke("note_organize_drafts", {
        workspacePath,
        draftsJson,
        foldersJson,
        customApiKey,
        customModel
      });
    }
    // Web fallback mock
    return "{}";
  }
};
