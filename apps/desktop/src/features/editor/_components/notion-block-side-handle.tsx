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
  const [leftPos, setLeftPos] = useState<number>(-40);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [dropIndicatorTop, setDropIndicatorTop] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.view?.dom) return;

    const editorDom = editor.view.dom;

    const BLOCK_SELECTOR = "p, h1, h2, h3, h4, li, blockquote, pre, [data-type='taskItem'], [data-type='imageBlock'], [data-node-view-wrapper], .image-block-node-view, .tableWrapper, table";

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) return;
      try {
        const target = e.target as HTMLElement;
        const blockNode = target.closest(BLOCK_SELECTOR) as HTMLElement | null;
        if (blockNode && editorDom.contains(blockNode)) {
          // If hovered element is inside a table, lock handle to the whole table
          const tableParent = blockNode.closest(".tableWrapper, table") as HTMLElement | null;
          const actualBlock = tableParent || blockNode;

          const editorRect = editorDom.getBoundingClientRect();
          const blockRect = actualBlock.getBoundingClientRect();
          setTopPos(blockRect.top - editorRect.top + 4);
          setLeftPos(blockRect.left - editorRect.left - 40);
          setHoveredElement(actualBlock);
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
    const scrollContainer = editorDom.closest(".overflow-y-auto") as HTMLElement | null;

    let targetBlockElem: HTMLElement | null = null;
    let animFrameId: number | null = null;
    let currentY = startEvent.clientY;
    let currentX = startEvent.clientX;

    setDragPreview({
      x: startEvent.clientX + 10,
      y: startEvent.clientY + 10,
      text: sourceNodeElem.textContent || "Block",
    });

    const BLOCK_SELECTOR = "p, h1, h2, h3, h4, li, blockquote, pre, [data-type='taskItem'], [data-type='imageBlock'], [data-node-view-wrapper], .image-block-node-view, .tableWrapper, table";

    const performAutoScroll = () => {
      if (!scrollContainer) return;
      const containerRect = scrollContainer.getBoundingClientRect();
      const topThreshold = containerRect.top + 80;
      const bottomThreshold = containerRect.bottom - 80;

      let scrolled = false;
      if (currentY < topThreshold) {
        const speed = Math.max(3, (topThreshold - currentY) / 3);
        scrollContainer.scrollTop -= speed;
        scrolled = true;
      } else if (currentY > bottomThreshold) {
        const speed = Math.max(3, (currentY - bottomThreshold) / 3);
        scrollContainer.scrollTop += speed;
        scrolled = true;
      }

      if (scrolled) {
        try {
          const editorRectCurrent = editorDom.getBoundingClientRect();
          const targetX = Math.max(editorRectCurrent.left + 40, Math.min(editorRectCurrent.right - 40, currentX));
          const elemBelow = document.elementFromPoint(targetX, currentY) as HTMLElement | null;
          const targetBlock = elemBelow?.closest(BLOCK_SELECTOR) as HTMLElement | null;

          if (targetBlock && editorDom.contains(targetBlock) && targetBlock !== sourceNodeElem) {
            const blockRect = targetBlock.getBoundingClientRect();
            setDropIndicatorTop(blockRect.bottom - editorRectCurrent.top);
            targetBlockElem = targetBlock;
          }
        } catch {
          // Safe fallback
        }

        animFrameId = requestAnimationFrame(performAutoScroll);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      currentY = e.clientY;
      currentX = e.clientX;
      try {
        setDragPreview({
          x: e.clientX + 10,
          y: e.clientY + 10,
          text: sourceNodeElem.textContent || "Block",
        });

        const editorRectCurrent = editorDom.getBoundingClientRect();
        const targetX = Math.max(editorRectCurrent.left + 40, Math.min(editorRectCurrent.right - 40, e.clientX));
        const elemBelow = document.elementFromPoint(targetX, e.clientY) as HTMLElement | null;
        const targetBlock = elemBelow?.closest(BLOCK_SELECTOR) as HTMLElement | null;

        if (targetBlock && editorDom.contains(targetBlock) && targetBlock !== sourceNodeElem) {
          const blockRect = targetBlock.getBoundingClientRect();
          setDropIndicatorTop(blockRect.bottom - editorRectCurrent.top);
          targetBlockElem = targetBlock;
        }

        if (animFrameId) cancelAnimationFrame(animFrameId);
        animFrameId = requestAnimationFrame(performAutoScroll);
      } catch {
        // Safe fallback
      }
    };

    const onPointerUp = () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
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

          const nodeToMove = editor.state.doc.nodeAt(sourceStartPos);
          if (nodeToMove) {
            const isTaskItem =
              targetBlockElem.getAttribute("data-type") === "taskItem" ||
              !!targetBlockElem.closest("[data-type='taskItem']");
            const isListItem =
              targetBlockElem.tagName.toLowerCase() === "li" ||
              !!targetBlockElem.closest("li");

            let finalNode = nodeToMove;
            let targetDepth = 1;

            if (isListItem || isTaskItem) {
              // If dragging any non-list element (Image, Heading, CodeBlock, Table, Paragraph, etc.) into a list or checklist, preserve original node type & split container
              if (nodeToMove.type.name !== "listItem" && nodeToMove.type.name !== "taskItem") {
                const tr = editor.state.tr;
                tr.delete(sourceStartPos, sourceEndPos);
                const rawSplitPos = targetResolved.after(targetResolved.depth);
                const mappedSplitPos = tr.mapping.map(rawSplitPos);
                try {
                  tr.split(mappedSplitPos);
                } catch {}
                const mappedInsertPos = tr.mapping.map(mappedSplitPos);
                tr.insert(mappedInsertPos, nodeToMove);
                editor.view.dispatch(tr);
                return;
              }
              targetDepth = targetResolved.depth > 1 ? targetResolved.depth : 1;
            }

            // If dragging a listItem/taskItem out to a non-list area, unwrap to paragraph
            if ((nodeToMove.type.name === "listItem" || nodeToMove.type.name === "taskItem") && !isListItem && !isTaskItem) {
              if (editor.schema.nodes.paragraph) {
                finalNode = nodeToMove.firstChild || nodeToMove;
              }
            }

            const rawTargetPos = targetResolved.after(targetDepth);
            const tr = editor.state.tr;
            tr.delete(sourceStartPos, sourceEndPos);
            const mappedTargetPos = tr.mapping.map(rawTargetPos);

            try {
              tr.insert(mappedTargetPos, finalNode);
              editor.view.dispatch(tr);
            } catch (err) {
              console.error("Drag transaction insert failed:", err);
            }
          }
        } catch (err) {
          console.error("Drag handler error:", err);
        }
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleAddBlockBelow = () => {
    try {
      if (!editor || editor.isDestroyed || !hoveredElement) return;

      // Prevent spamming '/' lines if current line is already an unselected '/' line
      if (hoveredElement.textContent?.trim() === "/") {
        editor.chain().focus().run();
        return;
      }

      const domPos = editor.view.posAtDOM(hoveredElement, 0);
      const resolvedPos = editor.state.doc.resolve(domPos);
      const posBelow = resolvedPos.after(1);

      editor
        .chain()
        .focus()
        .insertContentAt(posBelow, {
          type: "paragraph",
          content: [{ type: "text", text: "/" }],
        })
        .setTextSelection(posBelow + 2)
        .run();
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
        className="absolute flex items-center gap-0.5 transition-all duration-100 z-20 opacity-60 hover:opacity-100 select-none"
        style={{ top: `${topPos}px`, left: `${leftPos}px` }}
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
