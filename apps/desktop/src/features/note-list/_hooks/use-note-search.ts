"use client";

import { useState } from "react";
import type { NoteItem } from "../_types/note-list.types";

export function useNoteSearch(initialNotes: NoteItem[] = []) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = initialNotes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    searchQuery,
    setSearchQuery,
    filteredNotes,
  };
}
