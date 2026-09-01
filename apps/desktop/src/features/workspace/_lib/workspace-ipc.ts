import type { WorkspaceFolder } from "../_types/workspace.types";

export async function scanWorkspaceRoot(rootPath: string): Promise<WorkspaceFolder[]> {
  // Placeholder for Tauri IPC call
  return [
    {
      path: rootPath,
      name: "Root Workspace",
      children: [],
    },
  ];
}
