"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { ShapeType } from "../_types/whiteboard.types";
import { ShapeSvgRenderer } from "./shape-svg-renderer";

interface ShapesCatalogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectShape: (shape: ShapeType) => void;
}

export const FIGJAM_COLOR_PRESETS = [
  // Row 1: Vivid
  "#1E1E1E", "#757575", "#F24E1E", "#FF7262", "#FFC700", "#0FA958", "#00B6D9", "#18A0FB", "#7B61FF", "#FF385C", "#FFFFFF",
  // Row 2: Pastel
  "#B3B3B3", "#E6E6E6", "#FFD2C9", "#FFE4D6", "#FFF1C2", "#D2EBD9", "#D0F4FB", "#D4EBFD", "#E8DEFF", "#FFDCE5",
];

const SHAPE_CATEGORIES: Array<{
  name: string;
  items: Array<{ id: ShapeType; label: string }>;
}> = [
  {
    name: "Basic Shapes",
    items: [
      { id: "rectangle", label: "Rectangle" },
      { id: "circle", label: "Circle" },
      { id: "diamond", label: "Diamond" },
      { id: "triangle", label: "Triangle Up" },
      { id: "triangle-down", label: "Triangle Down" },
      { id: "pill", label: "Pill / Oval" },
      { id: "star", label: "Star" },
      { id: "speech", label: "Speech" },
      { id: "arrow-right", label: "Arrow Right" },
      { id: "arrow-left", label: "Arrow Left" },
    ],
  },
  {
    name: "Flowchart",
    items: [
      { id: "parallelogram", label: "Data (I/O)" },
      { id: "cylinder", label: "Database" },
      { id: "document", label: "Document" },
      { id: "folder", label: "Folder" },
      { id: "trapezoid", label: "Manual Op" },
      { id: "hexagon", label: "Preparation" },
      { id: "predefined-process", label: "Process" },
    ],
  },
  {
    name: "Advanced & System",
    items: [
      { id: "server", label: "Server" },
      { id: "cloud", label: "Cloud Service" },
      { id: "cpu", label: "Microchip/CPU" },
      { id: "cube", label: "Container/Box" },
      { id: "shield", label: "Security/Shield" },
      { id: "key", label: "Auth Key" },
      { id: "mail", label: "Event/Mail" },
      { id: "terminal", label: "CLI Terminal" },
      { id: "mobile", label: "Mobile App" },
      { id: "globe", label: "Web/Globe" },
      { id: "user", label: "User/Actor" },
      { id: "gear", label: "Settings/Worker" },
      { id: "lightning", label: "Webhook/Trigger" },
    ],
  },
];

export function ShapesCatalogDialog({
  isOpen,
  onClose,
  onSelectShape,
}: ShapesCatalogDialogProps) {
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const [expandedCats, setExpandedCats] = useState<string[]>([
    "Basic Shapes",
    "Flowchart",
    "Advanced & System",
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const toggleCat = (catName: string) => {
    setExpandedCats((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center select-none animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Dialog Modal */}
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl p-0 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2 border-b border-border/50">
          <h2 className="text-sm font-bold text-foreground">Shapes Catalog</h2>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-4 py-2.5 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search shapes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-purple-500/30 bg-purple-500/5 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
              autoFocus
            />
          </div>
        </div>

        {/* Categories List */}
        <div className="max-h-[360px] overflow-y-auto p-4 space-y-4">
          {SHAPE_CATEGORIES.map((cat) => {
            const filteredItems = cat.items.filter((i) =>
              i.label.toLowerCase().includes(search.toLowerCase())
            );

            if (filteredItems.length === 0) return null;
            const isExpanded = expandedCats.includes(cat.name);

            return (
              <div key={cat.name} className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleCat(cat.name)}
                  className="flex w-full items-center justify-between text-xs font-bold text-foreground hover:text-purple-600 transition-colors"
                >
                  <span>{cat.name}</span>
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>

                {isExpanded && (
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {filteredItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectShape(item.id);
                          onClose();
                        }}
                        type="button"
                        className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card/60 p-2 hover:border-purple-500 hover:bg-purple-500/10 transition-all active:scale-95 text-muted-foreground hover:text-purple-600"
                        title={item.label}
                      >
                        <div className="relative h-7 w-7 flex items-center justify-center">
                          <ShapeSvgRenderer
                            shapeType={item.id}
                            width={28}
                            height={28}
                            color="#FFFFFF"
                            stroke="currentColor"
                            strokeWidth={1.8}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-center truncate max-w-full leading-tight">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
