"use client";

import { LocalFolderNode } from "../_types/folder.types";

export interface WorkspaceConfig {
  rootPath: string;
  name: string;
  folders: LocalFolderNode[];
  autoSaveMs: number;
  setupDone: boolean;
}

const STORAGE_KEY = "marki_workspace";

const DEFAULT_CONFIG: WorkspaceConfig = {
  rootPath: "",
  name: "My Workspace",
  folders: [],
  autoSaveMs: 1000,
  setupDone: false,
};

export const workspaceConfig = {
  get: (): WorkspaceConfig => {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Failed to load workspace config", e);
    }
    return DEFAULT_CONFIG;
  },

  set: (config: Partial<WorkspaceConfig>) => {
    if (typeof window === "undefined") return;
    try {
      const current = workspaceConfig.get();
      const next = { ...current, ...config };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("Failed to save workspace config", e);
    }
  },

  clear: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  },
};
