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
