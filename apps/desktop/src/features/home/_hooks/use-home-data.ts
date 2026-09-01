"use client";

import { useState, useEffect } from "react";
import type { NoteCardData, ViewMode, WorkspaceFolderInfo } from "../_types/home.types";
import { noteIpc } from "../_lib/note-ipc";
import { workspaceConfig } from "../../workspace/_lib/workspace-config";

export function useHomeData() {
  const [workspace, setWorkspace] = useState<WorkspaceFolderInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [notes, setNotes] = useState<NoteCardData[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("recents");

  // Load config on mount
  useEffect(() => {
    const config = workspaceConfig.get();
    if (config.setupDone) {
      setWorkspace({
        name: config.name,
        path: config.rootPath,
        totalNotes: 0, // Will be updated by IPC
      });
    } else {
      setWorkspace(null); // Triggers onboarding
    }
  }, []);

  // Load notes when workspace is set
  const loadNotes = async () => {
    if (workspace?.path) {
      const data = await noteIpc.list(workspace.path);
      setNotes(data);
      setWorkspace(prev => prev ? { ...prev, totalNotes: data.length } : null);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [workspace?.path]);

  const createNote = async (folderPath: string, title: string) => {
    if (!workspace?.path) return null;
    const newNote = await noteIpc.create(workspace.path, folderPath, title);
    await loadNotes();
    return newNote;
  };

  const deleteNote = async (notePath: string) => {
    if (!workspace?.path) return;
    await noteIpc.delete(workspace.path, notePath);
    await loadNotes();
  };

  const toggleStar = async (notePath: string, starred: boolean) => {
    if (!workspace?.path) return;
    await noteIpc.toggleStar(workspace.path, notePath, starred);
    await loadNotes();
  };

  const updateNote = async (notePath: string, title: string, content: string, tags?: string[]) => {
    if (!workspace?.path) return;
    await noteIpc.update(workspace.path, notePath, title, content, tags);
    // Don't auto-reload list here to prevent focus loss if actively editing,
    // rely on editor closing to refresh or just optimistic update.
    setNotes(prev => prev.map(n => n.path === notePath ? { ...n, title, excerpt: content.substring(0, 100) } : n));
  };
  
  const refreshWorkspace = () => {
     const config = workspaceConfig.get();
    if (config.setupDone) {
      setWorkspace({
        name: config.name,
        path: config.rootPath,
        totalNotes: notes.length,
      });
      loadNotes();
    }
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.groupName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    workspace,
    refreshWorkspace,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    notes: filteredNotes,
    selectedFolder,
    setSelectedFolder,
    createNote,
    deleteNote,
    toggleStar,
    updateNote,
  };
}
