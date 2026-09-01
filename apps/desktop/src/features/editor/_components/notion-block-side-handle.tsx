"use client";

import React, { useState, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { Plus, GripVertical } from "lucide-react";

interface NotionBlockSideHandleProps {
  editor: Editor | null;
  onOpenSlashMenu: () => void;
}

export function NotionBlockSideHandle({ editor, onOpenSlashMenu }: NotionBlockSideHandleProps) {
  const [topPos, setTopPos] = useState<number | null>(null);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [dropIndicatorTop, setDropIndicatorTop] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.view?.dom) return;

    const editorDom = editor.view.dom;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) return;
      try {
        const target = e.target as HTMLElement;
        const blockNode = target.closest("p, h1, h2, h3, h4, li, blockquote, pre") as HTMLElement | null;
        if (blockNode && editorDom.contains(blockNode)) {
          const editorRect = editorDom.getBoundingClientRect();
          const blockRect = blockNode.getBoundingClientRect();
          setTopPos(blockRect.top - editorRect.top + 4);
          setHoveredElement(blockNode);
        }
      } catch {
        // Safe fallback
      }
    };

    editorDom.addEventListener("mousemove", handleMouseMove);
    return () => editorDom.removeEventListener("mousemove", handleMouseMove);
  }, [editor, isDragging]);

  const handlePointerDown = (startEvent: React.PointerEvent) => {
    if (!editor || editor.isDestroyed || !hoveredElement) return;

    startEvent.preventDefault();
    setIsDragging(true);

    const sourceNodeElem = hoveredElement;
    const editorDom = editor.view.dom;
    const editorRect = editorDom.getBoundingClientRect();

    let targetBlockElem: HTMLElement | null = null;

    setDragPreview({
      x: startEvent.clientX + 10,
      y: startEvent.clientY + 10,
      text: sourceNodeElem.textContent || "Block",
    });

    const onPointerMove = (e: PointerEvent) => {
      try {
        setDragPreview({
          x: e.clientX + 10,
          y: e.clientY + 10,
          text: sourceNodeElem.textContent || "Block",
        });

        const elemBelow = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const targetBlock = elemBelow?.closest("p, h1, h2, h3, h4, li, blockquote, pre") as HTMLElement | null;

        if (targetBlock && editorDom.contains(targetBlock) && targetBlock !== sourceNodeElem) {
          const blockRect = targetBlock.getBoundingClientRect();
          setDropIndicatorTop(blockRect.bottom - editorRect.top);
          targetBlockElem = targetBlock;
        }
      } catch {
        // Safe fallback
      }
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      setDropIndicatorTop(null);
      setDragPreview(null);
      setIsDragging(false);

      if (targetBlockElem && targetBlockElem !== sourceNodeElem) {
        try {
          const sourceDOMPos = editor.view.posAtDOM(sourceNodeElem, 0);
          const targetDOMPos = editor.view.posAtDOM(targetBlockElem, 0);

          const sourceResolved = editor.state.doc.resolve(sourceDOMPos);
          const targetResolved = editor.state.doc.resolve(targetDOMPos);

          const sourceStartPos = sourceResolved.before(1);
          const sourceEndPos = sourceResolved.after(1);
          const targetStartPos = targetResolved.after(1);

          const nodeToMove = editor.state.doc.nodeAt(sourceStartPos);
          if (nodeToMove && sourceStartPos !== targetStartPos) {
            const nodeSize = sourceEndPos - sourceStartPos;
            const insertPos = sourceStartPos < targetStartPos ? Math.max(0, targetStartPos - nodeSize) : targetStartPos;

            const tr = editor.state.tr;
            tr.delete(sourceStartPos, sourceEndPos);
            tr.insert(insertPos, nodeToMove);
            editor.view.dispatch(tr);
          }
        } catch {
          // Safe fallback
        }
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleAddBlockBelow = () => {
    try {
      if (!editor || editor.isDestroyed || !hoveredElement) return;
      const domPos = editor.view.posAtDOM(hoveredElement, 0);
      const resolvedPos = editor.state.doc.resolve(domPos);
      const posBelow = resolvedPos.after(1);

      editor
        .chain()
        .focus()
        .insertContentAt(posBelow, { type: "paragraph" })
        .run();

      onOpenSlashMenu();
    } catch {
      // Safe fallback
    }
  };

  if (!editor || editor.isDestroyed || topPos === null) return null;

  return (
    <>
      {/* Notion Floating Drag Preview Card (Ghost Box) */}
      {dragPreview && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-1.5 rounded-lg border border-border bg-popover/90 text-txt-primary shadow-2xl backdrop-blur text-xs font-medium max-w-xs truncate opacity-80"
          style={{ left: `${dragPreview.x}px`, top: `${dragPreview.y}px` }}
        >
          {dragPreview.text}
        </div>
      )}

      {/* Drop Target Indicator Line */}
      {dropIndicatorTop !== null && (
        <div
          className="absolute left-0 right-0 h-0.5 bg-txt-brand z-30 pointer-events-none transition-all duration-75 shadow-sm"
          style={{ top: `${dropIndicatorTop}px` }}
        />
      )}

      {/* Notion Side Handle (+ and :: Grip) */}
      <div
        className="absolute -left-10 flex items-center gap-0.5 transition-all duration-100 z-20 opacity-60 hover:opacity-100 select-none"
        style={{ top: `${topPos}px` }}
      >
        {/* Plus Button */}
        <button
          type="button"
          onClick={handleAddBlockBelow}
          className="h-5 w-5 flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-accent rounded transition-colors"
          title="Add block below"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        {/* Grip Handle Button */}
        <button
          type="button"
          onPointerDown={handlePointerDown}
          className="h-5 w-4 flex items-center justify-center text-txt-muted hover:text-txt-primary cursor-grab active:cursor-grabbing rounded hover:bg-accent transition-colors"
          title="Hold & drag to move block"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>
    </>
  );
}
