"use client";

import React, { useEffect } from "react";
import { ArrowLeft, LayoutGrid, List, Sparkles } from "lucide-react";
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
import { noteIpc, isTauri } from "../_lib/note-ipc";
import { workspaceConfig } from "@features/workspace/_lib/workspace-config";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceStore, useNotesStore, useUiStore } from "@/stores";

export function HomeDashboard() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const isConfigLoaded = useWorkspaceStore((s) => s.isConfigLoaded);
  const allTags = useWorkspaceStore((s) => s.allTags);
  const initWorkspace = useWorkspaceStore((s) => s.initWorkspace);
  const refreshWorkspace = useWorkspaceStore((s) => s.refreshWorkspace);

  const notes = useNotesStore((s) => s.notes);
  const selectedFolder = useNotesStore((s) => s.selectedFolder);
  const setSelectedFolder = useNotesStore((s) => s.setSelectedFolder);
  const searchQuery = useNotesStore((s) => s.searchQuery);
  const viewMode = useNotesStore((s) => s.viewMode);
  const setViewMode = useNotesStore((s) => s.setViewMode);

  const activeNoteRef = useNotesStore((s) => s.activeNoteRef);
  const activeNoteContent = useNotesStore((s) => s.activeNoteContent);
  const isContentLoading = useNotesStore((s) => s.isContentLoading);

  const loadNotes = useNotesStore((s) => s.loadNotes);
  const openNote = useNotesStore((s) => s.openNote);
  const closeNote = useNotesStore((s) => s.closeNote);
  const createNote = useNotesStore((s) => s.createNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const toggleStar = useNotesStore((s) => s.toggleStar);
  const moveNote = useNotesStore((s) => s.moveNote);

  const isTemplateDialogOpen = useUiStore((s) => s.isTemplateDialogOpen);
  const setTemplateDialogOpen = useUiStore((s) => s.setTemplateDialogOpen);
  const movingNoteId = useUiStore((s) => s.movingNoteId);
  const setMovingNoteId = useUiStore((s) => s.setMovingNoteId);
  const aiOrganizeDialog = useUiStore((s) => s.aiOrganizeDialog);
  const setAiOrganizeDialog = useUiStore((s) => s.setAiOrganizeDialog);

  // Initialize workspace on mount
  useEffect(() => {
    initWorkspace();
  }, [initWorkspace]);

  // Load notes whenever workspace path changes
  useEffect(() => {
    if (workspace?.path) {
      loadNotes(workspace.path);
    }
  }, [workspace?.path, loadNotes]);

  const movingNote = movingNoteId ? notes.find((n) => n.id === movingNoteId) : undefined;
  const activeNote = activeNoteRef ? (notes.find((n) => n.id === activeNoteRef.id) ?? activeNoteRef) : undefined;

  // Filter notes based on current view & search query
  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      !searchQuery ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.excerpt.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFolder === "recents") return true;
    if (selectedFolder === "starred") return !!note.isStarred;
    if (selectedFolder === "settings") return false;
    if (selectedFolder === "drafts") return note.path.startsWith(`${workspace?.path}/Drafts`);
    if (selectedFolder.startsWith("tag:")) {
      const targetTag = selectedFolder.split(":")[1]?.toLowerCase();
      return note.tags?.some((t) => t.toLowerCase() === targetTag);
    }
    return note.path.startsWith(selectedFolder);
  });

  if (!isConfigLoaded) {
    return <div className="h-screen w-screen bg-background" />;
  }

  if (!workspace) {
    return <OnboardingView onSelectFolder={refreshWorkspace} />;
  }

  // ─── Fullscreen Editor ───
  if (activeNoteRef && !isContentLoading) {
    const note = activeNote;
    return (
      <div className="fixed inset-0 z-50 flex flex-col h-screen w-screen bg-background overflow-hidden">
        <NovelEditor
          key={activeNoteRef.id}
          noteId={note?.id}
          workspacePath={workspace?.path}
          initialTitle={note?.title || "Untitled"}
          initialContent={activeNoteContent || `# ${note?.title || "Untitled"}\n\n`}
          initialTags={(note as any)?.tags || []}
          allWorkspaceTags={allTags}
          onBack={closeNote}
          onSave={(title, content, tags) => {
            if (note && workspace?.path) {
              updateNote(workspace.path, note.path, title, content, tags);
            }
          }}
        />
      </div>
    );
  }

  // Show loading spinner while content loads
  if (activeNoteRef && isContentLoading) {
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

  const getSelectedFolderNode = () => {
    let foundFolder: any = null;
    const findRecursive = (folders: any[]) => {
      for (const f of folders) {
        if (f.id === selectedFolder || f.path === selectedFolder) {
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
    if (!workspace) return;
    let folderPath = workspace.folders[0]?.path || workspace.path;
    if (
      selectedFolder !== "recents" &&
      selectedFolder !== "starred" &&
      selectedFolder !== "templates" &&
      selectedFolder !== "drafts"
    ) {
      const folder = getSelectedFolderNode();
      if (folder) folderPath = folder.path;
    } else {
      folderPath = `${workspace.path}/Drafts`;
    }

    const newNote = await createNote(workspace.path, folderPath, "Untitled Note");
    if (newNote) {
      refreshWorkspace();
      openNote(newNote.id, newNote.path, newNote.title);
    }
  };

  const handleUseTemplate = async (template: NoteTemplate) => {
    if (!workspace) return;
    const content = template.content.replace(
      /{{date}}/g,
      new Date().toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    );

    const folderPath = `${workspace.path}/Drafts`;
    const newNote = await createNote(workspace.path, folderPath, `Untitled ${template.title}`);
    if (newNote) {
      await updateNote(workspace.path, newNote.path, `Untitled ${template.title}`, content, []);
      refreshWorkspace();
      openNote(newNote.id, newNote.path, `Untitled ${template.title}`);
    }
  };

  const handleOrganizeAI = async () => {
    if (notes.length === 0 || !workspace) return;
    setAiOrganizeDialog({ isOpen: true, isLoading: true, suggestions: {} });
    try {
      const draftTitles = notes.map((n) => ({ id: n.id, title: n.title }));
      const availableFolders = workspace?.folders?.map((f) => ({ id: f.id, name: f.name, path: f.path })) || [];

      const config = workspaceConfig.get();
      const suggestionsStr = await noteIpc.organizeDrafts(
        workspace.path,
        JSON.stringify(draftTitles),
        JSON.stringify(availableFolders),
        config.aiApiKey || config.geminiApiKey,
        config.aiModel || config.geminiModel,
        config.aiProvider
      );

      const suggestions = JSON.parse(suggestionsStr);
      setAiOrganizeDialog({ isOpen: true, isLoading: false, suggestions });
    } catch (error: any) {
      console.error(error);
      setAiOrganizeDialog({ isOpen: false, isLoading: false, suggestions: {} });
      alert(error.toString() || "Failed to get suggestions.");
    }
  };

  const handleConfirmOrganize = async (approvedMoves: any) => {
    if (!workspace) return;

    // 1. Process creations
    if (approvedMoves.creates && isTauri()) {
      const config = workspaceConfig.get();
      const newFolders = [...(config.folders || [])];
      let hasNewFolders = false;

      const uniqueNewNames = Array.from(new Set(Object.values(approvedMoves.creates))) as string[];

      for (const folderName of uniqueNewNames) {
        const sanitized = folderName.trim().replace(/\//g, "-");
        if (!sanitized) continue;
        const newPath = `${workspace.path}/${sanitized}`;

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
      for (const [noteId, newPath] of Object.entries(approvedMoves.moves) as [string, string][]) {
        const note = notes.find((n) => n.id === noteId);
        if (note) {
          await moveNote(workspace.path, note.path, newPath);
        }
      }
    }

    // 3. Process moves into newly created folders
    if (approvedMoves.creates) {
      for (const [noteId, newFolderName] of Object.entries(approvedMoves.creates) as [string, string][]) {
        const note = notes.find((n) => n.id === noteId);
        if (note) {
          const sanitized = newFolderName.trim().replace(/\//g, "-");
          const newPath = `${workspace.path}/${sanitized}`;
          await moveNote(workspace.path, note.path, newPath);
        }
      }
    }

    refreshWorkspace();
  };

  const currentFolderName = selectedFolder.startsWith("tag:")
    ? `#${selectedFolder.split(":")[1]}`
    : getSelectedFolderNode()?.name ||
      (selectedFolder === "recents"
        ? "Recents"
        : selectedFolder === "starred"
        ? "Starred"
        : selectedFolder === "drafts"
        ? "Drafts"
        : selectedFolder);

  return (
    <AppShell
      sidebar={
        <HomeSidebar
          onCreateNote={async (folderPath) => {
            if (!workspace) return;
            const newNote = await createNote(workspace.path, folderPath, "Untitled Note");
            if (newNote) openNote(newNote.id, newNote.path, newNote.title);
          }}
        />
      }
      header={<HomeHeader onNewNote={handleNewNote} />}
    >
      <div className="flex flex-col flex-1 h-full overflow-hidden bg-background">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-bold text-txt-primary">{currentFolderName}</h2>
            <span className="text-xs text-txt-muted">{filteredNotes.length} documents</span>
          </div>

          <div className="flex items-center gap-2">
            {selectedFolder === "drafts" && filteredNotes.length > 0 && (
              <Button
                onClick={handleOrganizeAI}
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 font-medium text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:text-purple-700 dark:hover:text-purple-300 transition-colors shadow-xs rounded-lg"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
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
          notes={filteredNotes}
          viewMode={viewMode}
          onOpenNote={(id) => openNote(id)}
          onMove={(id) => setMovingNoteId(id)}
          onDelete={async (id) => {
            if (!workspace) return;
            const note = notes.find((n) => n.id === id);
            if (note) await deleteNote(workspace.path, note.path);
          }}
          onToggleStar={async (id) => {
            if (!workspace) return;
            const note = notes.find((n) => n.id === id);
            if (note) await toggleStar(workspace.path, note.path, !note.isStarred);
          }}
          onExport={async (id) => {
            const note = notes.find((n) => n.id === id);
            if (note) {
              const content = await noteIpc.read(note.path);
              const doc: any = {
                id: note.id,
                path: note.path,
                content: content || "",
                frontmatter: { title: note.title },
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
        workspacePath={workspace?.path}
      />

      {movingNoteId && movingNote && (
        <MoveNoteDialog
          isOpen={!!movingNoteId}
          onClose={() => setMovingNoteId(null)}
          noteTitle={movingNote.title}
          folders={workspace?.folders || []}
          onMove={async (folderPath) => {
            if (!workspace) return;
            await moveNote(workspace.path, movingNote.path, folderPath);
            setMovingNoteId(null);
          }}
        />
      )}

      <AIOrganizeDialog
        isOpen={aiOrganizeDialog.isOpen}
        onClose={() => setAiOrganizeDialog({ isOpen: false })}
        isLoading={aiOrganizeDialog.isLoading}
        suggestions={aiOrganizeDialog.suggestions}
        draftTitles={notes.map((n) => ({ id: n.id, title: n.title }))}
        onConfirm={handleConfirmOrganize}
      />
    </AppShell>
  );
}
