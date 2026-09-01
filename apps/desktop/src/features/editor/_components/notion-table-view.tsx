"use client";

import React from "react";
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { Plus } from "lucide-react";

export function NotionTableView({ editor, getPos }: NodeViewProps) {
  const handleAddColumn = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof getPos !== "function") return;
    const pos = getPos();
    const tableNode = editor.state.doc.nodeAt(pos);
    if (!tableNode) return;

    const { from } = editor.state.selection;
    const isInsideThisTable = from >= pos && from <= pos + tableNode.nodeSize;

    const chain = editor.chain().focus();
    if (!isInsideThisTable) {
      chain.setTextSelection(pos + 3);
    }
    chain.addColumnAfter().run();
  };

  const handleAddRow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof getPos !== "function") return;
    const pos = getPos();
    const tableNode = editor.state.doc.nodeAt(pos);
    if (!tableNode) return;

    const { from } = editor.state.selection;
    const isInsideThisTable = from >= pos && from <= pos + tableNode.nodeSize;

    const chain = editor.chain().focus();
    if (!isInsideThisTable) {
      chain.setTextSelection(pos + 3);
    }
    chain.addRowAfter().run();
  };

  return (
    <NodeViewWrapper className="notion-table-container relative group/table my-4 inline-block w-full max-w-full">
      <div className="flex items-stretch gap-1 max-w-full w-full">
        {/* Main Table Container */}
        <div className="overflow-x-auto border border-border rounded-md bg-background max-w-full flex-1">
          <NodeViewContent as="table" className="w-full border-collapse table-fixed" />
        </div>

        {/* Right side (+) Add Column Bar - Hugs table right edge */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleAddColumn}
          className="w-5 shrink-0 rounded border border-border/60 bg-accent/30 hover:bg-accent hover:border-txt-brand/50 flex items-center justify-center text-txt-muted hover:text-txt-brand transition-all cursor-pointer self-stretch"
          title="Click to add a new column"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bottom (+) Add Row Bar - Hugs table bottom edge */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleAddRow}
        className="w-full h-5 mt-1 rounded border border-border/60 bg-accent/30 hover:bg-accent hover:border-txt-brand/50 flex items-center justify-center text-txt-muted hover:text-txt-brand transition-all cursor-pointer"
        title="Click to add a new row"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </NodeViewWrapper>
  );
}
