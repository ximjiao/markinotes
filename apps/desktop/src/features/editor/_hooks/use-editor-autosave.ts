"use client";

import { useState } from "react";

export type SaveStatus = "idle" | "dirty" | "streaming" | "saving" | "saved" | "error";

export function useEditorAutosave() {
  const [saveStatus] = useState<SaveStatus>("idle");

  return {
    saveStatus,
  };
}
