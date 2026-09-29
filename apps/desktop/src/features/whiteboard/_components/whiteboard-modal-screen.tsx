"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { WhiteboardTopBar } from "./whiteboard-topbar";
import { WhiteboardCanvas } from "./whiteboard-canvas";
import { WhiteboardToolbar } from "./whiteboard-toolbar";
import { useWhiteboardStore } from "../_hooks/use-whiteboard-store";
import type { WhiteboardBoardData } from "../_types/whiteboard.types";

interface WhiteboardModalScreenProps {
  isOpen: boolean;
  onClose: () => void;
  initialBoard: WhiteboardBoardData;
  onSave?: (updatedBoard: WhiteboardBoardData) => void;
}

export function WhiteboardModalScreen({
  isOpen,
  onClose,
  initialBoard,
  onSave,
}: WhiteboardModalScreenProps) {
  const { board, setBoard } = useWhiteboardStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setBoard(initialBoard);
    }
  }, [isOpen, initialBoard, setBoard]);

  // Sync back on board changes or close
  const handleClose = () => {
    onSave?.(board);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-screen w-screen overflow-hidden bg-background select-none animate-in fade-in duration-100">
      {/* Top Bar with back/close action */}
      <WhiteboardTopBar onClose={handleClose} />

      {/* Infinite Canvas */}
      <WhiteboardCanvas />

      {/* Bottom FigJam Floating Dock */}
      <WhiteboardToolbar />
    </div>,
    document.body
  );
}
