import type { NoteItem } from "../_types/note-list.types";

export function sortNotesByRecent(notes: NoteItem[]): NoteItem[] {
  return [...notes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}
