"use client";

import { useState } from "react";
import type { LocalFolderNode } from "../_types/folder.types";

const MOCK_FOLDERS: LocalFolderNode[] = [
  {
    id: "f-1",
    name: "👋 Getting Started",
    path: "/notes/getting-started",
    noteCount: 2,
    isExpanded: true,
    children: [
      {
        id: "f-1-1",
        name: "Quick Tips",
        path: "/notes/getting-started/quick-tips",
        noteCount: 1,
      },
    ],
  },
  {
    id: "f-2",
    name: "💻 Projects",
    path: "/notes/projects",
    noteCount: 5,
    isExpanded: false,
    children: [
      {
        id: "f-2-1",
        name: "Markidown Specs",
        path: "/notes/projects/markidown-specs",
        noteCount: 3,
      },
    ],
  },
  {
    id: "f-3",
    name: "📚 Resources & Links",
    path: "/notes/resources",
    noteCount: 3,
  },
];

export function useFolderTree() {
  const [folders, setFolders] = useState<LocalFolderNode[]>(MOCK_FOLDERS);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const toggleExpand = (folderId: string) => {
    const updateRecursive = (nodes: LocalFolderNode[]): LocalFolderNode[] => {
      return nodes.map((node) => {
        if (node.id === folderId) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children) {
          return { ...node, children: updateRecursive(node.children) };
        }
        return node;
      });
    };
    setFolders((prev) => updateRecursive(prev));
  };

  const createSubfolder = (parentId: string, folderName: string) => {
    const newFolder: LocalFolderNode = {
      id: `f-${Date.now()}`,
      name: folderName,
      path: `/notes/${folderName.toLowerCase().replace(/\s+/g, "-")}`,
      noteCount: 0,
    };

    const addRecursive = (nodes: LocalFolderNode[]): LocalFolderNode[] => {
      return nodes.map((node) => {
        if (node.id === parentId) {
          return {
            ...node,
            isExpanded: true,
            children: [...(node.children || []), newFolder],
          };
        }
        if (node.children) {
          return { ...node, children: addRecursive(node.children) };
        }
        return node;
      });
    };

    setFolders((prev) => addRecursive(prev));
  };

  return {
    folders,
    activeFolderId,
    setActiveFolderId,
    toggleExpand,
    createSubfolder,
  };
}
