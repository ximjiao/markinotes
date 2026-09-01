"use client";

import { useWorkspaceTree } from "../_hooks/use-workspace-tree";

export function WorkspaceTree() {
  const { folders, isLoading } = useWorkspaceTree();

  if (isLoading) {
    return <div className="p-4 text-xs text-txt-muted">Loading workspace...</div>;
  }

  return (
    <div className="flex flex-col gap-1 p-2 text-txt-primary">
      <span className="text-xs font-semibold text-txt-muted uppercase tracking-wider">
        Workspace
      </span>
      {folders.length === 0 ? (
        <span className="text-xs text-txt-muted italic">No folders found</span>
      ) : (
        folders.map((folder) => (
          <div key={folder.path} className="text-sm py-1 px-2 hover:bg-accent rounded">
            {folder.name}
          </div>
        ))
      )}
    </div>
  );
}
