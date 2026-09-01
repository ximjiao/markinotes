"use client";

import React from "react";
import { useHomeData } from "../_hooks/use-home-data";
import { HomeHeader } from "./home-header";
import { HomeSidebar } from "./home-sidebar";
import { NoteGrid } from "./note-grid";
import { OnboardingView } from "./onboarding-view";
import { AppShell } from "@/components/shared";

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

  if (!workspace) {
    return (
      <OnboardingView
        onSelectFolder={() =>
          setWorkspace({ name: "My Workspace", path: "~/Documents/Notes", totalNotes: 4 })
        }
      />
    );
  }

  return (
    <AppShell
      sidebar={<HomeSidebar selectedView={selectedFolder} onSelectView={setSelectedFolder} />}
      header={
        <HomeHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNewNote={() => console.log("New Note")}
        />
      }
    >
      <div className="flex flex-col flex-1 h-full overflow-hidden bg-background">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold text-txt-primary capitalize">{selectedFolder}</h2>
          <span className="text-xs text-txt-muted">{notes.length} documents</span>
        </div>

        <NoteGrid notes={notes} viewMode={viewMode} />
      </div>
    </AppShell>
  );
}
