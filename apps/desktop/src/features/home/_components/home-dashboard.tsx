"use client";

import React, { useState } from "react";
import { useHomeData } from "../_hooks/use-home-data";
import { HomeHeader } from "./home-header";
import { HomeSidebar } from "./home-sidebar";
import { NoteGrid } from "./note-grid";
import { OnboardingView } from "./onboarding-view";
import { AppShell } from "@/components/shared";
import { NovelEditor } from "@features/editor";

export function HomeDashboard() {
  const {
    workspace,
    setWorkspace,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    notes,
    selectedFolder,
    setSelectedFolder,
  } = useHomeData();

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const activeNote = notes.find((n) => n.id === activeNoteId);

  if (!workspace) {
    return (
      <OnboardingView
        onSelectFolder={() =>
          setWorkspace({ name: "My Workspace", path: "~/Documents/Notes", totalNotes: 1 })
        }
      />
    );
  }

  // Pure Fullscreen Novel Editor View (Notion Prebuilt Mode)
  if (activeNoteId) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col h-screen w-screen bg-background overflow-hidden">
        <NovelEditor
          initialTitle={activeNote?.title || "Getting Started with Markidown"}
          initialContent={
            activeNote
              ? `# ${activeNote.title}\n\n${activeNote.excerpt}\n\nStart editing this note...`
              : "# New Document\n\nStart typing markdown here..."
          }
          onBack={() => setActiveNoteId(null)}
        />
      </div>
    );
  }

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
          onNewNote={() => setActiveNoteId("new")}
        />
      }
    >
      <div className="flex flex-col flex-1 h-full overflow-hidden bg-background">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold text-txt-primary capitalize">{selectedFolder}</h2>
          <span className="text-xs text-txt-muted">{notes.length} documents</span>
        </div>

        <NoteGrid
          notes={notes}
          viewMode={viewMode}
          onOpenNote={(id) => setActiveNoteId(id)}
        />
      </div>
    </AppShell>
  );
}
