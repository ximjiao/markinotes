"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { CellSelection } from "@tiptap/pm/tables";
import {
  GripVertical,
  GripHorizontal,
  Trash2,
  Eraser,
  Paintbrush,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  TableProperties,
  CheckCircle2,
  Layers,
  Combine,
  MoreVertical,
  Sparkles,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { noteIpc } from "@/features/home/_lib/note-ipc";
import {
  NotionMenuSectionHeader,
  NotionMenuItem,
  NotionMenuSwitchItem,
  NOTION_TEXT_COLORS,
  NOTION_BG_HIGHLIGHTS,
} from "./notion-popover-primitives";

interface NotionTablePillHandlesProps {
  editor: Editor | null;
  workspacePath?: string | null;
}

interface ActiveCellInfo {
  cellElem: HTMLTableCellElement;
  tableElem: HTMLTableElement;
  colIndex: number;
  rowIndex: number;
  cellPos: number;
}

interface GhostColData {
  index: number;
  left: number;
  top: number;
  width: number;
  height: number;
  cellTexts: string[];
}

interface GhostRowData {
  index: number;
  left: number;
  top: number;
  width: number;
  height: number;
  cellTexts: string[];
}

const TABLE_HEADER_COLORS = [
  { label: "Default", value: "default", bg: "hsl(var(--accent) / 0.6)" },
  { label: "Gray", value: "gray", bg: "rgba(156, 163, 175, 0.25)" },
  { label: "Blue", value: "blue", bg: "rgba(59, 130, 246, 0.22)" },
  { label: "Green", value: "green", bg: "rgba(34, 197, 94, 0.22)" },
  { label: "Yellow", value: "yellow", bg: "rgba(234, 179, 8, 0.25)" },
  { label: "Pink", value: "pink", bg: "rgba(236, 72, 153, 0.22)" },
  { label: "Orange", value: "orange", bg: "rgba(249, 115, 22, 0.22)" },
  { label: "Purple", value: "purple", bg: "rgba(168, 85, 247, 0.22)" },
  { label: "Red", value: "red", bg: "rgba(239, 68, 68, 0.22)" },
];

export function NotionTablePillHandles({ editor, workspacePath }: NotionTablePillHandlesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeCell, setActiveCell] = useState<ActiveCellInfo | null>(null);
  const [colPillPos, setColPillPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [rowPillPos, setRowPillPos] = useState<{ top: number; left: number; height: number } | null>(null);
  const [highlightColRect, setHighlightColRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [highlightRowRect, setHighlightRowRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const [hoveringColPill, setHoveringColPill] = useState(false);
  const [hoveringRowPill, setHoveringRowPill] = useState(false);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [rowMenuOpen, setRowMenuOpen] = useState(false);

  // Multi-Cell Selection State
  const [cellSelectionBox, setCellSelectionBox] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    btnTop: number;
    btnLeft: number;
    cellCount: number;
  } | null>(null);
  const [cellMenuOpen, setCellMenuOpen] = useState(false);
  const [cellColorMenuOpen, setCellColorMenuOpen] = useState(false);

  // Drag & Drop State
  const [isDraggingCol, setIsDraggingCol] = useState(false);
  const [isDraggingRow, setIsDraggingRow] = useState(false);
  const [ghostColData, setGhostColData] = useState<GhostColData | null>(null);
  const [ghostRowData, setGhostRowData] = useState<GhostRowData | null>(null);
  const [dragDropIndicator, setDragDropIndicator] = useState<{ type: "col" | "row"; pos: number; length: number; offset: number } | null>(null);

  const activeCellRef = useRef<ActiveCellInfo | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHoveringColRef = useRef(false);
  const isHoveringRowRef = useRef(false);
  const isDraggingRef = useRef(false);
  const colMenuOpenRef = useRef(false);
  const rowMenuOpenRef = useRef(false);

  colMenuOpenRef.current = colMenuOpen;
  rowMenuOpenRef.current = rowMenuOpen;
  isHoveringColRef.current = hoveringColPill;
  isHoveringRowRef.current = hoveringRowPill;
  isDraggingRef.current = isDraggingCol || isDraggingRow;

  // Helper to find the ProseMirror document position of the table node
  const getTableNodePos = useCallback(
    (cellElem: HTMLElement): number | null => {
      if (!editor || editor.isDestroyed) return null;
      try {
        const pos = editor.view.posAtDOM(cellElem, 0);
        const { doc } = editor.state;
        const $pos = doc.resolve(pos);
        for (let d = $pos.depth; d > 0; d--) {
          if ($pos.node(d).type.name === "table") {
            return $pos.before(d);
          }
        }
      } catch (err) {
        console.warn("Could not find table pos:", err);
      }
      return null;
    },
    [editor]
  );

  // Update pill coordinates relative to overlay container
  const updatePillPositions = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    const current = activeCellRef.current;
    if (!current || !document.body.contains(current.cellElem) || !document.body.contains(current.tableElem)) {
      return;
    }

    try {
      const containerElem = containerRef.current || editor.view.dom.parentElement || editor.view.dom;
      const containerRect = containerElem.getBoundingClientRect();
      const cellRect = current.cellElem.getBoundingClientRect();
      const tableRect = current.tableElem.getBoundingClientRect();

      // 1. Column Pill (Centered on top edge of column)
      setColPillPos({
        top: tableRect.top - containerRect.top - 14,
        left: cellRect.left - containerRect.left + cellRect.width / 2 - 12,
        width: 24,
      });

      // 2. Row Pill (Centered on left edge of row)
      setRowPillPos({
        top: cellRect.top - containerRect.top + cellRect.height / 2 - 10,
        left: tableRect.left - containerRect.left - 15,
        height: 20,
      });

      // 3. Highlight Rectangles
      setHighlightColRect({
        top: tableRect.top - containerRect.top,
        left: cellRect.left - containerRect.left,
        width: cellRect.width,
        height: tableRect.height,
      });

      setHighlightRowRect({
        top: cellRect.top - containerRect.top,
        left: tableRect.left - containerRect.left,
        width: tableRect.width,
        height: cellRect.height,
      });
    } catch {
      // Safe fallback
    }
  }, [editor]);

  // Resync active cell from cursor point after mutation / drop
  const syncCellAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!editor || editor.isDestroyed) return;
      const elem = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      if (!elem) return;

      const cell = elem.closest("td, th") as HTMLTableCellElement | null;
      const table = elem.closest(".ProseMirror table") as HTMLTableElement | null;

      if (cell && table && editor.view.dom.contains(table)) {
        try {
          const colIndex = cell.cellIndex;
          const rowElem = cell.parentElement as HTMLTableRowElement;
          const rowIndex = rowElem ? rowElem.rowIndex : 0;
          const cellPos = editor.view.posAtDOM(cell, 0);

          const cellInfo: ActiveCellInfo = {
            cellElem: cell,
            tableElem: table,
            colIndex,
            rowIndex,
            cellPos,
          };

          activeCellRef.current = cellInfo;
          setActiveCell(cellInfo);
          updatePillPositions();
        } catch {}
      } else {
        activeCellRef.current = null;
        setActiveCell(null);
      }
    },
    [editor, updatePillPositions]
  );

  // Table-Level Attribute Controls (Excel-style) via Atomic Node Markup
  const getTableAttrs = useCallback(() => {
    if (!editor || !activeCell) return { zebra: false, headerColor: "default" };
    const tablePos = getTableNodePos(activeCell.cellElem);
    if (tablePos === null) return { zebra: false, headerColor: "default" };
    const node = editor.state.doc.nodeAt(tablePos);
    return (node?.attrs as { zebra?: boolean; headerColor?: string }) || { zebra: false, headerColor: "default" };
  }, [editor, activeCell, getTableNodePos]);

  const handleSetTableZebra = useCallback(
    (zebra: boolean) => {
      if (!editor || !activeCell) return;
      const tablePos = getTableNodePos(activeCell.cellElem);
      if (tablePos === null) return;
      const { tr, doc } = editor.state;
      const node = doc.nodeAt(tablePos);
      if (node && node.type.name === "table") {
        tr.setNodeMarkup(tablePos, undefined, {
          ...node.attrs,
          zebra,
        });
        editor.view.dispatch(tr);
      }
    },
    [editor, activeCell, getTableNodePos]
  );

  const handleSetTableHeaderColor = useCallback(
    (headerColor: string) => {
      if (!editor || !activeCell) return;
      const tablePos = getTableNodePos(activeCell.cellElem);
      if (tablePos === null) return;
      const { tr, doc } = editor.state;
      const node = doc.nodeAt(tablePos);
      if (node && node.type.name === "table") {
        tr.setNodeMarkup(tablePos, undefined, {
          ...node.attrs,
          headerColor,
        });
        editor.view.dispatch(tr);
      }
    },
    [editor, activeCell, getTableNodePos]
  );

  // ─── Cell Selection Floating Toolbar Tracker ───
  const updateCellSelection = useCallback(() => {
    if (!editor || editor.isDestroyed || !editor.view?.dom) {
      setCellSelectionBox(null);
      return;
    }

    try {
      const isCellSel = editor.state.selection instanceof CellSelection;
      const containerElem = containerRef.current || editor.view.dom.parentElement || editor.view.dom;
      const containerRect = containerElem.getBoundingClientRect();

      let minTop = Infinity;
      let maxBottom = -Infinity;
      let minLeft = Infinity;
      let maxRight = -Infinity;
      let cellCount = 0;

      if (isCellSel) {
        const cellSel = editor.state.selection as CellSelection;
        cellSel.forEachCell((node, pos) => {
          try {
            let dom = editor.view.nodeDOM(pos) as HTMLElement | null;
            if (!dom || typeof dom.getBoundingClientRect !== "function" || !dom.closest("table")) {
              const domInfo = editor.view.domAtPos(pos + 1);
              const target = domInfo.node;
              dom = (target.nodeType === 1 ? (target as HTMLElement) : target.parentElement)?.closest("td, th") as HTMLElement | null;
            }

            if (dom && typeof dom.getBoundingClientRect === "function") {
              const rect = dom.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                if (rect.top < minTop) minTop = rect.top;
                if (rect.bottom > maxBottom) maxBottom = rect.bottom;
                if (rect.left < minLeft) minLeft = rect.left;
                if (rect.right > maxRight) maxRight = rect.right;
                cellCount++;
              }
            }
          } catch {}
        });
      }

      // Query all DOM cells with .selectedCell class to ensure no cell is missed
      const selectedCells = editor.view.dom.querySelectorAll("td.selectedCell, th.selectedCell, .selectedCell");
      selectedCells.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          if (rect.top < minTop) minTop = rect.top;
          if (rect.bottom > maxBottom) maxBottom = rect.bottom;
          if (rect.left < minLeft) minLeft = rect.left;
          if (rect.right > maxRight) maxRight = rect.right;
          if (!isCellSel) cellCount++;
        }
      });

      const totalCount = Math.max(cellCount, selectedCells.length);

      if (totalCount > 0 && minTop !== Infinity && maxRight !== -Infinity) {
        setCellSelectionBox({
          top: minTop - containerRect.top,
          left: minLeft - containerRect.left,
          width: maxRight - minLeft,
          height: maxBottom - minTop,
          btnTop: minTop - containerRect.top + 6,
          btnLeft: maxRight - containerRect.left - 22,
          cellCount: totalCount,
        });
      } else {
        setCellSelectionBox(null);
      }
    } catch {
      setCellSelectionBox(null);
    }
  }, [editor]);

  // Multi-cell Actions (Merge, Split, Color, Clear)
  const handleMergeOrSplit = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().mergeOrSplit().run();
    setCellMenuOpen(false);
  }, [editor]);

  const handleClearSelectedCells = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().deleteRange(editor.state.selection).run();
    setCellMenuOpen(false);
  }, [editor]);

  const handleSetSelectedTextColor = useCallback(
    (color: string) => {
      if (!editor) return;
      if (color === "default" || color === "inherit") {
        editor.chain().focus().unsetMark("textColor").run();
      } else {
        editor.chain().focus().setMark("textColor", { color }).run();
      }
      setCellColorMenuOpen(false);
    },
    [editor]
  );

  const handleSetSelectedCellBg = useCallback(
    (bg: string) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .setCellAttribute("backgroundColor", bg === "transparent" || bg === "default" ? null : bg)
        .run();
      setCellColorMenuOpen(false);
    },
    [editor]
  );

  // Track selection updates for cells
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    editor.on("selectionUpdate", updateCellSelection);
    editor.on("transaction", updateCellSelection);

    const onMouseUp = () => {
      setTimeout(updateCellSelection, 50);
    };

    window.addEventListener("mouseup", onMouseUp);

    return () => {
      editor.off("selectionUpdate", updateCellSelection);
      editor.off("transaction", updateCellSelection);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [editor, updateCellSelection]);

  // Track mouse movement over tables
  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.view?.dom) return;

    const editorDom = editor.view.dom;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current || colMenuOpenRef.current || rowMenuOpenRef.current) {
        return;
      }

      const target = e.target as HTMLElement;
      const cell = target.closest("td, th") as HTMLTableCellElement | null;
      const table = target.closest(".ProseMirror table") as HTMLTableElement | null;

      if (cell && table && editorDom.contains(table)) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }

        // When moving inside normal table cells, make sure full column highlight is off
        if (!target.closest(".notion-pill-handle-button")) {
          if (isHoveringColRef.current) {
            isHoveringColRef.current = false;
            setHoveringColPill(false);
          }
          if (isHoveringRowRef.current) {
            isHoveringRowRef.current = false;
            setHoveringRowPill(false);
          }
        }

        try {
          const colIndex = cell.cellIndex;
          const rowElem = cell.parentElement as HTMLTableRowElement;
          const rowIndex = rowElem ? rowElem.rowIndex : 0;
          const cellPos = editor.view.posAtDOM(cell, 0);

          const cellInfo: ActiveCellInfo = {
            cellElem: cell,
            tableElem: table,
            colIndex,
            rowIndex,
            cellPos,
          };

          activeCellRef.current = cellInfo;
          setActiveCell(cellInfo);
          updatePillPositions();
        } catch {
          // Safe fallback
        }
      } else {
        if (!hoverTimeoutRef.current) {
          hoverTimeoutRef.current = setTimeout(() => {
            if (
              !colMenuOpenRef.current &&
              !rowMenuOpenRef.current &&
              !isHoveringColRef.current &&
              !isHoveringRowRef.current &&
              !isDraggingRef.current
            ) {
              activeCellRef.current = null;
              setActiveCell(null);
            }
            hoverTimeoutRef.current = null;
          }, 350);
        }
      }
    };

    const handleScrollOrResize = () => {
      updatePillPositions();
    };

    editorDom.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });

    return () => {
      editorDom.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScrollOrResize, { capture: true });
      window.removeEventListener("resize", handleScrollOrResize);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [editor, updatePillPositions]);

  // ─── Reordering Atomic ProseMirror Transactions ───

  const executeMoveColumn = useCallback(
    (fromCol: number, toCol: number) => {
      if (!editor || !activeCell || fromCol === toCol) return;
      const tablePos = getTableNodePos(activeCell.cellElem);
      if (tablePos === null) return;

      const { tr, doc } = editor.state;
      const tableNode = doc.nodeAt(tablePos);
      if (!tableNode || tableNode.type.name !== "table") return;

      const newRows: any[] = [];
      tableNode.forEach((rowNode) => {
        if (rowNode.type.name === "tableRow") {
          const cells: any[] = [];
          rowNode.forEach((cellNode) => {
            cells.push(cellNode);
          });

          if (fromCol >= 0 && fromCol < cells.length && toCol >= 0 && toCol < cells.length) {
            const [movedCell] = cells.splice(fromCol, 1);
            cells.splice(toCol, 0, movedCell);
          }

          newRows.push(rowNode.type.create(rowNode.attrs, cells));
        }
      });

      const newTable = tableNode.type.create(tableNode.attrs, newRows);
      tr.replaceWith(tablePos, tablePos + tableNode.nodeSize, newTable);
      editor.view.dispatch(tr);
    },
    [editor, activeCell, getTableNodePos]
  );

  const executeMoveRow = useCallback(
    (fromRow: number, toRow: number) => {
      if (!editor || !activeCell || fromRow === toRow) return;
      const tablePos = getTableNodePos(activeCell.cellElem);
      if (tablePos === null) return;

      const { tr, doc } = editor.state;
      const tableNode = doc.nodeAt(tablePos);
      if (!tableNode || tableNode.type.name !== "table") return;

      const rows: any[] = [];
      tableNode.forEach((rowNode) => {
        if (rowNode.type.name === "tableRow") {
          rows.push(rowNode);
        }
      });

      if (fromRow >= 0 && fromRow < rows.length && toRow >= 0 && toRow < rows.length) {
        const [movedRow] = rows.splice(fromRow, 1);
        rows.splice(toRow, 0, movedRow);
      }

      const newTable = tableNode.type.create(tableNode.attrs, rows);
      tr.replaceWith(tablePos, tablePos + tableNode.nodeSize, newTable);
      editor.view.dispatch(tr);
    },
    [editor, activeCell, getTableNodePos]
  );

  // ─── Drag and Drop with Ghost Preview & Auto-Scrolling ───

  const handleColPointerDown = (startEvent: React.PointerEvent) => {
    if (!activeCell || !editor) return;

    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    const startColIndex = activeCell.colIndex;
    const tableElem = activeCell.tableElem;
    const tableWrapper = (tableElem.closest(".tableWrapper") || tableElem.parentElement) as HTMLElement | null;
    const cellRect = activeCell.cellElem.getBoundingClientRect();

    // Extract text content of all cells in this column for ghost preview
    const colCellTexts: string[] = [];
    const trs = Array.from(tableElem.querySelectorAll("tr"));
    trs.forEach((tr) => {
      const td = tr.children[startColIndex] as HTMLElement | null;
      colCellTexts.push(td ? (td.textContent || "").trim() : "");
    });

    const grabOffsetX = startX - cellRect.left;

    let hasMoved = false;
    let targetDropCol = startColIndex;
    let latestClientX = startX;
    let latestClientY = startY;
    let rafId: number | null = null;
    let scrollSpeed = 0;

    const recomputeDropPosition = (clientX: number) => {
      const containerElem = containerRef.current || editor.view.dom.parentElement || editor.view.dom;
      const currentContainerRect = containerElem.getBoundingClientRect();
      const currentTableRect = tableElem.getBoundingClientRect();
      const firstRow = tableElem.querySelector("tr");
      if (!firstRow) return;

      const cells = Array.from(firstRow.children) as HTMLElement[];
      const numCols = cells.length;

      let boundary = startColIndex;
      let indicatorLeft = 0;

      for (let i = 0; i < numCols; i++) {
        const curCellRect = cells[i].getBoundingClientRect();
        const midX = curCellRect.left + curCellRect.width / 2;

        if (clientX < midX) {
          boundary = i;
          indicatorLeft = curCellRect.left - currentContainerRect.left;
          break;
        } else if (i === numCols - 1 || clientX < cells[i + 1]?.getBoundingClientRect().left) {
          boundary = i + 1;
          indicatorLeft = curCellRect.right - currentContainerRect.left;
          break;
        }
      }

      targetDropCol = boundary <= startColIndex ? boundary : boundary - 1;

      // Update Ghost Position
      setGhostColData({
        index: startColIndex,
        left: clientX - currentContainerRect.left - grabOffsetX,
        top: currentTableRect.top - currentContainerRect.top - 8,
        width: Math.max(cellRect.width, 100),
        height: Math.min(currentTableRect.height, 280),
        cellTexts: colCellTexts,
      });

      // Update Drop Indicator
      setDragDropIndicator({
        type: "col",
        pos: indicatorLeft,
        length: currentTableRect.height,
        offset: currentTableRect.top - currentContainerRect.top,
      });
    };

    const autoScrollLoop = () => {
      if (scrollSpeed !== 0) {
        if (tableWrapper) {
          tableWrapper.scrollLeft += scrollSpeed;
        } else {
          window.scrollBy({ left: scrollSpeed });
        }
        recomputeDropPosition(latestClientX);
      }
      rafId = requestAnimationFrame(autoScrollLoop);
    };

    const onPointerMove = (e: PointerEvent) => {
      latestClientX = e.clientX;
      latestClientY = e.clientY;
      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = Math.abs(e.clientY - startY);

      if (!hasMoved && (deltaX > 3 || deltaY > 3)) {
        hasMoved = true;
        setIsDraggingCol(true);
        isDraggingRef.current = true;
        setColMenuOpen(false);
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";

        if (!rafId) {
          rafId = requestAnimationFrame(autoScrollLoop);
        }
      }

      if (!hasMoved) return;

      // Edge Auto-Scroll
      const wrapperRect = tableWrapper ? tableWrapper.getBoundingClientRect() : { left: 0, right: window.innerWidth };
      const edgeThreshold = 65;

      if (e.clientX > wrapperRect.right - edgeThreshold) {
        const progress = Math.min(1, Math.max(0, (e.clientX - (wrapperRect.right - edgeThreshold)) / edgeThreshold));
        scrollSpeed = Math.round(4 + progress * 20);
      } else if (e.clientX < wrapperRect.left + edgeThreshold) {
        const progress = Math.min(1, Math.max(0, ((wrapperRect.left + edgeThreshold) - e.clientX) / edgeThreshold));
        scrollSpeed = -Math.round(4 + progress * 20);
      } else {
        scrollSpeed = 0;
      }

      recomputeDropPosition(e.clientX);
    };

    const onPointerUp = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      setIsDraggingCol(false);
      isDraggingRef.current = false;
      setDragDropIndicator(null);
      setGhostColData(null);

      // Explicitly clear column hover highlight after drop
      isHoveringColRef.current = false;
      setHoveringColPill(false);

      if (hasMoved) {
        const stopClick = (ev: MouseEvent) => {
          ev.preventDefault();
          ev.stopPropagation();
        };
        window.addEventListener("click", stopClick, { capture: true, once: true });

        if (targetDropCol !== startColIndex) {
          executeMoveColumn(startColIndex, targetDropCol);
        }

        // Cleanly resync active cell position on the new DOM after drop
        setTimeout(() => {
          syncCellAtPoint(latestClientX, latestClientY);
        }, 50);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleRowPointerDown = (startEvent: React.PointerEvent) => {
    if (!activeCell || !editor) return;

    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    const startRowIndex = activeCell.rowIndex;
    const tableElem = activeCell.tableElem;
    const cellRect = activeCell.cellElem.getBoundingClientRect();

    // Extract text content of all cells in this row for ghost preview
    const rowCellTexts: string[] = [];
    const targetRowElem = tableElem.querySelectorAll("tr")[startRowIndex];
    if (targetRowElem) {
      Array.from(targetRowElem.children).forEach((td) => {
        rowCellTexts.push((td.textContent || "").trim());
      });
    }

    const grabOffsetY = startY - cellRect.top;

    let hasMoved = false;
    let targetDropRow = startRowIndex;
    let latestClientX = startX;
    let latestClientY = startY;
    let rafId: number | null = null;
    let scrollSpeed = 0;

    const recomputeDropPosition = (clientY: number) => {
      const containerElem = containerRef.current || editor.view.dom.parentElement || editor.view.dom;
      const currentContainerRect = containerElem.getBoundingClientRect();
      const currentTableRect = tableElem.getBoundingClientRect();
      const rows = Array.from(tableElem.querySelectorAll("tr")) as HTMLElement[];
      const numRows = rows.length;

      let boundary = startRowIndex;
      let indicatorTop = 0;

      for (let i = 0; i < numRows; i++) {
        const curRowRect = rows[i].getBoundingClientRect();
        const midY = curRowRect.top + curRowRect.height / 2;

        if (clientY < midY) {
          boundary = i;
          indicatorTop = curRowRect.top - currentContainerRect.top;
          break;
        } else if (i === numRows - 1 || clientY < rows[i + 1]?.getBoundingClientRect().top) {
          boundary = i + 1;
          indicatorTop = curRowRect.bottom - currentContainerRect.top;
          break;
        }
      }

      targetDropRow = boundary <= startRowIndex ? boundary : boundary - 1;

      // Update Ghost Position
      setGhostRowData({
        index: startRowIndex,
        left: currentTableRect.left - currentContainerRect.left - 8,
        top: clientY - currentContainerRect.top - grabOffsetY,
        width: Math.min(currentTableRect.width, 500),
        height: Math.max(cellRect.height, 36),
        cellTexts: rowCellTexts,
      });

      // Update Drop Indicator
      setDragDropIndicator({
        type: "row",
        pos: indicatorTop,
        length: currentTableRect.width,
        offset: currentTableRect.left - currentContainerRect.left,
      });
    };

    const autoScrollLoop = () => {
      if (scrollSpeed !== 0) {
        window.scrollBy({ top: scrollSpeed });
        recomputeDropPosition(latestClientY);
      }
      rafId = requestAnimationFrame(autoScrollLoop);
    };

    const onPointerMove = (e: PointerEvent) => {
      latestClientX = e.clientX;
      latestClientY = e.clientY;
      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = Math.abs(e.clientY - startY);

      if (!hasMoved && (deltaX > 3 || deltaY > 3)) {
        hasMoved = true;
        setIsDraggingRow(true);
        isDraggingRef.current = true;
        setRowMenuOpen(false);
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";

        if (!rafId) {
          rafId = requestAnimationFrame(autoScrollLoop);
        }
      }

      if (!hasMoved) return;

      // Edge Auto-Scroll
      const edgeThreshold = 70;
      if (e.clientY > window.innerHeight - edgeThreshold) {
        const progress = Math.min(1, Math.max(0, (e.clientY - (window.innerHeight - edgeThreshold)) / edgeThreshold));
        scrollSpeed = Math.round(4 + progress * 20);
      } else if (e.clientY < edgeThreshold) {
        const progress = Math.min(1, Math.max(0, (edgeThreshold - e.clientY) / edgeThreshold));
        scrollSpeed = -Math.round(4 + progress * 20);
      } else {
        scrollSpeed = 0;
      }

      recomputeDropPosition(e.clientY);
    };

    const onPointerUp = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      setIsDraggingRow(false);
      isDraggingRef.current = false;
      setDragDropIndicator(null);
      setGhostRowData(null);

      // Explicitly clear row hover highlight after drop
      isHoveringRowRef.current = false;
      setHoveringRowPill(false);

      if (hasMoved) {
        const stopClick = (ev: MouseEvent) => {
          ev.preventDefault();
          ev.stopPropagation();
        };
        window.addEventListener("click", stopClick, { capture: true, once: true });

        if (targetDropRow !== startRowIndex) {
          executeMoveRow(startRowIndex, targetDropRow);
        }

        // Cleanly resync active cell position on the new DOM after drop
        setTimeout(() => {
          syncCellAtPoint(latestClientX, latestClientY);
        }, 50);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Column Actions
  const handleInsertColBefore = () => {
    if (!editor || !activeCell) return;
    editor.chain().focus().setTextSelection(activeCell.cellPos).addColumnBefore().run();
    setColMenuOpen(false);
  };
  const handleInsertColAfter = () => {
    if (!editor || !activeCell) return;
    editor.chain().focus().setTextSelection(activeCell.cellPos).addColumnAfter().run();
    setColMenuOpen(false);
  };
  const handleDeleteCol = () => {
    if (!editor || !activeCell) return;
    editor.chain().focus().setTextSelection(activeCell.cellPos).deleteColumn().run();
    setColMenuOpen(false);
    setActiveCell(null);
  };
  const handleClearCol = () => {
    if (!editor || !activeCell) return;
    const table = activeCell.tableElem;
    const colIdx = activeCell.colIndex;
    const rows = Array.from(table.querySelectorAll("tr"));

    editor.chain().focus().run();
    rows.forEach((row) => {
      const cell = row.children[colIdx] as HTMLElement | null;
      if (cell) {
        try {
          const pos = editor.view.posAtDOM(cell, 0);
          const node = editor.state.doc.nodeAt(pos);
          if (node) {
            editor.commands.deleteRange({ from: pos + 1, to: pos + node.nodeSize - 1 });
          }
        } catch {}
      }
    });
    setColMenuOpen(false);
  };

  // Row Actions
  const handleInsertRowBefore = () => {
    if (!editor || !activeCell) return;
    editor.chain().focus().setTextSelection(activeCell.cellPos).addRowBefore().run();
    setRowMenuOpen(false);
  };
  const handleInsertRowAfter = () => {
    if (!editor || !activeCell) return;
    editor.chain().focus().setTextSelection(activeCell.cellPos).addRowAfter().run();
    setRowMenuOpen(false);
  };
  const handleDeleteRow = () => {
    if (!editor || !activeCell) return;
    editor.chain().focus().setTextSelection(activeCell.cellPos).deleteRow().run();
    setRowMenuOpen(false);
    setActiveCell(null);
  };
  const handleClearRow = () => {
    if (!editor || !activeCell) return;
    const table = activeCell.tableElem;
    const rowIdx = activeCell.rowIndex;
    const rows = Array.from(table.querySelectorAll("tr"));
    const row = rows[rowIdx];
    if (!row) return;

    editor.chain().focus().run();
    const cells = Array.from(row.children) as HTMLElement[];
    cells.forEach((cell) => {
      try {
        const pos = editor.view.posAtDOM(cell, 0);
        const node = editor.state.doc.nodeAt(pos);
        if (node) {
          editor.commands.deleteRange({ from: pos + 1, to: pos + node.nodeSize - 1 });
        }
      } catch {}
    });
    setRowMenuOpen(false);
  };
  const handleToggleHeaderRow = () => {
    if (!editor || !activeCell) return;
    editor.chain().focus().setTextSelection(activeCell.cellPos).toggleHeaderRow().run();
    setRowMenuOpen(false);
  };

  const currentAttrs = getTableAttrs();

  return (
    <div
      ref={containerRef}
      className="notion-table-pill-overlay pointer-events-none absolute inset-0 z-20 select-none"
    >
      {/* ─── 1. Hover Selection Highlight Box (ONLY visible when hovering/dragging Pill) ─── */}
      {hoveringColPill && highlightColRect && !isDraggingCol && !isDraggingRow && (
        <div
          className="absolute pointer-events-none border-2 border-primary/70 bg-primary/5 rounded-xs transition-all duration-75"
          style={{
            top: `${highlightColRect.top}px`,
            left: `${highlightColRect.left}px`,
            width: `${highlightColRect.width}px`,
            height: `${highlightColRect.height}px`,
          }}
        />
      )}

      {hoveringRowPill && highlightRowRect && !isDraggingRow && !isDraggingCol && (
        <div
          className="absolute pointer-events-none border-2 border-primary/70 bg-primary/5 rounded-xs transition-all duration-75"
          style={{
            top: `${highlightRowRect.top}px`,
            left: `${highlightRowRect.left}px`,
            width: `${highlightRowRect.width}px`,
            height: `${highlightRowRect.height}px`,
          }}
        />
      )}

      {/* ─── 2. DND Drop Target Indicator Line ─── */}
      {dragDropIndicator && dragDropIndicator.type === "col" && (
        <div
          className="absolute pointer-events-none w-1 bg-primary z-50 rounded-full shadow-lg transition-all duration-75"
          style={{
            left: `${dragDropIndicator.pos - 2}px`,
            top: `${dragDropIndicator.offset}px`,
            height: `${dragDropIndicator.length}px`,
          }}
        />
      )}

      {dragDropIndicator && dragDropIndicator.type === "row" && (
        <div
          className="absolute pointer-events-none h-1 bg-primary z-50 rounded-full shadow-lg transition-all duration-75"
          style={{
            top: `${dragDropIndicator.pos - 2}px`,
            left: `${dragDropIndicator.offset}px`,
            width: `${dragDropIndicator.length}px`,
          }}
        />
      )}

      {/* ─── 3. Floating Ghost Preview Card (Column) ─── */}
      {isDraggingCol && ghostColData && (
        <div
          className="absolute pointer-events-none z-50 rounded-lg border-2 border-primary/80 bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-md overflow-hidden transition-transform duration-75 scale-[1.02] opacity-90 ring-4 ring-primary/20"
          style={{
            left: `${ghostColData.left}px`,
            top: `${ghostColData.top}px`,
            width: `${ghostColData.width}px`,
            maxHeight: `${ghostColData.height}px`,
          }}
        >
          <div className="bg-primary/20 border-b border-primary/30 px-2.5 py-1 text-[11px] font-semibold text-primary flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <GripHorizontal className="h-3 w-3" /> Kolom {ghostColData.index + 1}
            </span>
            <Layers className="h-3 w-3 opacity-60" />
          </div>
          <div className="divide-y divide-border/40 text-xs">
            {ghostColData.cellTexts.slice(0, 5).map((text, idx) => (
              <div key={idx} className="p-2 truncate font-normal bg-card/60">
                {text || <span className="text-txt-muted italic text-[10px]">Kosong</span>}
              </div>
            ))}
            {ghostColData.cellTexts.length > 5 && (
              <div className="p-1.5 text-[10px] text-center text-txt-muted bg-accent/40 font-mono">
                +{ghostColData.cellTexts.length - 5} baris lainnya
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 4. Floating Ghost Preview Card (Row) ─── */}
      {isDraggingRow && ghostRowData && (
        <div
          className="absolute pointer-events-none z-50 rounded-lg border-2 border-primary/80 bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-md overflow-hidden transition-transform duration-75 scale-[1.02] opacity-90 ring-4 ring-primary/20"
          style={{
            left: `${ghostRowData.left}px`,
            top: `${ghostRowData.top}px`,
            maxWidth: `${ghostRowData.width}px`,
            height: `${ghostRowData.height + 28}px`,
          }}
        >
          <div className="bg-primary/20 border-b border-primary/30 px-2.5 py-0.5 text-[10px] font-semibold text-primary flex items-center gap-1.5">
            <GripVertical className="h-2.5 w-2.5" /> Baris {ghostRowData.index + 1}
          </div>
          <div className="flex divide-x divide-border/40 text-xs overflow-hidden">
            {ghostRowData.cellTexts.slice(0, 4).map((text, idx) => (
              <div key={idx} className="p-1.5 min-w-[70px] max-w-[120px] truncate bg-card/60">
                {text || <span className="text-txt-muted italic text-[10px]">Kosong</span>}
              </div>
            ))}
            {ghostRowData.cellTexts.length > 4 && (
              <div className="p-1.5 text-[10px] text-txt-muted bg-accent/40 flex items-center px-2">
                +{ghostRowData.cellTexts.length - 4} sel
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 5. Top Column Pill Handle (Horizontal 6-dot / Pill) ─── */}
      {activeCell && colPillPos && (
        <div
          className="pointer-events-auto absolute"
          style={{
            top: `${colPillPos.top}px`,
            left: `${colPillPos.left}px`,
          }}
          onMouseEnter={() => {
            isHoveringColRef.current = true;
            setHoveringColPill(true);
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            isHoveringColRef.current = false;
            setHoveringColPill(false);
          }}
        >
          <Popover open={colMenuOpen} onOpenChange={setColMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onPointerDown={handleColPointerDown}
                onClick={() => {
                  if (!isDraggingRef.current) {
                    setColMenuOpen((prev) => !prev);
                  }
                }}
                className={cn(
                  "notion-pill-handle-button h-3.5 w-6 rounded-xs bg-muted/80 hover:bg-primary/90 hover:text-primary-foreground text-muted-foreground flex items-center justify-center cursor-grab active:cursor-grabbing shadow-xs transition-all border border-border/60 hover:scale-105",
                  (hoveringColPill || colMenuOpen || isDraggingCol) && "bg-primary text-primary-foreground border-primary"
                )}
                title="Klik untuk opsi kolom atau geser untuk memindahkan kolom"
              >
                <GripHorizontal className="h-2.5 w-3.5" />
              </button>
            </PopoverTrigger>

            <PopoverContent side="top" align="center" className="w-52 p-1.5 bg-popover border border-border rounded-xl shadow-xl text-txt-primary text-xs z-50 space-y-0.5">
              <NotionMenuSectionHeader>
                Kolom {activeCell.colIndex + 1}
              </NotionMenuSectionHeader>

              <Separator className="my-1" />

              <NotionMenuItem
                icon={<ArrowLeft className="h-3.5 w-3.5 text-txt-brand" />}
                onClick={handleInsertColBefore}
              >
                Sisipkan kolom di kiri
              </NotionMenuItem>

              <NotionMenuItem
                icon={<ArrowRight className="h-3.5 w-3.5 text-txt-brand" />}
                onClick={handleInsertColAfter}
              >
                Sisipkan kolom di kanan
              </NotionMenuItem>

              <NotionMenuItem
                icon={<Eraser className="h-3.5 w-3.5" />}
                onClick={handleClearCol}
              >
                Hapus isi kolom
              </NotionMenuItem>

              {/* Table Header Color Palette ONLY if this column is set as header */}
              {activeCell.colIndex === 0 && activeCell.cellElem.tagName.toLowerCase() === "th" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <div>
                      <NotionMenuItem
                        icon={<Paintbrush className="h-3.5 w-3.5 text-emerald-500" />}
                        hasSubmenu
                      >
                        Warna header
                      </NotionMenuItem>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-52 p-2 bg-popover border border-border rounded-xl shadow-xl z-50 text-xs">
                    <NotionMenuSectionHeader>Tema warna header</NotionMenuSectionHeader>
                    <div className="grid grid-cols-5 gap-1.5 mt-1">
                      {TABLE_HEADER_COLORS.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          onClick={() => handleSetTableHeaderColor(c.value)}
                          className={cn(
                            "h-6 w-full rounded border border-border/40 hover:scale-110 hover:border-txt-brand cursor-pointer flex items-center justify-center text-[10px] transition-transform",
                            currentAttrs.headerColor === c.value && "ring-2 ring-primary font-bold"
                          )}
                          style={{ backgroundColor: c.bg }}
                          title={c.label}
                        >
                          {c.value === "default" ? "∅" : ""}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              <Separator className="my-1" />

              <NotionMenuItem
                icon={<Trash2 className="h-3.5 w-3.5" />}
                destructive
                onClick={handleDeleteCol}
              >
                Hapus kolom
              </NotionMenuItem>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* ─── 6. Left Row Pill Handle (Vertical 6-dot Pill) ─── */}
      {activeCell && rowPillPos && (
        <div
          className="pointer-events-auto absolute"
          style={{
            top: `${rowPillPos.top}px`,
            left: `${rowPillPos.left}px`,
          }}
          onMouseEnter={() => {
            isHoveringRowRef.current = true;
            setHoveringRowPill(true);
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            isHoveringRowRef.current = false;
            setHoveringRowPill(false);
          }}
        >
          <Popover open={rowMenuOpen} onOpenChange={setRowMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onPointerDown={handleRowPointerDown}
                onClick={() => {
                  if (!isDraggingRef.current) {
                    setRowMenuOpen((prev) => !prev);
                  }
                }}
                className={cn(
                  "notion-pill-handle-button h-5 w-3.5 rounded-xs bg-muted/80 hover:bg-primary/90 hover:text-primary-foreground text-muted-foreground flex items-center justify-center cursor-grab active:cursor-grabbing shadow-xs transition-all border border-border/60 hover:scale-105",
                  (hoveringRowPill || rowMenuOpen || isDraggingRow) && "bg-primary text-primary-foreground border-primary"
                )}
                title="Klik untuk opsi baris atau geser untuk memindahkan baris"
              >
                <GripVertical className="h-3 w-2.5" />
              </button>
            </PopoverTrigger>

            <PopoverContent side="left" align="center" className="w-52 p-1.5 bg-popover border border-border rounded-xl shadow-xl text-txt-primary text-xs z-50 space-y-0.5">
              <NotionMenuSectionHeader>
                Baris {activeCell.rowIndex + 1}
              </NotionMenuSectionHeader>

              <Separator className="my-1" />

              <NotionMenuItem
                icon={<ArrowUp className="h-3.5 w-3.5 text-txt-brand" />}
                onClick={handleInsertRowBefore}
              >
                Sisipkan baris di atas
              </NotionMenuItem>

              <NotionMenuItem
                icon={<ArrowDown className="h-3.5 w-3.5 text-txt-brand" />}
                onClick={handleInsertRowAfter}
              >
                Sisipkan baris di bawah
              </NotionMenuItem>

              <NotionMenuItem
                icon={<Eraser className="h-3.5 w-3.5" />}
                onClick={handleClearRow}
              >
                Hapus isi baris
              </NotionMenuItem>

              {/* Only show Header Row controls on the first row (Single Header Enforcement) */}
              {activeCell?.rowIndex === 0 && (
                <>
                  <NotionMenuItem
                    icon={<TableProperties className="h-3.5 w-3.5" />}
                    onClick={handleToggleHeaderRow}
                  >
                    Beralih baris header
                  </NotionMenuItem>

                  {/* Table Header Color Palette in Row Menu ONLY if currently a header */}
                  {activeCell.cellElem.tagName.toLowerCase() === "th" && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <div>
                          <NotionMenuItem
                            icon={<Paintbrush className="h-3.5 w-3.5 text-emerald-500" />}
                            hasSubmenu
                          >
                            Warna header
                          </NotionMenuItem>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent side="right" align="start" className="w-52 p-2 bg-popover border border-border rounded-xl shadow-xl z-50 text-xs">
                        <NotionMenuSectionHeader>Tema warna header</NotionMenuSectionHeader>
                        <div className="grid grid-cols-5 gap-1.5 mt-1">
                          {TABLE_HEADER_COLORS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => handleSetTableHeaderColor(c.value)}
                              className={cn(
                                "h-6 w-full rounded border border-border/40 hover:scale-110 hover:border-txt-brand cursor-pointer flex items-center justify-center text-[10px] transition-transform",
                                currentAttrs.headerColor === c.value && "ring-2 ring-primary font-bold"
                              )}
                              style={{ backgroundColor: c.bg }}
                              title={c.label}
                            >
                              {c.value === "default" ? "∅" : ""}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </>
              )}

              <Separator className="my-1" />

              <NotionMenuItem
                icon={<Trash2 className="h-3.5 w-3.5" />}
                destructive
                onClick={handleDeleteRow}
              >
                Hapus baris
              </NotionMenuItem>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* ─── 7. Cell Selection Floating Action Button & Menu ─── */}
      {cellSelectionBox && (
        <div
          className="pointer-events-auto absolute z-40"
          style={{
            top: `${cellSelectionBox.btnTop}px`,
            left: `${cellSelectionBox.btnLeft}px`,
          }}
        >
          <Popover open={cellMenuOpen} onOpenChange={setCellMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-5 w-4 rounded-xs bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md hover:scale-110 transition-transform border border-primary-foreground/20"
                title="Opsi seleksi sel (Merge, Warna, Hapus)"
              >
                <MoreVertical className="h-3 w-2.5" />
              </button>
            </PopoverTrigger>

            <PopoverContent
              side="right"
              align="start"
              sideOffset={6}
              className="w-52 p-1.5 bg-popover border border-border rounded-xl shadow-xl text-txt-primary text-xs z-50 space-y-0.5"
            >
              <NotionMenuSectionHeader>
                Opsi Sel ({cellSelectionBox.cellCount} sel)
              </NotionMenuSectionHeader>

              {/* Color Palette Submenu for Selected Cells */}
              <Popover open={cellColorMenuOpen} onOpenChange={setCellColorMenuOpen}>
                <PopoverTrigger asChild>
                  <div>
                    <NotionMenuItem
                      icon={<Paintbrush className="h-3.5 w-3.5 text-purple-400" />}
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
                  <NotionMenuSectionHeader>Text color</NotionMenuSectionHeader>
                  <div className="grid grid-cols-5 gap-1 pb-1">
                    {NOTION_TEXT_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSetSelectedTextColor(c.color)}
                        className="h-6 w-full rounded flex items-center justify-center font-bold text-xs border border-border/40 hover:scale-110 hover:border-txt-brand bg-accent/20 cursor-pointer transition-transform"
                        style={{ color: c.color === "inherit" ? undefined : c.color }}
                        title={c.label}
                      >
                        A
                      </button>
                    ))}
                  </div>

                  <Separator className="my-1.5" />
                  <NotionMenuSectionHeader>Background color</NotionMenuSectionHeader>
                  <div className="grid grid-cols-5 gap-1">
                    {NOTION_BG_HIGHLIGHTS.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => handleSetSelectedCellBg(bg.bg)}
                        className="h-6 w-full rounded border border-border/40 hover:scale-110 hover:border-txt-brand cursor-pointer flex items-center justify-center transition-transform"
                        style={{ backgroundColor: bg.bg }}
                        title={bg.label}
                      >
                        {bg.bg === "transparent" && <span className="text-[10px] text-txt-muted">∅</span>}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Separator className="my-1" />

              {/* Merge / Split cells */}
              <NotionMenuItem
                icon={<Combine className="h-3.5 w-3.5 text-purple-400" />}
                onClick={handleMergeOrSplit}
              >
                Merge / Split cells
              </NotionMenuItem>

              {/* Clear contents */}
              <NotionMenuItem
                icon={<Eraser className="h-3.5 w-3.5 text-txt-muted" />}
                onClick={handleClearSelectedCells}
              >
                Clear contents
              </NotionMenuItem>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
