"use client";

import React, { useState, useRef, useCallback } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import {
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Maximize2,
  Minimize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { ImageDialog } from "./image-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function ImageBlockNodeView(props: NodeViewProps) {
  const { node, updateAttributes, deleteNode } = props;
  const { src, width = "100%", align = "center", alt } = node.attrs;
  const [isPopoverOpen, setIsPopoverOpen] = useState(!src);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);

  // Handle Drag Resizing
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handleSide: "left" | "right") => {
      e.preventDefault();
      e.stopPropagation();

      if (!containerRef.current) return;
      const parentWidth = containerRef.current.parentElement?.clientWidth || 700;
      const startX = e.clientX;
      const startWidthPx = containerRef.current.clientWidth;
      isResizingRef.current = true;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current) return;
        const deltaX = moveEvent.clientX - startX;
        let newWidthPx =
          handleSide === "right" ? startWidthPx + deltaX : startWidthPx - deltaX;

        // Clamp between 20% and 100% of parent width
        const minPx = Math.max(160, parentWidth * 0.2);
        const maxPx = parentWidth;
        newWidthPx = Math.max(minPx, Math.min(maxPx, newWidthPx));

        const percent = Math.round((newWidthPx / parentWidth) * 100);
        updateAttributes({ width: `${percent}%` });
      };

      const handleMouseUp = () => {
        isResizingRef.current = false;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [updateAttributes]
  );

  const toggleFullWidth = () => {
    updateAttributes({ width: width === "100%" ? "60%" : "100%" });
  };

  const alignClass =
    align === "left"
      ? "justify-start"
      : align === "right"
      ? "justify-end"
      : "justify-center";

  return (
    <NodeViewWrapper className={`my-4 flex ${alignClass} w-full`}>
      {!src ? (
        /* 1. Notion-Style Placeholder Block Bar */
        <div className="relative w-full max-w-4xl">
          <div
            onClick={() => setIsPopoverOpen(true)}
            className="w-full p-3.5 bg-accent/40 hover:bg-accent/70 border border-transparent hover:border-border/60 rounded-xl flex items-center gap-2.5 cursor-pointer transition-all group/bar select-none"
          >
            <ImageIcon className="h-4 w-4 text-txt-muted group-hover/bar:text-txt-brand transition-colors" />
            <span className="text-xs font-medium text-txt-muted group-hover/bar:text-txt-primary transition-colors">
              Add an image
            </span>
          </div>

          {/* Floating Popover directly attached to placeholder */}
          <ImageDialog
            isOpen={isPopoverOpen}
            onClose={() => setIsPopoverOpen(false)}
            onInsertImage={(newSrc) => {
              updateAttributes({ src: newSrc });
              setIsPopoverOpen(false);
            }}
          />
        </div>
      ) : (
        /* 2. Rendered Image View with Resizing & Hover Controls */
        <div
          ref={containerRef}
          className="relative inline-block group/img rounded-xl transition-all border border-border/40 select-none"
          style={{ width: typeof width === "number" ? `${width}px` : width }}
        >
          <img
            src={src}
            alt={alt || "Uploaded image"}
            className="w-full h-auto object-contain rounded-xl block"
          />

          {/* Left Resize Drag Handle */}
          <div
            onMouseDown={(e) => handleMouseDown(e, "left")}
            className="absolute top-1/2 -left-2 -translate-y-1/2 w-3 h-12 bg-accent/90 hover:bg-txt-brand border border-border/80 rounded-full cursor-ew-resize opacity-0 group-hover/img:opacity-100 transition-opacity shadow-md flex items-center justify-center"
            title="Drag to resize"
          >
            <div className="w-0.5 h-6 bg-txt-muted rounded-full" />
          </div>

          {/* Right Resize Drag Handle */}
          <div
            onMouseDown={(e) => handleMouseDown(e, "right")}
            className="absolute top-1/2 -right-2 -translate-y-1/2 w-3 h-12 bg-accent/90 hover:bg-txt-brand border border-border/80 rounded-full cursor-ew-resize opacity-0 group-hover/img:opacity-100 transition-opacity shadow-md flex items-center justify-center"
            title="Drag to resize"
          >
            <div className="w-0.5 h-6 bg-txt-muted rounded-full" />
          </div>

          {/* Hover Control Overlay Bar */}
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-popover/90 border border-border/80 backdrop-blur rounded-lg p-1 opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg z-10">
            {/* Full Width Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-txt-muted hover:text-txt-primary"
              onClick={toggleFullWidth}
              title={width === "100%" ? "Restore width" : "Full Width (100%)"}
            >
              {width === "100%" ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>

            {/* Quick Width Presets */}
            <button
              onClick={() => updateAttributes({ width: "33%" })}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded hover:bg-accent ${
                width === "33%" ? "text-txt-brand font-bold bg-accent" : "text-txt-muted"
              }`}
            >
              33%
            </button>
            <button
              onClick={() => updateAttributes({ width: "50%" })}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded hover:bg-accent ${
                width === "50%" ? "text-txt-brand font-bold bg-accent" : "text-txt-muted"
              }`}
            >
              50%
            </button>
            <button
              onClick={() => updateAttributes({ width: "100%" })}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded hover:bg-accent ${
                width === "100%" ? "text-txt-brand font-bold bg-accent" : "text-txt-muted"
              }`}
            >
              100%
            </button>

            <Separator orientation="vertical" className="h-3.5 mx-0.5" />

            {/* Alignment Options */}
            <Button
              variant={align === "left" ? "secondary" : "ghost"}
              size="icon"
              className="h-6 w-6"
              onClick={() => updateAttributes({ align: "left" })}
              title="Align Left"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={align === "center" ? "secondary" : "ghost"}
              size="icon"
              className="h-6 w-6"
              onClick={() => updateAttributes({ align: "center" })}
              title="Align Center"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={align === "right" ? "secondary" : "ghost"}
              size="icon"
              className="h-6 w-6"
              onClick={() => updateAttributes({ align: "right" })}
              title="Align Right"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </Button>

            <Separator orientation="vertical" className="h-3.5 mx-0.5" />

            {/* Replace & Delete */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-txt-muted hover:text-txt-primary"
              onClick={() => setIsPopoverOpen(true)}
              title="Replace Image"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-txt-muted hover:text-destructive"
              onClick={deleteNode}
              title="Delete Image"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Popover for Replacing Existing Image */}
          <ImageDialog
            isOpen={isPopoverOpen}
            onClose={() => setIsPopoverOpen(false)}
            onInsertImage={(newSrc) => {
              updateAttributes({ src: newSrc });
              setIsPopoverOpen(false);
            }}
          />
        </div>
      )}
    </NodeViewWrapper>
  );
}
