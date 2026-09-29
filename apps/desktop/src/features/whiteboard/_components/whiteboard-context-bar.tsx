"use client";

import React from "react";
import {
  Bold,
  Strikethrough,
  Link as LinkIcon,
  Trash2,
  ChevronDown,
  Copy,
  Type,
} from "lucide-react";
import { useWhiteboardStore } from "../_hooks/use-whiteboard-store";
import type { WhiteboardElement } from "../_types/whiteboard.types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FIGJAM_COLORS = [
  { name: "Green", value: "#BBF7D0" },
  { name: "Yellow", value: "#FEF08A" },
  { name: "Blue", value: "#BAE6FD" },
  { name: "Pink", value: "#FBCFE8" },
  { name: "Purple", value: "#E9D5FF" },
  { name: "Orange", value: "#FED7AA" },
  { name: "White", value: "#FFFFFF" },
  { name: "Gray", value: "#F1F5F9" },
];

const FONT_SIZES = [
  { label: "Small", value: "small" },
  { label: "Medium", value: "medium" },
  { label: "Large", value: "large" },
  { label: "Huge", value: "huge" },
];

interface WhiteboardContextBarProps {
  element: WhiteboardElement;
  style?: React.CSSProperties;
  onConnectClick: () => void;
}

export function WhiteboardContextBar({
  element,
  style,
  onConnectClick,
}: WhiteboardContextBarProps) {
  const { updateElement, deleteElements, addElement } = useWhiteboardStore();

  const handleColorChange = (color: string) => {
    updateElement(element.id, { color });
  };

  const handleFontSizeChange = (fontSize: "small" | "medium" | "large" | "huge") => {
    updateElement(element.id, { fontSize });
  };

  const handleToggleBold = () => {
    updateElement(element.id, { isBold: !element.isBold });
  };

  const handleToggleStrike = () => {
    updateElement(element.id, { isStrike: !element.isStrike });
  };

  const handleDuplicate = () => {
    addElement({
      ...element,
      x: element.x + 30,
      y: element.y + 30,
      title: element.title ? `${element.title} (Copy)` : undefined,
    });
  };

  const currentSizeLabel =
    FONT_SIZES.find((s) => s.value === (element.fontSize || "small"))?.label || "Small";

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-30 flex items-center gap-1 rounded-xl bg-[#1E1E1E] text-white shadow-2xl border border-white/10 px-2 py-1 select-none animate-in fade-in duration-100"
      style={style}
    >
      {/* 1. Color Swatch Dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-white/10 transition-colors"
            title="Change Color"
          >
            <span
              className="h-4 w-4 rounded-full border border-black/20 shadow-xs"
              style={{ backgroundColor: element.color || "#BBF7D0" }}
            />
            <ChevronDown className="h-3 w-3 text-white/60" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" sideOffset={8} className="w-auto p-1.5 bg-[#2C2C2C] border-white/10 rounded-xl shadow-2xl">
          <div className="grid grid-cols-4 gap-1.5">
            {FIGJAM_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => handleColorChange(c.value)}
                type="button"
                className="h-6 w-6 rounded-full border border-black/20 transition-transform hover:scale-110 active:scale-95"
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="h-4 w-[1px] bg-white/15 mx-0.5" />

      {/* 2. Font Size Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium hover:bg-white/10 transition-colors text-white/90"
          >
            <span>{currentSizeLabel}</span>
            <ChevronDown className="h-3 w-3 text-white/60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" className="bg-[#2C2C2C] border-white/10 text-white rounded-xl">
          {FONT_SIZES.map((size) => (
            <DropdownMenuItem
              key={size.value}
              onClick={() => handleFontSizeChange(size.value as any)}
              className="text-xs cursor-pointer hover:bg-white/10"
            >
              {size.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-4 w-[1px] bg-white/15 mx-0.5" />

      {/* 3. Bold Toggle */}
      <button
        onClick={handleToggleBold}
        type="button"
        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
          element.isBold ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
        }`}
        title="Bold (Cmd+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>

      {/* 4. Strikethrough Toggle */}
      <button
        onClick={handleToggleStrike}
        type="button"
        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
          element.isStrike ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
        }`}
        title="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>

      <div className="h-4 w-[1px] bg-white/15 mx-0.5" />

      {/* 5. Connect Line Arrow */}
      <button
        onClick={onConnectClick}
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
        title="Draw Connector"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </button>

      {/* 6. Duplicate */}
      <button
        onClick={handleDuplicate}
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
        title="Duplicate (Cmd+D)"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>

      {/* 7. Delete */}
      <button
        onClick={() => deleteElements([element.id])}
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
        title="Delete (Backspace)"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
