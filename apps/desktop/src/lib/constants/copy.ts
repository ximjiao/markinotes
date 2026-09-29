/**
 * Centralized UI Copywriting Dictionary (Single Source of Truth)
 * 
 * Provides type-safe constants for all UI strings across Markinotes.
 * Facilitates consistent tone-of-voice, simple refactoring, and i18n readiness.
 */

export const UI_COPY = {
  // Common reusable actions across cards, lists, menus, and toolbars
  actions: {
    open: "Open",
    openNote: "Open Note",
    showInFolder: "Show in Folder",
    move: "Move",
    export: "Export",
    star: "Star",
    unstar: "Unstar",
    delete: "Delete",
    duplicate: "Duplicate",
    rename: "Rename",
    save: "Save",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    confirm: "Confirm",
    create: "Create",
    search: "Search",
    clear: "Clear",
    close: "Close",
  },

  // Home Dashboard and Navigation
  home: {
    recents: "Recents",
    starred: "Starred",
    drafts: "Drafts",
    templates: "Templates",
    organizeWithAi: "Organize with AI",
    searchPlaceholder: "Search notes...",
    emptyNotes: "No notes found",
    documentsCount: (count: number) => `${count} ${count === 1 ? "document" : "documents"}`,
  },

  // Kanban Board Feature
  kanban: {
    searchPlaceholder: "Search in board...",
    filterByTag: "Filter by Tag",
    filterByFolder: "Filter by Folder",
    allFolders: "All Folders",
    tags: "Tags",
    folder: "Folder",
    noTags: "No tags in notes",
    manageStatuses: "Manage Statuses",
    addColumn: "Add Column",
    addCard: "Add task",
    untitledColumn: "Untitled Column",
    noCards: "No cards",
  },

  // Editor and Block View
  editor: {
    untitledNote: "Untitled Note",
    toc: {
      title: "Table of Contents",
      empty: "Table of contents is empty. Add headings to generate outline.",
      deleteTitle: "Delete Table of Contents",
    },
  },
} as const;

export type UICopy = typeof UI_COPY;
