"use client";

import { useNoteSearch } from "../_hooks/use-note-search";

export function NoteListView() {
  const { searchQuery, setSearchQuery, filteredNotes } = useNoteSearch([]);

  return (
    <div className="flex flex-col h-full w-full border-r border-border bg-background">
      <div className="p-3 border-b border-border">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          className="w-full px-3 py-1.5 text-xs bg-accent rounded text-txt-primary placeholder:text-txt-muted outline-none"
        />
      </div>
      <div className="flex-1 p-2 overflow-auto">
        {filteredNotes.length === 0 ? (
          <div className="text-xs text-txt-muted p-2 text-center">No notes found</div>
        ) : (
          filteredNotes.map((note) => (
            <div key={note.id} className="p-2 hover:bg-accent rounded cursor-pointer">
              <div className="text-sm font-medium text-txt-primary">{note.title}</div>
              <div className="text-xs text-txt-secondary truncate">{note.excerpt}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
