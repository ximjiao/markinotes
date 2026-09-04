import { create } from "zustand";
import type { LocalFolderNode } from "../features/workspace/_types/folder.types";
import type { WorkspaceFolderInfo } from "../features/home/_types/home.types";
import { workspaceConfig } from "../features/workspace/_lib/workspace-config";
import { noteIpc, isTauri } from "../features/home/_lib/note-ipc";
import { invoke } from "@tauri-apps/api/core";

interface WorkspaceState {
  workspace: WorkspaceFolderInfo | null;
  folders: LocalFolderNode[];
  allTags: string[];
  isConfigLoaded: boolean;

  // Actions
  initWorkspace: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  toggleExpand: (folderId: string) => void;
  addFolder: (folderName: string) => Promise<void>;
  createSubfolder: (parentId: string, folderName: string) => Promise<void>;
  renameFolder: (folderId: string, newName: string) => Promise<void>;
  setAllTags: (tags: string[]) => void;
  setTotalNotes: (count: number) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()((set, get) => ({
  workspace: null,
  folders: [],
  allTags: [],
  isConfigLoaded: false,

  initWorkspace: async () => {
    const config = workspaceConfig.get();
    if (config.setupDone && config.rootPath) {
      const currentFolders = config.folders || [];
      const ws: WorkspaceFolderInfo = {
        name: config.name,
        path: config.rootPath,
        folders: currentFolders,
        totalNotes: 0,
      };

      set({
        workspace: ws,
        folders: currentFolders,
        isConfigLoaded: true,
      });

      try {
        const tags = await noteIpc.getAllTags(config.rootPath);
        set({ allTags: tags });
      } catch (e) {
        console.error("Failed to load workspace tags:", e);
      }
    } else {
      set({
        workspace: null,
        folders: [],
        allTags: [],
        isConfigLoaded: true,
      });
    }
  },

  refreshWorkspace: async () => {
    await get().initWorkspace();
  },

  toggleExpand: (folderId: string) => {
    const updateRecursive = (nodes: LocalFolderNode[]): LocalFolderNode[] =>
      nodes.map((node) => {
        if (node.id === folderId) return { ...node, isExpanded: !node.isExpanded };
        if (node.children) return { ...node, children: updateRecursive(node.children) };
        return node;
      });

    set((state) => {
      const newFolders = updateRecursive(state.folders);
      return {
        folders: newFolders,
        workspace: state.workspace ? { ...state.workspace, folders: newFolders } : null,
      };
    });
  },

  addFolder: async (folderName: string) => {
    const config = workspaceConfig.get();
    const rootPath = config.rootPath;
    if (!rootPath) return;

    const newFolder: LocalFolderNode = {
      id: crypto.randomUUID(),
      name: folderName.trim(),
      path: `${rootPath}/${folderName.trim()}`,
      noteCount: 0,
    };
    const newFolders = [...(config.folders || []), newFolder];

    workspaceConfig.set({ folders: newFolders });
    set((state) => ({
      folders: newFolders,
      workspace: state.workspace ? { ...state.workspace, folders: newFolders } : null,
    }));

    if (isTauri()) {
      try {
        await invoke("workspace_init", { rootPath, folders: [newFolder] });
      } catch (e) {
        console.error("Failed to create folder on disk:", e);
      }
    }
  },

  createSubfolder: async (parentId: string, folderName: string) => {
    const config = workspaceConfig.get();
    const rootPath = config.rootPath;
    if (!rootPath) return;

    const newFolderId = crypto.randomUUID();
    let createdFolder: LocalFolderNode | null = null;

    const addRecursive = (nodes: LocalFolderNode[]): LocalFolderNode[] =>
      nodes.map((node) => {
        if (node.id === parentId) {
          createdFolder = {
            id: newFolderId,
            name: folderName.trim(),
            path: `${node.path}/${folderName.trim()}`,
            noteCount: 0,
          };
          return { ...node, isExpanded: true, children: [...(node.children || []), createdFolder] };
        }
        if (node.children) return { ...node, children: addRecursive(node.children) };
        return node;
      });

    const currentFolders = config.folders || [];
    const newFolders = addRecursive(currentFolders);

    workspaceConfig.set({ folders: newFolders });
    set((state) => ({
      folders: newFolders,
      workspace: state.workspace ? { ...state.workspace, folders: newFolders } : null,
    }));

    if (createdFolder && isTauri()) {
      try {
        await invoke("workspace_init", {
          rootPath,
          folders: [createdFolder],
        });
      } catch (e) {
        console.error("Failed to create subfolder on disk:", e);
      }
    }
  },

  renameFolder: async (folderId: string, newName: string) => {
    const config = workspaceConfig.get();
    const rootPath = config.rootPath;
    if (!rootPath) return;

    let oldPath = "";
    let newPath = "";

    const renameRecursive = (nodes: LocalFolderNode[], parentPath: string): LocalFolderNode[] => {
      return nodes.map((node) => {
        let currentPath = `${parentPath}/${node.name}`;
        if (node.id === folderId) {
          oldPath = node.path;
          newPath = `${parentPath}/${newName}`;
          const renamedNode = { ...node, name: newName, path: newPath };
          if (node.children) {
            renamedNode.children = renameRecursive(node.children, newPath);
          }
          return renamedNode;
        }

        const childNode = { ...node, path: currentPath };
        if (node.children) {
          childNode.children = renameRecursive(node.children, currentPath);
        }
        return childNode;
      });
    };

    const newFolders = renameRecursive(config.folders || [], rootPath);

    if (oldPath && newPath && oldPath !== newPath) {
      if (isTauri()) {
        try {
          await invoke("folder_rename", {
            workspacePath: rootPath,
            oldPath,
            newPath,
          });
        } catch (e) {
          console.error("Failed to rename folder on disk:", e);
          return;
        }
      }

      workspaceConfig.set({ folders: newFolders });
      set((state) => ({
        folders: newFolders,
        workspace: state.workspace ? { ...state.workspace, folders: newFolders } : null,
      }));

      // Reload to ensure all notes query the updated path from SQLite
      window.location.reload();
    }
  },

  setAllTags: (allTags: string[]) => set({ allTags }),
  setTotalNotes: (totalNotes: number) =>
    set((state) => ({
      workspace: state.workspace ? { ...state.workspace, totalNotes } : null,
    })),
}));
