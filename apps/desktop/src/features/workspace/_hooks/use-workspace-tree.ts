"use client";

import { useState } from "react";
import type { WorkspaceFolder } from "../_types/workspace.types";

export function useWorkspaceTree() {
  const [folders] = useState<WorkspaceFolder[]>([]);
  const [isLoading] = useState<boolean>(false);

  return {
    folders,
    isLoading,
  };
}
