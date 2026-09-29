"use client";

import React, { useState } from "react";
import {
  MousePointer2,
  Hand,
  Pen,
  StickyNote,
  Square,
  Circle,
  Diamond,
  ArrowUpRight,
  Type,
  LayoutGrid,
  Table as TableIcon,
  Smile,
  MessageSquare,
  ChevronDown,
  Triangle,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { useWhiteboardStore } from "../_hooks/use-whiteboard-store";
import type { WhiteboardTool, ShapeType } from "../_types/whiteboard.types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const STICKY_COLORS = [
  { name: "Yellow", value: "#FEF08A" },
  { name: "Blue", value: "#BAE6FD" },
  { name: "Green", value: "#BBF7D0" },
  { name: "Pink", value: "#FBCFE8" },
  { name: "Purple", value: "#E9D5FF" },
  { name: "Orange", value: "#FED7AA" },
];

import { ShapesCatalogDialog, FIGJAM_COLOR_PRESETS } from "./shapes-catalog-dialog";

export function WhiteboardToolbar() {
  const {
    activeTool,
    setActiveTool,
    selectedShapeType,
    setSelectedShapeType,
    selectedShapeColor,
    setSelectedShapeColor,
    selectedStickyColor,
    setSelectedStickyColor,
    addElement,
    board,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useWhiteboardStore();

  const [isShapeSubMenuOpen, setIsShapeSubMenuOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  const activePage =
    board.pages.find((p) => p.id === board.activePageId) || board.pages[0];
  const currentZoom = Math.round((activePage?.viewport?.zoom ?? 1) * 100);

  const handleSelectShapeTool = (shapeType: ShapeType) => {
    setSelectedShapeType(shapeType);
    setActiveTool("shape");
  };

  const handleQuickAddSticky = (color: string) => {
    setSelectedStickyColor(color);
    setActiveTool("sticky");
  };

  const handleQuickAddText = () => {
    setActiveTool("text");
  };

  const handleQuickAddSection = () => {
    setActiveTool("section");
  };

  return (
    <>
      {/* FigJam Sub-Toolbar for Shapes & Connectors (Floating Above Dock) */}
      {(activeTool === "shape" || activeTool === "connector" || isShapeSubMenuOpen) && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-md px-3 py-1.5 shadow-2xl select-none animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Shape Color / Style Picker Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 rounded-xl px-2.5 py-1 bg-accent/60 hover:bg-accent border border-border/80 text-xs font-semibold transition-colors"
                title="Select Shape Color"
              >
                <span
                  className="h-4 w-4 rounded-full border border-black/20 shadow-xs"
                  style={{ backgroundColor: selectedShapeColor }}
                />
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" sideOffset={12} className="w-[280px] p-2.5 bg-[#1E1E1E] border-white/10 rounded-2xl shadow-2xl">
              <div className="grid grid-cols-9 gap-1.5">
                {FIGJAM_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedShapeColor(color)}
                    type="button"
                    className="h-5 w-5 rounded-full border border-black/20 transition-transform hover:scale-125 active:scale-95"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="h-5 w-[1px] bg-border mx-1" />

          {/* Connector Arrow Tool */}
          <button
            onClick={() => setActiveTool("connector")}
            type="button"
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
              activeTool === "connector"
                ? "bg-purple-600 text-white shadow-xs"
                : "hover:bg-accent text-muted-foreground hover:text-foreground"
            }`}
            title="Connector (Arrow)"
          >
            <ArrowUpRight className="h-4 w-4" />
          </button>

          {/* Shape: Rounded Square */}
          <button
            onClick={() => handleSelectShapeTool("rectangle")}
            type="button"
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
              activeTool === "shape" && selectedShapeType === "rectangle"
                ? "border-2 border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-950/40"
                : "hover:bg-accent text-muted-foreground hover:text-foreground"
            }`}
            title="Rectangle"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="3" width="18" height="18" rx="4" />
            </svg>
          </button>

          {/* Shape: Circle */}
          <button
            onClick={() => handleSelectShapeTool("circle")}
            type="button"
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
              activeTool === "shape" && selectedShapeType === "circle"
                ? "border-2 border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-950/40"
                : "hover:bg-accent text-muted-foreground hover:text-foreground"
            }`}
            title="Circle"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="9" />
            </svg>
          </button>

          {/* Shape: Diamond */}
          <button
            onClick={() => handleSelectShapeTool("diamond")}
            type="button"
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
              activeTool === "shape" && selectedShapeType === "diamond"
                ? "border-2 border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-950/40"
                : "hover:bg-accent text-muted-foreground hover:text-foreground"
            }`}
            title="Diamond"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2.5L21.5 12L12 21.5L2.5 12Z" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Shape: Triangle Up */}
          <button
            onClick={() => handleSelectShapeTool("triangle")}
            type="button"
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
              activeTool === "shape" && selectedShapeType === "triangle"
                ? "border-2 border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-950/40"
                : "hover:bg-accent text-muted-foreground hover:text-foreground"
            }`}
            title="Triangle"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M12 4L22 20H2Z" />
            </svg>
          </button>

          {/* Shape: Pill / Oval */}
          <button
            onClick={() => handleSelectShapeTool("pill")}
            type="button"
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
              activeTool === "shape" && selectedShapeType === "pill"
                ? "border-2 border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-950/40"
                : "hover:bg-accent text-muted-foreground hover:text-foreground"
            }`}
            title="Pill / Rounded"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="2" y="6" width="20" height="12" rx="6" />
            </svg>
          </button>

          <div className="h-5 w-[1px] bg-border mx-1" />

          {/* More Shapes Button */}
          <button
            onClick={() => setIsCatalogOpen(true)}
            type="button"
            className="flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-semibold bg-accent hover:bg-accent/80 text-foreground transition-colors border border-border/70 shadow-2xs"
            title="Open Full Shapes Catalog"
          >
            <span>More shapes</span>
          </button>
        </div>
      )}

      {/* Shapes Catalog Dialog */}
      <ShapesCatalogDialog
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectShape={(shape) => {
          setSelectedShapeType(shape);
          setActiveTool("shape");
        }}
      />

      {/* Floating Bottom FigJam Dock */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-md p-1.5 shadow-2xl select-none transition-all">
        {/* 1. Select Tool (Pointer) */}
        <button
          onClick={() => {
            setActiveTool("select");
            setIsShapeSubMenuOpen(false);
          }}
          type="button"
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
            activeTool === "select"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
          title="Select (V)"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M4 3l13 9.5-6.5 1.5 3.5 7-3 1.5-3.5-7L4 18V3z" />
          </svg>
        </button>

        {/* 2. Hand Tool (Pan Canvas) */}
        <button
          onClick={() => {
            setActiveTool("hand");
            setIsShapeSubMenuOpen(false);
          }}
          type="button"
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
            activeTool === "hand"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
          title="Hand / Pan tool (H)"
        >
          <Hand className="h-5 w-5" />
        </button>

        <div className="h-5 w-[1px] bg-border/80 mx-0.5" />

        {/* 3. Pen / Freehand Draw */}
        <button
          onClick={() => {
            setActiveTool("pen");
            setIsShapeSubMenuOpen(false);
          }}
          type="button"
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
            activeTool === "pen"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
          title="Pen / Draw (P)"
        >
          <Pen className="h-4 w-4" />
        </button>

        {/* 4. Sticky Note Tool with FigJam folded corner icon */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              onClick={() => setActiveTool("sticky")}
              type="button"
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                activeTool === "sticky"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
              title="Sticky Notes (S)"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path d="M4 3h16a1 1 0 0 1 1 1v11l-5 5H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#FBBF24" />
                <path d="M16 15v5l5-5h-5z" fill="#D97706" opacity="0.6" />
              </svg>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" sideOffset={12} className="w-auto p-2 rounded-xl">
            <div className="flex items-center gap-2">
              {STICKY_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => handleQuickAddSticky(c.value)}
                  type="button"
                  className="h-7 w-7 rounded-lg border border-black/10 shadow-xs transition-transform hover:scale-110 active:scale-95"
                  style={{ backgroundColor: c.value }}
                  title={`Select ${c.name} Sticky`}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* 5. Shape Tool (Purple rounded square background when active) */}
        <button
          onClick={() => {
            setActiveTool("shape");
            setIsShapeSubMenuOpen(!isShapeSubMenuOpen);
          }}
          type="button"
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
            activeTool === "shape" || activeTool === "connector"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
          title="Shapes & Connectors (Hold & drag on canvas to draw)"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
          </svg>
        </button>

        {/* 6. Text Tool */}
        <button
          onClick={handleQuickAddText}
          type="button"
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
            activeTool === "text"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
          title="Text (T)"
        >
          <Type className="h-4 w-4" />
        </button>

        {/* 7. Section / Frame Tool (4 squares) */}
        <button
          onClick={handleQuickAddSection}
          type="button"
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
            activeTool === "section"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
          title="Section / Frame (F)"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>

        {/* 8. Table Tool */}
        <button
          onClick={() => {
            addElement({
              type: "shape",
              x: 200,
              y: 200,
              width: 320,
              height: 180,
              title: "Quick Table",
              content: "Feature | Status | Owner\n-------|--------|------\nAuth   | Done   | @salva\nBoard  | Dev    | @goen",
              color: "#FFFFFF",
            });
          }}
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
          title="Table grid"
        >
          <TableIcon className="h-4 w-4" />
        </button>

        {/* 9. Stamp / Reaction */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
              title="Stamp / Reaction"
            >
              <Smile className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" sideOffset={12} className="w-auto p-1.5 rounded-xl">
            <div className="flex items-center gap-1.5 text-lg">
              {["👍", "❤️", "🔥", "🚀", "💡", "⚠️", "🎉"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    addElement({
                      type: "text",
                      x: 250 + Math.random() * 40,
                      y: 250 + Math.random() * 40,
                      width: 50,
                      height: 50,
                      content: emoji,
                      color: "transparent",
                    });
                  }}
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* 10. Chat / Speech Bubble */}
        <button
          onClick={() => {
            addElement({
              type: "sticky",
              x: 220,
              y: 220,
              width: 190,
              height: 120,
              title: "Comment",
              content: "Let's review this flow with the team!",
              color: "#E9D5FF",
            });
          }}
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
          title="Add Comment Bubble"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>

      {/* Zoom Controls Pill (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center rounded-2xl border border-border/80 bg-background/95 backdrop-blur-md p-1 shadow-2xl select-none">
        <button
          onClick={zoomOut}
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Zoom Out (-)"
        >
          <Minus className="h-4 w-4" />
        </button>

        <button
          onClick={resetZoom}
          type="button"
          className="px-2 text-xs font-semibold text-foreground hover:text-primary transition-colors min-w-[48px] text-center"
          title="Reset Zoom (100%)"
        >
          {currentZoom}%
        </button>

        <button
          onClick={zoomIn}
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Zoom In (+)"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
