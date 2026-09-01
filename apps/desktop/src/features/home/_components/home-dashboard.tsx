"use client";

import React, { useState } from "react";
import { useHomeData } from "../_hooks/use-home-data";
import { HomeHeader } from "./home-header";
import { HomeSidebar } from "./home-sidebar";
import { NoteGrid } from "./note-grid";
import { OnboardingView } from "./onboarding-view";
import { AppShell } from "@/components/shared";
import { NovelEditor } from "@features/editor";
import { SettingsView } from "../../settings/_components/settings-view";

export function HomeDashboard() {
  const {
    workspace,
    refreshWorkspace,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    notes,
    selectedFolder,
    setSelectedFolder,
    createNote,
    deleteNote,
    toggleStar,
    updateNote,
  } = useHomeData();

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const activeNote = notes.find((n) => n.id === activeNoteId);

  if (!workspace) {
    return (
      <OnboardingView
        onSelectFolder={refreshWorkspace}
      />
    );
  }

  // Pure Fullscreen Novel Editor View (Notion Prebuilt Mode)
  if (activeNoteId) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col h-screen w-screen bg-background overflow-hidden">
        <NovelEditor
          initialTitle={activeNote?.title || "New Document"}
          initialContent={
            activeNote
              ? `# ${activeNote.title}\n\n${activeNote.excerpt}`
              : "# New Document\n\nStart typing markdown here..."
          }
          onBack={() => setActiveNoteId(null)}
          onSave={(title, content) => {
             if (activeNoteId === "new" || !activeNote) {
                 // The actual creation flow happens before setting activeNoteId, but just in case
             } else {
                 updateNote(activeNote.path, title, content, activeNote.tags);
             }
          }}
        />
      </div>
    );
  }

  const handleNewNote = async () => {
      // Create a default note in the current folder (or Personal if recents)
      const folderPath = selectedFolder === "recents" || selectedFolder === "starred" ? `${workspace.path}/Personal` : `${workspace.path}/${selectedFolder}`;
      const newNote = await createNote(folderPath, "Untitled Note");
      if (newNote) {
          setActiveNoteId(newNote.id);
      }
  };

  // Standard Dashboard Grid View
  return (
    <AppShell
      sidebar={
        <HomeSidebar
          selectedView={selectedFolder}
          onSelectView={(v) => {
            setSelectedFolder(v);
            setActiveNoteId(null);
          }}
        />
      }
      header={
        <HomeHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNewNote={handleNewNote}
        />
      }
    >
      <div className="flex flex-col flex-1 h-full overflow-hidden bg-background">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold text-txt-primary capitalize">{selectedFolder}</h2>
          <span className="text-xs text-txt-muted">{notes.length} documents</span>
        </div>

        {selectedFolder === "settings" ? (
             <div className="flex-1 overflow-y-auto p-6 bg-background">
                <SettingsView onWorkspaceChanged={refreshWorkspace} />
             </div>
        ) : (
            <NoteGrid
              notes={notes}
              viewMode={viewMode}
              onOpenNote={(id) => setActiveNoteId(id)}
              onDelete={async (id) => {
                 const note = notes.find(n => n.id === id);
                 if (note) await deleteNote(note.path);
              }}
              onToggleStar={async (id) => {
                 const note = notes.find(n => n.id === id);
                 if (note) await toggleStar(note.path, !note.isStarred);
              }}
            />
        )}
      </div>
    </AppShell>
  );
}
