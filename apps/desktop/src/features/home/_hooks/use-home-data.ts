"use client";

import { useState } from "react";
import type { NoteCardData, ViewMode, WorkspaceFolderInfo } from "../_types/home.types";

const MOCK_NOTES: NoteCardData[] = [
  {
    id: "1",
    path: "/notes/getting-started.md",
    title: "Getting Started with Markidown",
    excerpt: "Welcome to Markidown! Click anywhere and start typing. Fast, local-first markdown note taking.",
    groupName: "In My Space",
    updatedAt: "2 mins ago",
    isStarred: true,
    tags: ["guide", "welcome"],
    coverColor: "bg-purple-500/10 border-purple-500/20",
  },
  {
    id: "2",
    path: "/notes/architecture-decisions.md",
    title: "Architecture & Design System",
    excerpt: "Tauri v2 + Next.js static export + Tiptap serializer + SQLite read-cache. Zero vendor lock-in.",
    groupName: "In Projects",
    updatedAt: "1 hour ago",
    isStarred: false,
    tags: ["tech", "architecture"],
    coverColor: "bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "3",
    path: "/notes/craft-handbook.md",
    title: "Craft-Style Dashboard Handbook",
    excerpt: "Grid views, slash commands, instant Cmd+K switcher, and beautiful typography.",
    groupName: "In Handbooks",
    updatedAt: "Yesterday",
    isStarred: true,
    tags: ["design", "ui"],
    coverColor: "bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "4",
    path: "/notes/tauri-ipc-spec.md",
    title: "Tauri IPC Command Specification",
    excerpt: "Rust command bindings for native file system CRUD, SQLite indexing, and notify watcher.",
    groupName: "In Backend",
    updatedAt: "3 days ago",
    isStarred: false,
    tags: ["rust", "backend"],
  },
];

export function useHomeData() {
  const [workspace, setWorkspace] = useState<WorkspaceFolderInfo | null>({
    name: "My Workspace",
    path: "~/Documents/Notes",
    totalNotes: MOCK_NOTES.length,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [notes] = useState<NoteCardData[]>(MOCK_NOTES);
  const [selectedFolder, setSelectedFolder] = useState<string>("recents");

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.groupName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    workspace,
    setWorkspace,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    notes: filteredNotes,
    selectedFolder,
    setSelectedFolder,
  };
}
