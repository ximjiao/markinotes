"use client";

import React, { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import {
  Plus,
  GripVertical,
  Search,
  RefreshCw,
  Paintbrush,
  Copy,
  CopyCheck,
  Trash2,
  TableProperties,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code2,
  Type,
  ChevronRight,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Columns3,
  ListTree,
  Table as TableIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  NotionMenuSectionHeader,
  NotionMenuItem,
  NotionMenuSwitchItem,
  NotionMenuSearchInput,
  NotionMenuFooter,
} from "./notion-popover-primitives";
import type { NotionBlockSideHandleProps } from "../_types/editor.types";
import { TABLE_COLORS, TEXT_COLORS, BG_HIGHLIGHTS } from "../_lib/editor-constants";

export function NotionBlockSideHandle({
  editor,
  onOpenSlashMenu,
  gutterOffset = 54,
  clampInsideContainer = false,
}: NotionBlockSideHandleProps) {
  const [topPos, setTopPos] = useState<number | null>(null);
  const [leftPos, setLeftPos] = useState<number>(-gutterOffset);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [dropIndicatorTop, setDropIndicatorTop] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedRecently, setDraggedRecently] = useState(false);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; text: string } | null>(null);
  
  // Menu Popover State
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubmenu, setActiveSubmenu] = useState<"turnInto" | "color" | "align" | "tableHeaderColor" | "tableZebraColor" | null>(null);
  const [copied, setCopied] = useState(false);

  const hoveredElementRef = useRef<HTMLElement | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.view?.dom) return;

    const editorDom = editor.view.dom;
    const BLOCK_SELECTOR = "p, h1, h2, h3, h4, li, blockquote, pre, [data-type='taskItem'], [data-type='imageBlock'], [data-node-view-wrapper], .image-block-node-view, .tableWrapper, table";

    const getContainerRect = () => {
      const parent = (editorDom.closest(".relative") || editorDom.parentElement || editorDom) as HTMLElement;
      return parent.getBoundingClientRect();
    };

    const updatePosition = (block?: HTMLElement | null) => {
      const elem = block || hoveredElementRef.current;
      if (!elem || !editorDom.contains(elem) || isDragging) return;
      const containerRect = getContainerRect();
      const blockRect = elem.getBoundingClientRect();
      setTopPos(blockRect.top - containerRect.top + 4);
      
      const targetLeft = blockRect.left - containerRect.left - gutterOffset;
      setLeftPos(clampInsideContainer ? Math.max(6, targetLeft) : targetLeft);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging || menuOpen) return;
      try {
        const target = e.target as HTMLElement;

        // If cursor is directly on the handle or its child buttons, keep current hover state locked
        if (target.closest(".notion-block-side-handle-container")) {
          return;
        }

        const editorRect = editorDom.getBoundingClientRect();
        const containerRect = getContainerRect();

        // If cursor is in the left gutter / gap area (moving from block to the handle on the left)
        const leftBound = clampInsideContainer ? containerRect.left : editorRect.left - 120;
        if (e.clientX >= leftBound && e.clientX <= editorRect.left + 30) {
          const elemAtY = document.elementFromPoint(editorRect.left + 40, e.clientY) as HTMLElement | null;
          const blockAtY = elemAtY?.closest(BLOCK_SELECTOR) as HTMLElement | null;
          if (blockAtY && editorDom.contains(blockAtY)) {
            const tableParent = blockAtY.closest(".tableWrapper, table") as HTMLElement | null;
            const actualBlock = tableParent || blockAtY;
            hoveredElementRef.current = actualBlock;
            setHoveredElement(actualBlock);
            updatePosition(actualBlock);
            return;
          }
        }

        const blockNode = target.closest(BLOCK_SELECTOR) as HTMLElement | null;
        if (blockNode && editorDom.contains(blockNode)) {
          // If hovered element is inside a table, lock Level 1 handle to the whole table wrapper
          const tableParent = blockNode.closest(".tableWrapper, table") as HTMLElement | null;
          const actualBlock = tableParent || blockNode;

          hoveredElementRef.current = actualBlock;
          setHoveredElement(actualBlock);
          updatePosition(actualBlock);
        }
      } catch {
        // Safe fallback
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("scroll", handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScrollOrResize, { capture: true });
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [editor, isDragging, menuOpen]);

  // Block Helper Utilities
  const getNodeRange = (elem?: HTMLElement | null) => {
    const targetElem = elem || hoveredElement;
    if (!editor || editor.isDestroyed || !targetElem) return null;
    try {
      const editorDom = editor.view.dom;
      if (!editorDom.contains(targetElem)) return null;

      // 1. If inside a table or custom nodeview wrapper (e.g. Kanban or Image), find container
      const tableParent = targetElem.closest(".tableWrapper, table") as HTMLElement | null;
      const nodeViewParent = targetElem.closest("[data-node-view-wrapper], .image-block-node-view") as HTMLElement | null;
      const actualTarget = tableParent || nodeViewParent || targetElem;

      // 2. Find position in ProseMirror doc
      let domPos = 0;
      try {
        domPos = editor.view.posAtDOM(actualTarget, 0);
      } catch {
        return null;
      }

      const doc = editor.state.doc;
      const safePos = Math.max(0, Math.min(domPos, doc.content.size));
      const resolved = doc.resolve(safePos);

      // Case 1: Pos is at doc level (depth 0, e.g. atom nodes like Kanban/Image)
      if (resolved.depth === 0) {
        let node = doc.nodeAt(safePos);
        let from = safePos;
        if (!node && safePos > 0) {
          node = doc.nodeAt(safePos - 1);
          from = safePos - 1;
        }
        if (node) {
          return { from, to: from + node.nodeSize, node, depth: 1, isListChild: false, resolved };
        }
      }

      // Case 2: Pos is inside a block (depth >= 1)
      let targetDepth = 1;
      let isListChild = false;
      for (let d = resolved.depth; d >= 1; d--) {
        const nodeName = resolved.node(d).type.name;
        if (nodeName === "listItem" || nodeName === "taskItem") {
          targetDepth = d;
          isListChild = true;
          break;
        }
      }

      const from = resolved.before(targetDepth);
      const to = resolved.after(targetDepth);
      const node = doc.nodeAt(from) || resolved.node(targetDepth);

      if (node) {
        return { from, to, node, depth: targetDepth, isListChild, resolved };
      }
    } catch (err) {
      console.warn("getNodeRange error:", err);
    }
    return null;
  };

  const getBlockPosRange = () => getNodeRange(hoveredElement);

  const getBlockInfo = () => {
    if (!hoveredElement) {
      return { type: "paragraph", label: "Text", wordCount: 0, charCount: 0, isTable: false };
    }

    const tag = hoveredElement.tagName.toLowerCase();
    const isToc = !!hoveredElement.closest("[data-type='table-of-contents']");
    const isKanban = !!hoveredElement.closest("[data-type='kanban-board'], [data-node-view-wrapper]");
    const isTable = !!hoveredElement.closest(".tableWrapper, table") || tag === "table";
    const isTaskList = hoveredElement.getAttribute("data-type") === "taskItem" || !!hoveredElement.closest("[data-type='taskList']");
    const isOrderedList = tag === "li" && !!hoveredElement.closest("ol");
    const isBulletList = tag === "li" && !isTaskList && !isOrderedList;

    let label = "Text";
    let type = "paragraph";

    if (isToc) {
      label = "Table of Contents";
      type = "tableOfContents";
    } else if (isKanban) {
      label = "Kanban Board";
      type = "kanbanBoard";
    } else if (isTable) {
      label = "Table";
      type = "table";
    } else if (tag === "h1") {
      label = "Heading 1";
      type = "h1";
    } else if (tag === "h2") {
      label = "Heading 2";
      type = "h2";
    } else if (tag === "h3") {
      label = "Heading 3";
      type = "h3";
    } else if (tag === "h4") {
      label = "Heading 4";
      type = "h4";
    } else if (isTaskList) {
      label = "To-do list";
      type = "taskList";
    } else if (isOrderedList) {
      label = "Numbered list";
      type = "orderedList";
    } else if (isBulletList) {
      label = "Bulleted list";
      type = "bulletList";
    } else if (tag === "blockquote") {
      label = "Quote";
      type = "blockquote";
    } else if (tag === "pre") {
      label = "Code";
      type = "codeBlock";
    }

    const text = hoveredElement.textContent || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const charCount = text.length;

    return { type, label, wordCount: words, charCount, isTable };
  };

  const getTableNodeAndPos = () => {
    if (!editor || !hoveredElement) return null;
    try {
      const target =
        hoveredElement.closest("td, th") ||
        hoveredElement.querySelector("td, th") ||
        hoveredElement.closest("table") ||
        hoveredElement.querySelector("table") ||
        hoveredElement.closest(".tableWrapper") ||
        hoveredElement;

      const domPos = editor.view.posAtDOM(target, 0);
      const resolved = editor.state.doc.resolve(domPos);

      for (let d = resolved.depth; d > 0; d--) {
        const node = resolved.node(d);
        if (node.type.name === "table") {
          return { node, pos: resolved.before(d) };
        }
      }

      const directNode = editor.state.doc.nodeAt(domPos);
      if (directNode && directNode.type.name === "table") {
        return { node: directNode, pos: domPos };
      }
      if (domPos > 0) {
        const prevNode = editor.state.doc.nodeAt(domPos - 1);
        if (prevNode && prevNode.type.name === "table") {
          return { node: prevNode, pos: domPos - 1 };
        }
      }

      const tableWrapper = hoveredElement.closest(".tableWrapper, table");
      if (tableWrapper) {
        let found: { node: any; pos: number } | null = null;
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === "table" && !found) {
            try {
              const nodeDom = editor.view.nodeDOM(pos);
              if (
                nodeDom &&
                (nodeDom === tableWrapper ||
                  tableWrapper.contains(nodeDom as Node) ||
                  (nodeDom as HTMLElement).contains(tableWrapper))
              ) {
                found = { node, pos };
                return false;
              }
            } catch {}
          }
        });
        if (found) return found;
      }
    } catch (err) {
      console.warn("getTableNodeAndPos fallback error:", err);
    }
    return null;
  };

  // Drag-and-Drop Interaction Engine
  const handlePointerDown = (startEvent: React.PointerEvent) => {
    if (!editor || editor.isDestroyed || !hoveredElement) return;

    pointerDownPosRef.current = {
      x: startEvent.clientX,
      y: startEvent.clientY,
      time: Date.now(),
    };

    const sourceNodeElem = hoveredElement;
    const editorDom = editor.view.dom;
    const scrollContainer = editorDom.closest(".overflow-y-auto") as HTMLElement | null;

    let targetBlockElem: HTMLElement | null = null;
    let animFrameId: number | null = null;
    let currentY = startEvent.clientY;
    let currentX = startEvent.clientX;
    let hasStartedDrag = false;

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

      if (!hasStartedDrag) {
        const dx = Math.abs(e.clientX - (pointerDownPosRef.current?.x ?? e.clientX));
        const dy = Math.abs(e.clientY - (pointerDownPosRef.current?.y ?? e.clientY));
        if (dx > 3 || dy > 3) {
          hasStartedDrag = true;
          setIsDragging(true);
          setDragPreview({
            x: e.clientX + 10,
            y: e.clientY + 10,
            text: sourceNodeElem.textContent || "Block",
          });
        } else {
          return;
        }
      }

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

      if (hasStartedDrag) {
        setDraggedRecently(true);
        setTimeout(() => setDraggedRecently(false), 200);

        // Drag action completed
        if (targetBlockElem && targetBlockElem !== sourceNodeElem) {
          try {
            const sourceRange = getNodeRange(sourceNodeElem);
            const targetRange = getNodeRange(targetBlockElem);

            if (!sourceRange || !targetRange || !sourceRange.node) return;
            if (sourceRange.from === targetRange.from) return;

            const sourceNode = sourceRange.node;
            const sourceFrom = sourceRange.from;
            const sourceTo = sourceRange.to;
            const rawTargetPos = targetRange.to;

            let finalNode = sourceNode;

            // Moving a list item out to standard root level
            if (sourceRange.isListChild && !targetRange.isListChild) {
              const listType = editor.schema.nodes.bulletList || editor.schema.nodes.taskList;
              if (listType) {
                finalNode = listType.create(null, [sourceNode]);
              }
            }

            const tr = editor.state.tr;
            // Atomic delete of the source node
            tr.delete(sourceFrom, sourceTo);
            const mappedTargetPos = tr.mapping.map(rawTargetPos);

            try {
              tr.insert(mappedTargetPos, finalNode);
              editor.view.dispatch(tr);
            } catch (err) {
              console.error("Drag transaction insert failed:", err);
            }
          } catch (err) {
            console.error("Drag handler error:", err);
          }
        }
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleAddBlockBelow = () => {
    try {
      if (!editor || editor.isDestroyed || !hoveredElement) return;

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

  // Block Action Handlers
  const handleDuplicate = () => {
    const range = getBlockPosRange();
    if (!range || !range.node || !editor) return;
    const tr = editor.state.tr.insert(range.to, range.node);
    editor.view.dispatch(tr);
    setMenuOpen(false);
  };

  const handleDelete = () => {
    const range = getBlockPosRange();
    if (!range || !editor) return;
    const tr = editor.state.tr.delete(range.from, range.to);
    editor.view.dispatch(tr);
    setMenuOpen(false);
  };

  const handleCopyText = async () => {
    if (!hoveredElement) return;
    const text = hoveredElement.textContent || "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleTurnInto = (type: string, options?: any) => {
    const range = getBlockPosRange();
    if (!range || !editor) return;

    editor.chain().focus().setTextSelection(range.from + 1);

    if (type === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else if (type === "heading") {
      editor.chain().focus().toggleHeading({ level: options?.level || 1 }).run();
    } else if (type === "bulletList") {
      editor.chain().focus().toggleBulletList().run();
    } else if (type === "orderedList") {
      editor.chain().focus().toggleOrderedList().run();
    } else if (type === "taskList") {
      editor.chain().focus().toggleTaskList().run();
    } else if (type === "blockquote") {
      editor.chain().focus().toggleBlockquote().run();
    } else if (type === "codeBlock") {
      editor.chain().focus().toggleCodeBlock().run();
    } else if (type === "table") {
      (editor.chain().focus() as any).deleteRange({ from: range.from, to: range.to }).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    } else if (type === "kanban") {
      (editor.chain().focus() as any).deleteRange({ from: range.from, to: range.to }).insertKanbanBoard().run();
    } else if (type === "toc") {
      (editor.chain().focus() as any).deleteRange({ from: range.from, to: range.to }).insertTableOfContents().run();
    }
    setMenuOpen(false);
  };

  // Block Color & Highlight Handlers
  const handleApplyTextColor = (color: string) => {
    const range = getBlockPosRange();
    if (!range || !editor) return;

    const { tr, schema } = editor.state;
    const markType = schema.marks.textColor;
    if (!markType) return;

    tr.removeMark(range.from, range.to, markType);
    if (color && color !== "inherit" && color !== "default") {
      tr.addMark(range.from, range.to, markType.create({ color }));
    }
    editor.view.dispatch(tr);
    setMenuOpen(false);
  };

  const handleApplyHighlight = (bgColor: string) => {
    const range = getBlockPosRange();
    if (!range || !editor) return;

    const { tr, schema } = editor.state;
    const markType = schema.marks.textHighlight;
    if (!markType) return;

    tr.removeMark(range.from, range.to, markType);
    if (bgColor && bgColor !== "transparent" && bgColor !== "default") {
      tr.addMark(range.from, range.to, markType.create({ color: bgColor }));
    }
    editor.view.dispatch(tr);
    setMenuOpen(false);
  };

  const handleApplyAlign = (alignment: string) => {
    const range = getBlockPosRange();
    if (!range || !editor) return;

    editor.chain().focus().setTextSelection(range.from + 1).setTextAlign(alignment).run();
    setMenuOpen(false);
  };

  // Table Level 1 Controls
  const handleSetTableZebra = (enabled: boolean) => {
    const info = getTableNodeAndPos();
    if (!info || !editor) return;
    const tr = editor.state.tr.setNodeMarkup(info.pos, undefined, {
      ...info.node.attrs,
      zebra: enabled,
    });
    editor.view.dispatch(tr);
  };

  const handleSetTableZebraColor = (colorId: string) => {
    const info = getTableNodeAndPos();
    if (!info || !editor) return;
    const tr = editor.state.tr.setNodeMarkup(info.pos, undefined, {
      ...info.node.attrs,
      zebra: true,
      zebraColor: colorId,
    });
    editor.view.dispatch(tr);
    setActiveSubmenu(null);
  };

  const handleSetTableHeaderColor = (colorId: string) => {
    const info = getTableNodeAndPos();
    if (!info || !editor) return;
    const tr = editor.state.tr.setNodeMarkup(info.pos, undefined, {
      ...info.node.attrs,
      headerColor: colorId,
    });
    editor.view.dispatch(tr);
    setActiveSubmenu(null);
  };

  const handleToggleTableHeaderRow = () => {
    const info = getTableNodeAndPos();
    if (!editor || !info) return;
    editor.chain().focus().setTextSelection(info.pos + 2).toggleHeaderRow().run();
  };

  const handleToggleTableHeaderColumn = () => {
    const info = getTableNodeAndPos();
    if (!editor || !info) return;
    editor.chain().focus().setTextSelection(info.pos + 2).toggleHeaderColumn().run();
  };

  if (!editor || editor.isDestroyed || topPos === null) return null;

  const blockInfo = getBlockInfo();
  const tableInfo = getTableNodeAndPos();
  const tableAttrs = tableInfo?.node?.attrs || {};

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
        className="notion-block-side-handle-container absolute flex items-center gap-0.5 transition-opacity duration-150 z-20 opacity-60 hover:opacity-100 select-none pointer-events-none"
        style={{ top: `${topPos}px`, left: `${leftPos}px` }}
      >
        {/* Plus Button */}
        <button
          type="button"
          onClick={handleAddBlockBelow}
          className="h-5 w-5 flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-accent rounded transition-colors pointer-events-auto cursor-pointer"
          title="Add block below"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        {/* Grip Handle Button & Notion Action Menu Popover */}
        <Popover
          open={menuOpen}
          onOpenChange={(open) => {
            if (isDragging || draggedRecently) return;
            setMenuOpen(open);
            if (open) {
              setSearchQuery("");
              setActiveSubmenu(null);
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              onPointerDown={handlePointerDown}
              className={cn(
                "h-5 w-5 flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-accent rounded transition-colors cursor-grab active:cursor-grabbing pointer-events-auto",
                menuOpen && "bg-accent text-txt-primary"
              )}
              title="Click for actions, hold & drag to move"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            side="right"
            align="start"
            sideOffset={8}
            className="w-64 p-1.5 bg-popover text-txt-primary border border-border rounded-xl shadow-xl z-50 text-xs font-sans animate-in fade-in-50 zoom-in-95 duration-100"
          >
            {/* Search Actions Input */}
            <NotionMenuSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search actions..."
            />

            {/* Block Type Badge Header */}
            <NotionMenuSectionHeader className="capitalize">
              {blockInfo.isTable ? "Table options" : blockInfo.label}
            </NotionMenuSectionHeader>

            <Separator className="my-1" />

            {/* Menu Items */}
            <div className="space-y-0.5 max-h-72 overflow-y-auto pr-0.5">
              {/* Turn into > Submenu Trigger */}
              {!blockInfo.isTable && (
                <Popover open={activeSubmenu === "turnInto"} onOpenChange={(open) => setActiveSubmenu(open ? "turnInto" : null)}>
                  <PopoverTrigger asChild>
                    <div>
                      <NotionMenuItem
                        icon={<RefreshCw className="h-3.5 w-3.5" />}
                        hasSubmenu
                      >
                        Turn into
                      </NotionMenuItem>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="start"
                    className="w-48 p-1.5 bg-popover text-txt-primary border border-border rounded-xl shadow-xl z-50 text-xs"
                  >
                    <NotionMenuSectionHeader>Turn into</NotionMenuSectionHeader>
                    <NotionMenuItem icon={<Type className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("paragraph")}>
                      Text
                    </NotionMenuItem>
                    <NotionMenuItem icon={<Heading1 className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("heading", { level: 1 })}>
                      Heading 1
                    </NotionMenuItem>
                    <NotionMenuItem icon={<Heading2 className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("heading", { level: 2 })}>
                      Heading 2
                    </NotionMenuItem>
                    <NotionMenuItem icon={<Heading3 className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("heading", { level: 3 })}>
                      Heading 3
                    </NotionMenuItem>
                    <NotionMenuItem icon={<List className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("bulletList")}>
                      Bulleted list
                    </NotionMenuItem>
                    <NotionMenuItem icon={<ListOrdered className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("orderedList")}>
                      Numbered list
                    </NotionMenuItem>
                    <NotionMenuItem icon={<CheckSquare className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("taskList")}>
                      To-do list
                    </NotionMenuItem>
                    <NotionMenuItem icon={<Quote className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("blockquote")}>
                      Quote
                    </NotionMenuItem>
                    <NotionMenuItem icon={<Code2 className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("codeBlock")}>
                      Code
                    </NotionMenuItem>
                    <NotionMenuItem icon={<TableIcon className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("table")}>
                      Table
                    </NotionMenuItem>
                    <NotionMenuItem icon={<Columns3 className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("kanban")}>
                      Kanban Board
                    </NotionMenuItem>
                    <NotionMenuItem icon={<ListTree className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("toc")}>
                      Table of Contents
                    </NotionMenuItem>
                  </PopoverContent>
                </Popover>
              )}

              {/* Color > Submenu Trigger */}
              <Popover open={activeSubmenu === "color"} onOpenChange={(open) => setActiveSubmenu(open ? "color" : null)}>
                <PopoverTrigger asChild>
                  <div>
                    <NotionMenuItem
                      icon={<Paintbrush className="h-3.5 w-3.5" />}
                      hasSubmenu
                    >
                      Color
                    </NotionMenuItem>
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  side="right"
                  align="start"
                  className="w-56 p-1.5 bg-popover text-txt-primary border border-border rounded-xl shadow-xl z-50 text-xs max-h-80 overflow-y-auto"
                >
                  <NotionMenuSectionHeader>Color</NotionMenuSectionHeader>
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleApplyTextColor(c.color)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-accent text-left transition-colors cursor-pointer"
                    >
                      <span className="font-bold text-xs" style={{ color: c.color === "inherit" ? "currentColor" : c.color }}>A</span>
                      <span>{c.label}</span>
                    </button>
                  ))}

                  <Separator className="my-1.5" />
                  <NotionMenuSectionHeader>Background</NotionMenuSectionHeader>
                  {BG_HIGHLIGHTS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => handleApplyHighlight(bg.bg)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-accent text-left transition-colors cursor-pointer"
                    >
                      <span className="w-4 h-4 rounded border border-border/50 shrink-0" style={{ backgroundColor: bg.bg }} />
                      <span>{bg.label}</span>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              {/* Align > Submenu Trigger */}
              {!blockInfo.isTable && (
                <Popover open={activeSubmenu === "align"} onOpenChange={(open) => setActiveSubmenu(open ? "align" : null)}>
                  <PopoverTrigger asChild>
                    <div>
                      <NotionMenuItem
                        icon={<AlignLeft className="h-3.5 w-3.5" />}
                        hasSubmenu
                      >
                        Align
                      </NotionMenuItem>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="start"
                    className="w-44 p-1.5 bg-popover text-txt-primary border border-border rounded-xl shadow-xl z-50 text-xs space-y-0.5"
                  >
                    <NotionMenuSectionHeader>Perataan teks</NotionMenuSectionHeader>
                    <NotionMenuItem
                      icon={<AlignLeft className="h-3.5 w-3.5" />}
                      onClick={() => handleApplyAlign("left")}
                    >
                      Rata kiri
                    </NotionMenuItem>
                    <NotionMenuItem
                      icon={<AlignCenter className="h-3.5 w-3.5" />}
                      onClick={() => handleApplyAlign("center")}
                    >
                      Rata tengah
                    </NotionMenuItem>
                    <NotionMenuItem
                      icon={<AlignRight className="h-3.5 w-3.5" />}
                      onClick={() => handleApplyAlign("right")}
                    >
                      Rata kanan
                    </NotionMenuItem>
                    <NotionMenuItem
                      icon={<AlignJustify className="h-3.5 w-3.5" />}
                      onClick={() => handleApplyAlign("justify")}
                    >
                      Rata justify
                    </NotionMenuItem>
                  </PopoverContent>
                </Popover>
              )}

              {/* Table Block Level 1 Specific Controls */}
              {blockInfo.isTable && (
                <>
                  {/* Zebra Striping Toggle */}
                  <NotionMenuSwitchItem
                    icon={<TableProperties className="h-3.5 w-3.5" />}
                    label="Zebra rows"
                    checked={tableAttrs.zebra || false}
                    onCheckedChange={handleSetTableZebra}
                  />

                  {/* Zebra Row Color Palette Submenu */}
                  <Popover open={activeSubmenu === "tableZebraColor"} onOpenChange={(open) => setActiveSubmenu(open ? "tableZebraColor" : null)}>
                    <PopoverTrigger asChild>
                      <div>
                        <NotionMenuItem
                          icon={<Paintbrush className="h-3.5 w-3.5 text-blue-500" />}
                          hasSubmenu
                        >
                          Zebra color
                        </NotionMenuItem>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-52 p-2 bg-popover border border-border rounded-xl shadow-xl z-50 text-xs">
                      <NotionMenuSectionHeader>Tema warna zebra</NotionMenuSectionHeader>
                      <div className="grid grid-cols-5 gap-1.5 mt-1">
                        {TABLE_COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSetTableZebraColor(c.id)}
                            className={`h-7 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                              (tableAttrs.zebraColor || "default") === c.id ? "ring-2 ring-primary border-primary scale-105" : "border-border/60 hover:scale-105"
                            }`}
                            style={{ backgroundColor: c.bg }}
                            title={c.label}
                          >
                            <span className="text-[10px] font-bold" style={{ color: c.text }}>A</span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Header Row Color Theme Palette Submenu */}
                  <Popover open={activeSubmenu === "tableHeaderColor"} onOpenChange={(open) => setActiveSubmenu(open ? "tableHeaderColor" : null)}>
                    <PopoverTrigger asChild>
                      <div>
                        <NotionMenuItem
                          icon={<Paintbrush className="h-3.5 w-3.5 text-emerald-500" />}
                          hasSubmenu
                        >
                          Header color
                        </NotionMenuItem>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-52 p-2 bg-popover border border-border rounded-xl shadow-xl z-50 text-xs">
                      <NotionMenuSectionHeader>Tema warna header</NotionMenuSectionHeader>
                      <div className="grid grid-cols-5 gap-1.5 mt-1">
                        {TABLE_COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSetTableHeaderColor(c.id)}
                            className={`h-7 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                              (tableAttrs.headerColor || "default") === c.id ? "ring-2 ring-primary border-primary scale-105" : "border-border/60 hover:scale-105"
                            }`}
                            style={{ backgroundColor: c.bg }}
                            title={c.label}
                          >
                            <span className="text-[10px] font-bold" style={{ color: c.text }}>A</span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Header Row & Column Toggles */}
                  <NotionMenuItem
                    icon={<TableProperties className="h-3.5 w-3.5" />}
                    onClick={handleToggleTableHeaderRow}
                  >
                    Toggle Header row
                  </NotionMenuItem>
                  <NotionMenuItem
                    icon={<TableProperties className="h-3.5 w-3.5" />}
                    onClick={handleToggleTableHeaderColumn}
                  >
                    Toggle Header column
                  </NotionMenuItem>
                </>
              )}

              <Separator className="my-1" />

              {/* Standard Block Operations */}
              <NotionMenuItem
                icon={copied ? <CopyCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                shortcut="⌘C"
                onClick={handleCopyText}
              >
                {copied ? "Copied!" : "Copy text"}
              </NotionMenuItem>

              <NotionMenuItem
                icon={<Copy className="h-3.5 w-3.5" />}
                shortcut="⌘D"
                onClick={handleDuplicate}
              >
                Duplicate
              </NotionMenuItem>

              <NotionMenuItem
                icon={<Trash2 className="h-3.5 w-3.5" />}
                shortcut="Del"
                destructive
                onClick={handleDelete}
              >
                Delete
              </NotionMenuItem>
            </div>

            {/* Notion-style Metadata Footer */}
            <NotionMenuFooter
              wordCount={blockInfo.wordCount}
              charCount={blockInfo.charCount}
              extra={<span className="flex items-center gap-1 text-txt-brand font-medium"><Sparkles className="h-2.5 w-2.5" /> Markinotes</span>}
            />
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
