"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, LayoutGrid, List } from "lucide-react";
import { useHomeData } from "../_hooks/use-home-data";
import { HomeHeader } from "./home-header";
import { HomeSidebar } from "./home-sidebar";
import { NoteGrid } from "./note-grid";
import { OnboardingView } from "./onboarding-view";
import { AppShell } from "@/components/shared";
import { NovelEditor } from "@features/editor";
import { SettingsView } from "../../settings/_components/settings-view";
import { MoveNoteDialog } from "./move-note-dialog";
import { TemplateDialog } from "./template-dialog";
import type { NoteTemplate } from "../_lib/templates-data";
import { Button } from "@/components/ui/button";
import { exportDocument } from "@features/editor/_lib/export-engine";

import { AIOrganizeDialog } from "./ai-organize-dialog";
import { Sparkles } from "lucide-react";
import { noteIpc, isTauri } from "../_lib/note-ipc";
import { workspaceConfig } from "@features/workspace/_lib/workspace-config";
import { invoke } from "@tauri-apps/api/core";

export interface AIOrganizeResponse {
  moves?: { [noteId: string]: string };
  creates?: { [noteId: string]: string };
}

export function HomeDashboard() {
  const {
    workspace,
    isConfigLoaded,
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
    readNoteContent,
    loadNotes,
    moveNote,
    allTags,
  } = useHomeData();

  const [activeNoteRef, setActiveNoteRef] = useState<{id: string, path: string, title: string} | null>(null);
  const [activeNoteContent, setActiveNoteContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState(false);
  const [movingNoteId, setMovingNoteId] = useState<string | null>(null);
  const [isTemplateDialogOpen, setTemplateDialogOpen] = useState(false);
  
  // AI Organize state
  const [aiDialogState, setAiDialogState] = useState<{ isOpen: boolean; isLoading: boolean; suggestions: AIOrganizeResponse }>({
    isOpen: false,
    isLoading: false,
    suggestions: {}
  });

  // Fallback to activeNoteRef if not in the current filtered list
  const activeNote = activeNoteRef ? (notes.find((n) => n.id === activeNoteRef.id) ?? activeNoteRef) : undefined;
  const movingNote = movingNoteId ? notes.find((n) => n.id === movingNoteId) : undefined;

  // Load full .md content when a note is opened
  useEffect(() => {
    if (!activeNoteRef) {
      setActiveNoteContent("");
      return;
    }
    
    setContentLoading(true);
    readNoteContent(activeNoteRef.path)
      .then((content) => {
        setActiveNoteContent(content || `# ${activeNoteRef.title}\n\n`);
      })
      .finally(() => setContentLoading(false));
  }, [activeNoteRef?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openNote = (id: string, fallbackPath?: string, fallbackTitle?: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      setActiveNoteRef({ id: note.id, path: note.path, title: note.title });
    } else if (fallbackPath) {
      setActiveNoteRef({ id, path: fallbackPath, title: fallbackTitle || "Untitled" });
    }
  };

  const closeNote = () => {
    setActiveNoteRef(null);
    setActiveNoteContent("");
    // Refresh note list to pick up any title/excerpt changes saved to SQLite
    loadNotes();
  };


  if (!isConfigLoaded) {
    // Render an empty shell while config is checking (prevents onboarding flash)
    return <div className="h-screen w-screen bg-background" />;
  }

  if (!workspace) {
    return <OnboardingView onSelectFolder={refreshWorkspace} />;
  }

  // ─── Fullscreen Editor ───
  if (activeNoteRef && !contentLoading) {
    const note = activeNote;
    return (
      <div className="fixed inset-0 z-50 flex flex-col h-screen w-screen bg-background overflow-hidden">
        <NovelEditor
          noteId={note?.id}
          workspacePath={workspace?.path}
          initialTitle={note?.title || "Untitled"}
          initialContent={activeNoteContent || `# ${note?.title || "Untitled"}\n\n`}
          initialTags={(note as any)?.tags || []}
          allWorkspaceTags={allTags}
          onBack={closeNote}
          onSave={(title, content, tags) => {
            if (note) updateNote(note.path, title, content, tags);
          }}
        />
      </div>
    );
  }

  // Show loading spinner while content loads
  if (activeNoteRef && contentLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-sm text-txt-muted animate-pulse">Opening note…</div>
      </div>
    );
  }

  // ─── Fullscreen Settings ───
  if (selectedFolder === "settings") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col h-screen w-screen bg-background overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border shrink-0 bg-background">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFolder("recents")}
            className="gap-1.5 text-txt-secondary hover:text-txt-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <span className="text-sm font-semibold text-txt-primary">Settings</span>
        </div>
        <div className="flex-1 overflow-y-auto p-8 bg-background">
          <SettingsView onWorkspaceChanged={refreshWorkspace} />
        </div>
      </div>
    );
  }

  const getSelectedFolder = () => {
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
    return foundFolder;
  };

  const handleNewNote = async () => {
    let folderPath = workspace.folders[0]?.path || workspace.path;
    if (selectedFolder !== "recents" && selectedFolder !== "starred" && selectedFolder !== "templates") {
      const folder = getSelectedFolder();
      if (folder) folderPath = folder.path;
    } else {
      // Fallback for Recents/Starred/Templates: Place in 'Drafts' at the root of the workspace
      folderPath = `${workspace.path}/Drafts`;
    }
    const newNote = await createNote(folderPath, "Untitled Note");
    if (newNote) {
      // We trigger refreshWorkspace so the Drafts folder shows up in the sidebar if it was just created
      refreshWorkspace();
      openNote(newNote.id, newNote.path, newNote.title);
    }
  };

  const handleUseTemplate = async (template: NoteTemplate) => {
    // Generate actual content with variables replaced
    const content = template.content.replace(/{{date}}/g, new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }));
    
    // Always create templates in Drafts by default, or the current selected folder
    let folderPath = `${workspace.path}/Drafts`;
    const newNote = await createNote(folderPath, `Untitled ${template.title}`);
    if (newNote) {
      await updateNote(newNote.path, `Untitled ${template.title}`, content, []);
      refreshWorkspace();
      // Load notes again to reflect the update before opening
      await loadNotes();
      openNote(newNote.id, newNote.path, `Untitled ${template.title}`);
    }
  };

  const handleOrganizeAI = async () => {
    if (notes.length === 0 || !workspace) return;
    setAiDialogState({ isOpen: true, isLoading: true, suggestions: {} });
    try {
      const draftTitles = notes.map(n => ({ id: n.id, title: n.title }));
      const availableFolders = workspace?.folders?.map(f => ({ id: f.id, name: f.name, path: f.path })) || [];
      
      const config = workspaceConfig.get();
      const suggestionsStr = await noteIpc.organizeDrafts(
        workspace.path,
        JSON.stringify(draftTitles),
        JSON.stringify(availableFolders),
        config.geminiApiKey,
        config.geminiModel
      );
      
      const suggestions: AIOrganizeResponse = JSON.parse(suggestionsStr);
      setAiDialogState({ isOpen: true, isLoading: false, suggestions });
    } catch (error: any) {
      console.error(error);
      setAiDialogState({ isOpen: false, isLoading: false, suggestions: {} });
      alert(error.toString() || "Failed to get suggestions.");
    }
  };

  const handleConfirmOrganize = async (approvedMoves: AIOrganizeResponse) => {
    // 1. Process creations
    if (approvedMoves.creates && isTauri()) {
      const config = workspaceConfig.get();
      const newFolders = [...(config.folders || [])];
      let hasNewFolders = false;

      // Unique new folder names to avoid creating duplicates if AI suggests same name for multiple drafts
      const uniqueNewNames = Array.from(new Set(Object.values(approvedMoves.creates)));
      
      for (const folderName of uniqueNewNames) {
        const sanitized = folderName.trim().replace(/\//g, "-");
        if (!sanitized) continue;
        const newPath = `${workspace.path}/${sanitized}`;
        
        // Add to config
        newFolders.push({
          id: crypto.randomUUID(),
          name: sanitized,
          path: newPath,
          noteCount: 0,
        });
        hasNewFolders = true;
      }

      if (hasNewFolders) {
        workspaceConfig.set({ folders: newFolders });
        try {
          await invoke("workspace_init", { rootPath: workspace.path, folders: newFolders });
        } catch (e) {
          console.error("Failed to create new folders on disk:", e);
        }
      }
    }

    // 2. Process moves
    if (approvedMoves.moves) {
      for (const [noteId, newPath] of Object.entries(approvedMoves.moves)) {
        const note = notes.find(n => n.id === noteId);
        if (note) {
          await moveNote(note.path, newPath);
        }
      }
    }
    
    // 3. Process moves into newly created folders
    if (approvedMoves.creates) {
      for (const [noteId, newFolderName] of Object.entries(approvedMoves.creates)) {
        const note = notes.find(n => n.id === noteId);
        if (note) {
          const sanitized = newFolderName.trim().replace(/\//g, "-");
          const newPath = `${workspace.path}/${sanitized}`;
          await moveNote(note.path, newPath);
        }
      }
    }

    refreshWorkspace();
  };

  const currentFolderName = selectedFolder.startsWith("tag:")
    ? `#${selectedFolder.split(":")[1]}`
    : getSelectedFolder()?.name ||
      (selectedFolder === "recents" ? "Recents" : selectedFolder === "starred" ? "Starred" : selectedFolder === "drafts" ? "Drafts" : selectedFolder);

  // ─── Standard Dashboard ───
  return (
    <AppShell
      sidebar={
        <HomeSidebar
          selectedView={selectedFolder}
          allTags={allTags}
          onSelectView={(v) => {
            setSelectedFolder(v);
            setActiveNoteRef(null);
          }}
          onCreateNote={async (folderPath) => {
            const newNote = await createNote(folderPath, "Untitled Note");
            if (newNote) openNote(newNote.id, newNote.path, newNote.title);
          }}
          onOpenTemplates={() => setTemplateDialogOpen(true)}
        />
      }
      header={
        <HomeHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewNote={handleNewNote}
          onOpenTemplates={() => setTemplateDialogOpen(true)}
        />
      }
    >
      <div className="flex flex-col flex-1 h-full overflow-hidden bg-background">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-bold text-txt-primary">{currentFolderName}</h2>
            <span className="text-xs text-txt-muted">{notes.length} documents</span>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedFolder === "drafts" && notes.length > 0 && (
              <Button onClick={handleOrganizeAI} variant="outline" size="sm" className="h-7 text-xs gap-1.5 text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-700">
                <Sparkles className="h-3.5 w-3.5" />
                Organize with AI
              </Button>
            )}
            <div className="flex items-center border border-border rounded-lg p-0.5 bg-accent/30">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setViewMode("list")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
          </div>
        </div>

        <NoteGrid
          notes={notes}
          viewMode={viewMode}
          onOpenNote={openNote}
          onMove={setMovingNoteId}
          onDelete={async (id) => {
            const note = notes.find(n => n.id === id);
            if (note) await deleteNote(note.path);
          }}
          onToggleStar={async (id) => {
            const note = notes.find(n => n.id === id);
            if (note) await toggleStar(note.path, !note.isStarred);
          }}
          onExport={async (id) => {
            const note = notes.find(n => n.id === id);
            if (note) {
              const content = await readNoteContent(note.path);
              const doc: any = {
                id: note.id,
                path: note.path,
                content: content || "",
                frontmatter: { title: note.title }
              };
              exportDocument(doc, "", "md");
            }
          }}
        />
      </div>

      <TemplateDialog 
        isOpen={isTemplateDialogOpen} 
        onClose={() => setTemplateDialogOpen(false)} 
        onSelectTemplate={handleUseTemplate} 
      />

      {movingNoteId && movingNote && (
        <MoveNoteDialog
          isOpen={!!movingNoteId}
          onClose={() => setMovingNoteId(null)}
          noteTitle={movingNote.title}
          folders={workspace?.folders || []}
          onMove={async (folderPath) => {
            await moveNote(movingNote.path, folderPath);
            setMovingNoteId(null);
          }}
        />
      )}

      <AIOrganizeDialog
        isOpen={aiDialogState.isOpen}
        onClose={() => setAiDialogState(prev => ({ ...prev, isOpen: false }))}
        isLoading={aiDialogState.isLoading}
        suggestions={aiDialogState.suggestions}
        draftTitles={notes.map(n => ({ id: n.id, title: n.title }))}
        onConfirm={handleConfirmOrganize}
      />
    </AppShell>
  );
}
