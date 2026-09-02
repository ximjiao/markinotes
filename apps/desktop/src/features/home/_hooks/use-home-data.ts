"use client";

import { useState, useEffect, useCallback } from "react";
import type { NoteCardData, ViewMode, WorkspaceFolderInfo } from "../_types/home.types";
import { noteIpc } from "../_lib/note-ipc";
import { workspaceConfig } from "../../workspace/_lib/workspace-config";

export function useHomeData() {
  const [workspace, setWorkspace] = useState<WorkspaceFolderInfo | null>(null);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [notes, setNotes] = useState<NoteCardData[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("recents");

  // Load config on mount
  useEffect(() => {
    const config = workspaceConfig.get();
    if (config.setupDone) {
      setWorkspace({
        name: config.name,
        path: config.rootPath,
        folders: config.folders || [],
        totalNotes: 0,
      });
    } else {
      setWorkspace(null);
    }
    setIsConfigLoaded(true);
  }, []);

  // Load notes when workspace is set
  const loadNotes = useCallback(async (wsPath?: string) => {
    const path = wsPath || workspace?.path;
    if (!path) return;
    try {
      const data = await noteIpc.list(path);
      setNotes(data);
      const tags = await noteIpc.getAllTags(path);
      setAllTags(tags);
      setWorkspace(prev => prev ? { ...prev, totalNotes: data.length } : null);
    } catch (e) {
      console.error("Failed to load notes:", e);
    }
  }, [workspace?.path]);

  useEffect(() => {
    if (workspace?.path) loadNotes(workspace.path);
  }, [workspace?.path]); // eslint-disable-line react-hooks/exhaustive-deps

  const createNote = async (folderPath: string, title: string) => {
    if (!workspace?.path) return null;
    try {
      const newNote = await noteIpc.create(workspace.path, folderPath, title);
      await loadNotes();
      return newNote;
    } catch (e) {
      console.error("Failed to create note:", e);
      return null;
    }
  };

  const deleteNote = async (notePath: string) => {
    if (!workspace?.path) return;
    try {
      await noteIpc.delete(workspace.path, notePath);
      setNotes(prev => prev.filter(n => n.path !== notePath));
    } catch (e) {
      console.error("Failed to delete note:", e);
    }
  };

  const toggleStar = async (notePath: string, starred: boolean) => {
    if (!workspace?.path) return;
    try {
      await noteIpc.toggleStar(workspace.path, notePath, starred);
      setNotes(prev => prev.map(n => n.path === notePath ? { ...n, isStarred: starred } : n));
    } catch (e) {
      console.error("Failed to toggle star:", e);
    }
  };

  const updateNote = async (notePath: string, title: string, content: string, tags?: string[]) => {
    if (!workspace?.path) return;
    try {
      await noteIpc.update(workspace.path, notePath, title, content, tags);
      // Optimistic update - don't reload list to avoid focus loss
      setNotes(prev => prev.map(n =>
        n.path === notePath
          ? { ...n, title, excerpt: content.replace(/^#\s+[^\n]+\n+/, "").substring(0, 120) }
          : n
      ));
    } catch (e) {
      console.error("Failed to update note:", e);
    }
  };

  const moveNote = async (notePath: string, newFolderPath: string) => {
    if (!workspace?.path) return;
    try {
      await noteIpc.move(workspace.path, notePath, newFolderPath);
      await loadNotes(); // Reload notes from DB to get the new path and groupName
    } catch (e) {
      console.error("Failed to move note:", e);
      throw e;
    }
  };

  /** Read full content of a note from disk */
  const readNoteContent = async (notePath: string): Promise<string> => {
    try {
      return await noteIpc.read(notePath);
    } catch (e) {
      console.error("Failed to read note:", e);
      return "";
    }
  };

  const refreshWorkspace = () => {
    const config = workspaceConfig.get();
    if (config.setupDone) {
      const newWs: WorkspaceFolderInfo = {
        name: config.name,
        path: config.rootPath,
        folders: config.folders || [],
        totalNotes: notes.length,
      };
      setWorkspace(newWs);
      loadNotes(config.rootPath);
    }
  };

  // Filter notes by selected folder AND search query
  const filteredNotes = notes.filter((note) => {
    // Search filter
    const matchesSearch =
      !searchQuery ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.excerpt.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Folder filter
    if (selectedFolder === "recents") return true;
    if (selectedFolder === "starred") return !!note.isStarred;
    if (selectedFolder === "settings") return false;
    if (selectedFolder === "drafts") return note.path.startsWith(`${workspace?.path}/Drafts`);
    if (selectedFolder.startsWith("tag:")) {
      const tag = selectedFolder.split(":")[1];
      return note.tags?.includes(tag);
    }

    // Match by folder path prefix (recursively find folder)
    let foundFolder: any = null;
    const findRecursive = (folders: any[]) => {
      for (const f of folders) {
        if (f.id === selectedFolder) {
          foundFolder = f;
          return;
        }
        if (f.children) findRecursive(f.children);
      }
    };
    if (workspace?.folders) findRecursive(workspace.folders);

    if (!foundFolder) return true; // unknown folder, show all
    return note.path.startsWith(foundFolder.path);
  });

  return {
    workspace,
    isConfigLoaded,
    refreshWorkspace,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    notes: filteredNotes,
    allTags,
    selectedFolder,
    setSelectedFolder,
    createNote,
    deleteNote,
    toggleStar,
    updateNote,
    moveNote,
    readNoteContent,
    loadNotes,
  };
}
