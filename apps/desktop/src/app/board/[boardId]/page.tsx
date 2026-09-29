"use client";

import React, { Suspense, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { WhiteboardTopBar } from "@/features/whiteboard/_components/whiteboard-topbar";
import { WhiteboardCanvas } from "@/features/whiteboard/_components/whiteboard-canvas";
import { WhiteboardToolbar } from "@/features/whiteboard/_components/whiteboard-toolbar";
import { useWhiteboardStore } from "@/features/whiteboard/_hooks/use-whiteboard-store";

function BoardContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { setBoardTitle } = useWhiteboardStore();

  const boardId = (params?.boardId as string) || "default";
  const initialTitle = searchParams.get("title");

  useEffect(() => {
    if (initialTitle) {
      setBoardTitle(decodeURIComponent(initialTitle));
    }
  }, [initialTitle, setBoardTitle]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Top Navigation & Multi-Page Bar */}
      <WhiteboardTopBar />

      {/* Infinite Canvas */}
      <WhiteboardCanvas />

      {/* Floating Bottom Toolbar / Dock */}
      <WhiteboardToolbar />
    </main>
  );
}

export default function BoardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-background text-xs text-muted-foreground">
          Loading whiteboard...
        </div>
      }
    >
      <BoardContent />
    </Suspense>
  );
}
