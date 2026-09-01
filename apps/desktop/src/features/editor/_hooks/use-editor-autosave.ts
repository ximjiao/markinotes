"use client";

import { useState } from "react";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function useEditorAutosave() {
  const [saveStatus] = useState<SaveStatus>("idle");

  return {
    saveStatus,
  };
}
