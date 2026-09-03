"use client";

import { useState, useCallback, useEffect } from "react";
import type { LocalFolderNode } from "../_types/folder.types";
import { workspaceConfig } from "../_lib/workspace-config";
import { isTauri } from "../../home/_lib/note-ipc";
import { invoke } from "@tauri-apps/api/core";

export function useFolderTree() {
  const [folders, setFolders] = useState<LocalFolderNode[]>(() => {
    return workspaceConfig.get().folders || [];
  });
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  useEffect(() => {
    const handleWorkspaceUpdate = () => {
      setFolders(workspaceConfig.get().folders || []);
    };
    window.addEventListener("workspace-updated", handleWorkspaceUpdate);
    return () => {
      window.removeEventListener("workspace-updated", handleWorkspaceUpdate);
    };
  }, []);

  const toggleExpand = (folderId: string) => {
    const updateRecursive = (nodes: LocalFolderNode[]): LocalFolderNode[] =>
      nodes.map((node) => {
        if (node.id === folderId) return { ...node, isExpanded: !node.isExpanded };
        if (node.children) return { ...node, children: updateRecursive(node.children) };
        return node;
      });
    setFolders((prev) => updateRecursive(prev));
  };

  const createSubfolder = useCallback(async (parentId: string, folderName: string) => {
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

    const currentFolders = workspaceConfig.get().folders || [];
    const newFolders = addRecursive(currentFolders);
    
    workspaceConfig.set({ folders: newFolders });
    setFolders(newFolders);

    if (createdFolder && isTauri()) {
      try {
        await invoke("workspace_init", { 
          rootPath: workspaceConfig.get().rootPath, 
          folders: [createdFolder] 
        });
      } catch (e) {
        console.error("Failed to create subfolder on disk:", e);
      }
    }
  }, []);

  /** Add a brand-new top-level folder, persists to config + creates on disk */
  const addFolder = useCallback(async (folderName: string) => {
    const config = workspaceConfig.get();
    const rootPath = config.rootPath;
    const newFolder: LocalFolderNode = {
      id: crypto.randomUUID(),
      name: folderName.trim(),
      path: `${rootPath}/${folderName.trim()}`,
      noteCount: 0,
    };
    const newFolders = [...(config.folders || []), newFolder];
    workspaceConfig.set({ folders: newFolders });
    setFolders(newFolders);

    // Create on disk
    if (isTauri()) {
      try {
        await invoke("workspace_init", { rootPath, folders: [newFolder] });
      } catch (e) {
        console.error("Failed to create folder on disk:", e);
      }
    }
  }, []);

  const renameFolder = useCallback(async (folderId: string, newName: string) => {
    const config = workspaceConfig.get();
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

    const newFolders = renameRecursive(config.folders || [], config.rootPath);
    
    if (oldPath && newPath && oldPath !== newPath) {
      if (isTauri()) {
        try {
          await invoke("folder_rename", { 
            workspacePath: config.rootPath, 
            oldPath, 
            newPath 
          });
        } catch (e) {
          console.error("Failed to rename folder on disk:", e);
          return; // Abort UI update if disk rename fails
        }
      }
      
      workspaceConfig.set({ folders: newFolders });
      setFolders(newFolders);
      
      // Need to reload window to refresh all paths in notes
      window.location.reload();
    }
  }, []);

  return {
    folders,
    activeFolderId,
    setActiveFolderId,
    toggleExpand,
    createSubfolder,
    addFolder,
    renameFolder,
  };
}
