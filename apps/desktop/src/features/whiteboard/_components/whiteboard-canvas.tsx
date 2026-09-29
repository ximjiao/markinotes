"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useWhiteboardStore } from "../_hooks/use-whiteboard-store";
import { WhiteboardContextBar } from "./whiteboard-context-bar";
import { ShapeSvgRenderer } from "./shape-svg-renderer";
import type {
  WhiteboardElement,
  WhiteboardConnector,
  CanvasPosition,
  ShapeType,
} from "../_types/whiteboard.types";

export function WhiteboardCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    board,
    activeTool,
    setActiveTool,
    selectedShapeType,
    selectedShapeColor,
    selectedStickyColor,
    selectedElementIds,
    setSelectedElementIds,
    updateViewport,
    updateElement,
    deleteElements,
    addElement,
    addConnector,
  } = useWhiteboardStore();

  const activePage =
    board.pages.find((p) => p.id === board.activePageId) || board.pages[0];

  const viewport = activePage?.viewport || { x: 0, y: 0, zoom: 1 };

  // Local interaction states
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<CanvasPosition>({ x: 0, y: 0 });

  // Dragging Element State
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<CanvasPosition>({ x: 0, y: 0 });

  // Resizing Element State (Corner Handles)
  const [resizingHandle, setResizingHandle] = useState<{
    elementId: string;
    corner: "tl" | "tr" | "bl" | "br";
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    initialMouseX: number;
    initialMouseY: number;
  } | null>(null);

  // Shape Creation Drag State (Hold & Tarik)
  const [isCreatingShape, setIsCreatingShape] = useState(false);
  const [shapeCreateStart, setShapeCreateStart] = useState<CanvasPosition | null>(null);
  const [shapePreview, setShapePreview] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    shapeType: ShapeType;
  } | null>(null);

  // Freehand Drawing (Pen) State
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawPoints, setCurrentDrawPoints] = useState<CanvasPosition[]>([]);

  // Connector Drawing State
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [connectorDragPos, setConnectorDragPos] = useState<CanvasPosition | null>(null);

  // Convert screen coordinates to canvas world coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): CanvasPosition => {
      const rect = containerRef.current?.getBoundingClientRect();
      const containerLeft = rect?.left || 0;
      const containerTop = rect?.top || 0;

      const relX = screenX - containerLeft;
      const relY = screenY - containerTop;

      return {
        x: (relX - viewport.x) / viewport.zoom,
        y: (relY - viewport.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  // Handle Canvas Mousedown (Panning, Pen, or Hold & Tarik Shape Creation)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // 1. Pan canvas
    if (e.button === 1 || activeTool === "hand" || isSpacePressed) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      return;
    }

    if (e.button === 0) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);

      // 2. Shape / Sticky / Section Creation (Hold & Tarik)
      if (["shape", "sticky", "section", "text"].includes(activeTool)) {
        setIsCreatingShape(true);
        setShapeCreateStart(canvasPos);
        setShapePreview({
          x: canvasPos.x,
          y: canvasPos.y,
          width: 0,
          height: 0,
          shapeType: "rectangle",
        });
        return;
      }

      // 3. Pen Drawing
      if (activeTool === "pen") {
        setIsDrawing(true);
        setCurrentDrawPoints([canvasPos]);
        return;
      }

      // 4. Click empty canvas clears selection & connecting state
      if ((e.target as HTMLElement).getAttribute("data-canvas-bg") === "true") {
        setSelectedElementIds([]);
        setConnectingSourceId(null);
        setConnectorDragPos(null);
      }
    }
  };

  // RAF throttle ref for buttery 60fps/120fps dragging
  const rafRef = useRef<number | null>(null);

  // Global Window MouseMove & MouseUp listeners for buttery-smooth interaction
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const canvasPos = screenToCanvas(e.clientX, e.clientY);

        // 1. Panning canvas
        if (isPanning) {
          updateViewport({
            x: e.clientX - panStart.x,
            y: e.clientY - panStart.y,
          });
          return;
        }

        // 2. Shape Creation Drag (Hold & Tarik live preview)
        if (isCreatingShape && shapeCreateStart) {
          const x = Math.min(shapeCreateStart.x, canvasPos.x);
          const y = Math.min(shapeCreateStart.y, canvasPos.y);
          const width = Math.max(10, Math.abs(canvasPos.x - shapeCreateStart.x));
          const height = Math.max(10, Math.abs(canvasPos.y - shapeCreateStart.y));

          setShapePreview({
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
            shapeType: "rectangle",
          });
          return;
        }

        // 3. Connector Dragging
        if (connectingSourceId) {
          setConnectorDragPos(canvasPos);
        }

        // 4. Dragging Element (Instant 1:1 hardware tracked)
        if (draggingElementId) {
          updateElement(draggingElementId, {
            x: Math.round(canvasPos.x - dragOffset.x),
            y: Math.round(canvasPos.y - dragOffset.y),
          });
          return;
        }

        // 5. Corner Resizing (4-Corner FigJam Handles)
        if (resizingHandle) {
          const deltaX = (e.clientX - resizingHandle.initialMouseX) / viewport.zoom;
          const deltaY = (e.clientY - resizingHandle.initialMouseY) / viewport.zoom;

          let newX = resizingHandle.initialX;
          let newY = resizingHandle.initialY;
          let newWidth = resizingHandle.initialWidth;
          let newHeight = resizingHandle.initialHeight;

          if (resizingHandle.corner === "br") {
            newWidth = Math.max(80, resizingHandle.initialWidth + deltaX);
            newHeight = Math.max(60, resizingHandle.initialHeight + deltaY);
          } else if (resizingHandle.corner === "tr") {
            newWidth = Math.max(80, resizingHandle.initialWidth + deltaX);
            newHeight = Math.max(60, resizingHandle.initialHeight - deltaY);
            newY = resizingHandle.initialY + (resizingHandle.initialHeight - newHeight);
          } else if (resizingHandle.corner === "bl") {
            newWidth = Math.max(80, resizingHandle.initialWidth - deltaX);
            newHeight = Math.max(60, resizingHandle.initialHeight + deltaY);
            newX = resizingHandle.initialX + (resizingHandle.initialWidth - newWidth);
          } else if (resizingHandle.corner === "tl") {
            newWidth = Math.max(80, resizingHandle.initialWidth - deltaX);
            newHeight = Math.max(60, resizingHandle.initialHeight - deltaY);
            newX = resizingHandle.initialX + (resizingHandle.initialWidth - newWidth);
            newY = resizingHandle.initialY + (resizingHandle.initialHeight - newHeight);
          }

          updateElement(resizingHandle.elementId, {
            x: Math.round(newX),
            y: Math.round(newY),
            width: Math.round(newWidth),
            height: Math.round(newHeight),
          });
          return;
        }

        // 6. Freehand Pen Drawing
        if (isDrawing && activeTool === "pen") {
          setCurrentDrawPoints((prev) => [...prev, canvasPos]);
        }
      });
    };

    const handleGlobalMouseUp = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (isPanning) setIsPanning(false);
      if (draggingElementId) setDraggingElementId(null);
      if (resizingHandle) setResizingHandle(null);

      // Commit Shape Creation from Hold & Tarik
      if (isCreatingShape && shapeCreateStart && shapePreview) {
        setIsCreatingShape(false);
        setShapeCreateStart(null);

        const isQuickClick = shapePreview.width < 25 && shapePreview.height < 25;
        const width = isQuickClick ? 180 : Math.max(80, shapePreview.width);
        const height = isQuickClick ? 180 : Math.max(60, shapePreview.height);
        const x = isQuickClick ? shapeCreateStart.x - width / 2 : shapePreview.x;
        const y = isQuickClick ? shapeCreateStart.y - height / 2 : shapePreview.y;

        let newId = "";
        if (activeTool === "sticky") {
          newId = addElement({
            type: "sticky",
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
            title: "",
            content: "Type anything, @mention anyone",
            color: selectedStickyColor || "#FEF08A",
          });
        } else if (activeTool === "section") {
          newId = addElement({
            type: "section",
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
            title: "Section Frame",
            content: "",
            color: "rgba(241, 245, 249, 0.4)",
          });
        } else if (activeTool === "text") {
          newId = addElement({
            type: "text",
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
            content: "Heading or paragraph text",
            color: "transparent",
          });
        } else {
          // Shape: uses selectedShapeType and selectedShapeColor
          newId = addElement({
            type: "shape",
            shapeType: selectedShapeType || "rectangle",
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
            title: "",
            content: "",
            color: selectedShapeColor || "#FFFFFF",
          });
        }

        setShapePreview(null);
        setActiveTool("select");
        if (newId) setSelectedElementIds([newId]);
        return;
      }

      // Commit Pen Draw
      if (isDrawing && activeTool === "pen") {
        setIsDrawing(false);
        if (currentDrawPoints.length > 2) {
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;

          currentDrawPoints.forEach((p) => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          });

          addElement({
            type: "draw",
            x: minX,
            y: minY,
            width: Math.max(20, maxX - minX),
            height: Math.max(20, maxY - minY),
            content: "",
            points: currentDrawPoints,
            color: "#A855F7",
            strokeWidth: 3,
          });
        }
        setCurrentDrawPoints([]);
      }
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [
    isPanning,
    panStart,
    isCreatingShape,
    shapeCreateStart,
    shapePreview,
    draggingElementId,
    dragOffset,
    resizingHandle,
    connectingSourceId,
    isDrawing,
    currentDrawPoints,
    activeTool,
    screenToCanvas,
    updateViewport,
    updateElement,
    addElement,
    setActiveTool,
    setSelectedElementIds,
    viewport.zoom,
  ]);

  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  // Non-passive Wheel handler for precision focal-point cursor zoom & smooth pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const curVp = viewportRef.current;

      if (e.ctrlKey || e.metaKey || e.altKey) {
        // Precision zoom centered on mouse cursor position
        const rect = container.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        // Calculate world point under cursor before zoom
        const worldX = (cursorX - curVp.x) / curVp.zoom;
        const worldY = (cursorY - curVp.y) / curVp.zoom;

        // Smooth exponential zoom factor
        const zoomFactor = Math.exp(-e.deltaY * 0.005);
        const nextZoom = Math.min(3.5, Math.max(0.15, +(curVp.zoom * zoomFactor).toFixed(3)));

        // Keep the exact target point stationary under the cursor
        const nextX = cursorX - worldX * nextZoom;
        const nextY = cursorY - worldY * nextZoom;

        updateViewport({
          zoom: nextZoom,
          x: nextX,
          y: nextY,
        });
      } else {
        // 2-finger Pan canvas
        updateViewport({
          x: curVp.x - e.deltaX,
          y: curVp.y - e.deltaY,
        });
      }
    };

    container.addEventListener("wheel", onWheelHandler, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheelHandler);
    };
  }, [updateViewport]);

  // Keyboard delete and spacebar listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isSpacePressed) {
        const isEditingInput = ["INPUT", "TEXTAREA"].includes(
          (document.activeElement as HTMLElement)?.tagName
        );
        if (!isEditingInput) {
          setIsSpacePressed(true);
        }
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedElementIds.length > 0) {
        const isEditingInput = ["INPUT", "TEXTAREA"].includes(
          (document.activeElement as HTMLElement)?.tagName
        );
        if (!isEditingInput) {
          deleteElements(selectedElementIds);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedElementIds, deleteElements, isSpacePressed]);

  // Initiate corner resize drag
  const startResize = (
    e: React.MouseEvent,
    el: WhiteboardElement,
    corner: "tl" | "tr" | "bl" | "br"
  ) => {
    e.stopPropagation();
    setResizingHandle({
      elementId: el.id,
      corner,
      initialX: el.x,
      initialY: el.y,
      initialWidth: el.width,
      initialHeight: el.height,
      initialMouseX: e.clientX,
      initialMouseY: e.clientY,
    });
  };

  return (
    <div
      ref={containerRef}
      data-canvas-bg="true"
      onMouseDown={handleCanvasMouseDown}
      className={`relative h-full w-full overflow-hidden select-none bg-slate-50 dark:bg-slate-950 ${
        activeTool === "hand" || isPanning || isSpacePressed
          ? "cursor-grab active:cursor-grabbing"
          : activeTool === "pen"
          ? "cursor-crosshair"
          : ["shape", "sticky", "section", "text"].includes(activeTool)
          ? "cursor-crosshair"
          : "cursor-default"
      }`}
      style={{
        backgroundImage: `radial-gradient(circle, currentColor 1.2px, transparent 1.2px)`,
        backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        color: "rgba(148, 163, 184, 0.4)",
      }}
    >
      {/* SVG Connectors & Freehand Drawings Layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {/* Active Connectors */}
        {activePage?.connectors?.map((conn) => {
          const src = activePage.elements.find((e) => e.id === conn.sourceId);
          const tgt = activePage.elements.find((e) => e.id === conn.targetId);
          if (!src || !tgt) return null;

          const x1 = (src.x + src.width / 2) * viewport.zoom + viewport.x;
          const y1 = (src.y + src.height / 2) * viewport.zoom + viewport.y;
          const x2 = (tgt.x + tgt.width / 2) * viewport.zoom + viewport.x;
          const y2 = (tgt.y + tgt.height / 2) * viewport.zoom + viewport.y;

          return (
            <g key={conn.id} className="group">
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={conn.color || "#818CF8"}
                strokeWidth={Math.max(2, 2.5 * viewport.zoom)}
                strokeDasharray={`${6 * viewport.zoom} ${3 * viewport.zoom}`}
              />
              <circle cx={x2} cy={y2} r={Math.max(3.5, 5 * viewport.zoom)} fill={conn.color || "#818CF8"} />
              {conn.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 8 * viewport.zoom}
                  textAnchor="middle"
                  style={{ fontSize: `${Math.max(10, 12 * viewport.zoom)}px` }}
                  className="font-semibold fill-slate-600 dark:fill-slate-300 select-none"
                >
                  {conn.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Active Connector Live Drag Preview */}
        {connectingSourceId && connectorDragPos && (
          (() => {
            const src = activePage?.elements.find((e) => e.id === connectingSourceId);
            if (!src) return null;
            const x1 = (src.x + src.width / 2) * viewport.zoom + viewport.x;
            const y1 = (src.y + src.height / 2) * viewport.zoom + viewport.y;
            const x2 = connectorDragPos.x * viewport.zoom + viewport.x;
            const y2 = connectorDragPos.y * viewport.zoom + viewport.y;
            return (
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#0D99FF"
                strokeWidth={Math.max(2, 2.5 * viewport.zoom)}
                strokeDasharray={`${4 * viewport.zoom} ${2 * viewport.zoom}`}
              />
            );
          })()
        )}

        {/* Active Freehand Draw in progress */}
        {isDrawing && currentDrawPoints.length > 1 && (
          <path
            d={currentDrawPoints.reduce((acc, p, idx) => {
              const sx = p.x * viewport.zoom + viewport.x;
              const sy = p.y * viewport.zoom + viewport.y;
              return idx === 0 ? `M ${sx} ${sy}` : `${acc} L ${sx} ${sy}`;
            }, "")}
            stroke="#A855F7"
            strokeWidth={Math.max(2, 3 * viewport.zoom)}
            fill="none"
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Live Hold & Tarik Shape Creation Preview */}
      {isCreatingShape && shapePreview && (
        <div
          className="absolute pointer-events-none transition-none"
          style={{
            left: `${shapePreview.x * viewport.zoom + viewport.x}px`,
            top: `${shapePreview.y * viewport.zoom + viewport.y}px`,
            width: `${shapePreview.width * viewport.zoom}px`,
            height: `${shapePreview.height * viewport.zoom}px`,
          }}
        >
          {activeTool === "shape" ? (
            <ShapeSvgRenderer
              shapeType={selectedShapeType || "rectangle"}
              width={shapePreview.width * viewport.zoom}
              height={shapePreview.height * viewport.zoom}
              color={selectedShapeColor || "#FFFFFF"}
              stroke="#0D99FF"
              strokeWidth={2}
            />
          ) : (
            <div className="w-full h-full rounded-2xl border-2 border-dashed border-[#0D99FF] bg-[#0D99FF]/10" />
          )}
        </div>
      )}

      {/* Elements Layer in Native Screen Coordinates (100% HD Vector & Crisp Font Antialiasing) */}
      {activePage?.elements?.map((el) => {
        const isSelected = selectedElementIds.includes(el.id);
        const screenX = el.x * viewport.zoom + viewport.x;
        const screenY = el.y * viewport.zoom + viewport.y;
        const screenW = el.width * viewport.zoom;
        const screenH = el.height * viewport.zoom;

        const baseFontSize =
          el.fontSize === "huge"
            ? 26
            : el.fontSize === "large"
            ? 18
            : el.fontSize === "medium"
            ? 14
            : 12;
        const fontSizePx = baseFontSize * viewport.zoom;
        const titleFontSizePx = Math.max(10, 14 * viewport.zoom);
        const paddingPx = Math.max(6, 14 * viewport.zoom);
        const borderRadiusPx = Math.max(6, 16 * viewport.zoom);

        return (
          <div
            key={el.id}
            onClick={(e) => {
              e.stopPropagation();
              if (activeTool === "connector" && connectingSourceId) {
                if (connectingSourceId !== el.id) {
                  addConnector({
                    sourceId: connectingSourceId,
                    targetId: el.id,
                    style: "curved",
                  });
                }
                setConnectingSourceId(null);
                setConnectorDragPos(null);
                setActiveTool("select");
                return;
              }
              setSelectedElementIds([el.id]);
            }}
            onMouseDown={(e) => {
              if (activeTool === "select") {
                e.stopPropagation();
                setSelectedElementIds([el.id]);
                setDraggingElementId(el.id);
                const mouseCanvas = screenToCanvas(e.clientX, e.clientY);
                setDragOffset({
                  x: mouseCanvas.x - el.x,
                  y: mouseCanvas.y - el.y,
                });
              }
            }}
            className={`absolute group pointer-events-auto select-none ${
              draggingElementId === el.id ? "transition-none cursor-grabbing" : "transition-shadow cursor-grab"
            } ${
              isSelected
                ? el.type === "sticky" || el.type === "section"
                  ? "ring-2 ring-[#0D99FF] shadow-2xl z-20"
                  : "z-20"
                : el.type === "sticky" || el.type === "section"
                ? "shadow-md hover:shadow-xl hover:ring-1 hover:ring-black/10 z-10"
                : "z-10"
            } ${
              el.type === "section"
                ? "border-2 border-dashed border-purple-400/60"
                : el.type === "sticky"
                ? "border border-black/10"
                : ""
            }`}
            style={{
              left: `${screenX}px`,
              top: `${screenY}px`,
              width: `${screenW}px`,
              minHeight: `${screenH}px`,
              borderRadius: `${borderRadiusPx}px`,
              backgroundColor:
                el.type === "sticky"
                  ? el.color || "#FEF08A"
                  : el.type === "section"
                  ? el.color || "rgba(241, 245, 249, 0.4)"
                  : "transparent",
            }}
          >
            {/* Vector Shape SVG (for all shape types: rectangle, circle, diamond, triangle, pill, database, etc.) */}
            {el.type === "shape" && (
              <ShapeSvgRenderer
                shapeType={el.shapeType || "rectangle"}
                width={screenW}
                height={screenH}
                color={el.color || "#FFFFFF"}
                stroke={isSelected ? "#0D99FF" : "#CBD5E1"}
                strokeWidth={2}
              />
            )}

            {/* Element Card Body Content */}
            {el.type === "sticky" ? (
              // Sticky Note: Top-aligned natural handwriting style
              <div
                className="relative z-10 flex h-full flex-col justify-start items-start text-left cursor-move"
                style={{ padding: `${paddingPx}px` }}
              >
                {el.title !== undefined && el.title !== "" && (
                  <input
                    type="text"
                    value={el.title || ""}
                    placeholder="Title..."
                    onChange={(e) => updateElement(el.id, { title: e.target.value })}
                    style={{ fontSize: `${Math.max(10, 12 * viewport.zoom)}px` }}
                    className="w-full bg-transparent font-bold text-slate-900/80 focus:outline-none placeholder:text-slate-500/70 mb-1"
                  />
                )}
                <textarea
                  value={el.content || ""}
                  placeholder="Type anything..."
                  onChange={(e) => updateElement(el.id, { content: e.target.value })}
                  style={{
                    fontSize: `${fontSizePx}px`,
                    lineHeight: 1.4,
                  }}
                  className={`w-full flex-1 resize-none bg-transparent text-slate-900 focus:outline-none placeholder:text-slate-500/70 cursor-text ${
                    el.isBold ? "font-bold" : ""
                  } ${el.isStrike ? "line-through opacity-70" : ""}`}
                />
              </div>
            ) : el.type === "section" ? (
              // Section Frame: Top-left title
              <div
                className="relative z-10 flex h-full flex-col justify-between cursor-move pointer-events-none"
                style={{ padding: `${paddingPx}px` }}
              >
                <input
                  type="text"
                  value={el.title || "Section"}
                  placeholder="Section Name"
                  onChange={(e) => updateElement(el.id, { title: e.target.value })}
                  style={{
                    fontSize: `${Math.max(10, 12 * viewport.zoom)}px`,
                    maxWidth: `${Math.max(120, 200 * viewport.zoom)}px`,
                  }}
                  className="w-auto bg-purple-500/10 rounded-md px-2 py-0.5 font-bold text-purple-700 dark:text-purple-300 focus:outline-none pointer-events-auto"
                />
              </div>
            ) : (
              // FigJam Shape / Text: Exactly vertically & horizontally centered in the shape centroid
              <div
                className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center pointer-events-none cursor-move"
                style={{ padding: `${paddingPx}px` }}
              >
                {el.title !== undefined && el.title !== "" && (
                  <input
                    type="text"
                    value={el.title || ""}
                    placeholder="Title..."
                    onChange={(e) => updateElement(el.id, { title: e.target.value })}
                    style={{
                      fontSize: `${titleFontSizePx}px`,
                    }}
                    className="w-full max-w-[85%] bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400 text-center pointer-events-auto mb-1"
                  />
                )}
                <textarea
                  value={el.content || ""}
                  placeholder="Label..."
                  rows={Math.min(6, Math.max(1, (el.content || "").split("\n").length))}
                  onChange={(e) => updateElement(el.id, { content: e.target.value })}
                  style={{
                    fontSize: `${fontSizePx}px`,
                    lineHeight: 1.3,
                  }}
                  className={`w-full max-w-[85%] bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 text-center font-medium resize-none overflow-hidden pointer-events-auto my-auto ${
                    el.isBold ? "font-bold" : ""
                  } ${el.isStrike ? "line-through opacity-70" : ""}`}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Screen Overlay Layer: 100% Native Retina Resolution Selection Handles & Floating Context Bar */}
      {selectedElementIds.map((id) => {
        const el = activePage?.elements.find((e) => e.id === id);
        if (!el) return null;

        const screenX = el.x * viewport.zoom + viewport.x;
        const screenY = el.y * viewport.zoom + viewport.y;
        const screenWidth = el.width * viewport.zoom;
        const screenHeight = el.height * viewport.zoom;

        return (
          <React.Fragment key={`overlay-${el.id}`}>
            {/* FigJam Floating Context Bar (Razor-sharp HD at 100% device pixel ratio) */}
            <WhiteboardContextBar
              element={el}
              style={{
                left: `${screenX + screenWidth / 2}px`,
                top: `${screenY - 14}px`,
                transform: "translate(-50%, -100%)",
              }}
              onConnectClick={() => {
                setConnectingSourceId(el.id);
                setActiveTool("connector");
              }}
            />

            {/* Blue Selection Outline in Screen Coordinates */}
            <div
              className="absolute pointer-events-none rounded-2xl border-2 border-[#0D99FF] z-20"
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                width: `${screenWidth}px`,
                height: `${screenHeight}px`,
              }}
            />

            {/* 4 Corner Square Resize Handles (Crisp 10px on screen) */}
            <div
              onMouseDown={(e) => startResize(e, el, "tl")}
              className="absolute z-30 h-2.5 w-2.5 cursor-nwse-resize rounded-xs bg-white border-2 border-[#0D99FF] shadow-xs hover:scale-125 transition-transform"
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                transform: "translate(-50%, -50%)",
              }}
              title="Resize Top-Left"
            />
            <div
              onMouseDown={(e) => startResize(e, el, "tr")}
              className="absolute z-30 h-2.5 w-2.5 cursor-nesw-resize rounded-xs bg-white border-2 border-[#0D99FF] shadow-xs hover:scale-125 transition-transform"
              style={{
                left: `${screenX + screenWidth}px`,
                top: `${screenY}px`,
                transform: "translate(-50%, -50%)",
              }}
              title="Resize Top-Right"
            />
            <div
              onMouseDown={(e) => startResize(e, el, "bl")}
              className="absolute z-30 h-2.5 w-2.5 cursor-nesw-resize rounded-xs bg-white border-2 border-[#0D99FF] shadow-xs hover:scale-125 transition-transform"
              style={{
                left: `${screenX}px`,
                top: `${screenY + screenHeight}px`,
                transform: "translate(-50%, -50%)",
              }}
              title="Resize Bottom-Left"
            />
            <div
              onMouseDown={(e) => startResize(e, el, "br")}
              className="absolute z-30 h-2.5 w-2.5 cursor-nwse-resize rounded-xs bg-white border-2 border-[#0D99FF] shadow-xs hover:scale-125 transition-transform"
              style={{
                left: `${screenX + screenWidth}px`,
                top: `${screenY + screenHeight}px`,
                transform: "translate(-50%, -50%)",
              }}
              title="Resize Bottom-Right"
            />

            {/* 4 Midpoint Circle Blue Connector Dots (Crisp 10px on screen) */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setConnectingSourceId(el.id);
                setActiveTool("connector");
              }}
              className="absolute z-30 h-2.5 w-2.5 rounded-full bg-[#0D99FF] ring-2 ring-white cursor-pointer hover:scale-150 transition-transform shadow-xs"
              style={{
                left: `${screenX + screenWidth / 2}px`,
                top: `${screenY}px`,
                transform: "translate(-50%, -50%)",
              }}
              title="Drag connector from Top"
            />
            <div
              onClick={(e) => {
                e.stopPropagation();
                setConnectingSourceId(el.id);
                setActiveTool("connector");
              }}
              className="absolute z-30 h-2.5 w-2.5 rounded-full bg-[#0D99FF] ring-2 ring-white cursor-pointer hover:scale-150 transition-transform shadow-xs"
              style={{
                left: `${screenX + screenWidth / 2}px`,
                top: `${screenY + screenHeight}px`,
                transform: "translate(-50%, -50%)",
              }}
              title="Drag connector from Bottom"
            />
            <div
              onClick={(e) => {
                e.stopPropagation();
                setConnectingSourceId(el.id);
                setActiveTool("connector");
              }}
              className="absolute z-30 h-2.5 w-2.5 rounded-full bg-[#0D99FF] ring-2 ring-white cursor-pointer hover:scale-150 transition-transform shadow-xs"
              style={{
                left: `${screenX}px`,
                top: `${screenY + screenHeight / 2}px`,
                transform: "translate(-50%, -50%)",
              }}
              title="Drag connector from Left"
            />
            <div
              onClick={(e) => {
                e.stopPropagation();
                setConnectingSourceId(el.id);
                setActiveTool("connector");
              }}
              className="absolute z-30 h-2.5 w-2.5 rounded-full bg-[#0D99FF] ring-2 ring-white cursor-pointer hover:scale-150 transition-transform shadow-xs"
              style={{
                left: `${screenX + screenWidth}px`,
                top: `${screenY + screenHeight / 2}px`,
                transform: "translate(-50%, -50%)",
              }}
              title="Drag connector from Right"
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}
