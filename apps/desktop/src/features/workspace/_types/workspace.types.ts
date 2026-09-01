export interface WorkspaceFolder {
  path: string;
  name: string;
  children?: WorkspaceFolder[];
}

export interface WorkspaceState {
  rootPath: string | null;
  folders: WorkspaceFolder[];
  isLoading: boolean;
}
