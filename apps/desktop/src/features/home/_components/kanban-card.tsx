"use client";

import React, { useState } from "react";
import {
  Star,
  MoreHorizontal,
  FileText,
  Folder,
  FolderOpen,
  Trash2,
  FileEdit,
  FolderOutput,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { KanbanCardProps } from "../_types/home.types";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/formatters";
import { noteIpc } from "../_lib/note-ipc";

export function KanbanCard({
  note,
  onOpen,
  onDelete,
  onToggleStar,
  onMove,
  onExport,
}: KanbanCardProps) {
  const tags = note.tags || [];
  const visibleTags = tags.slice(0, 3);
  const remainingTags = tags.slice(3);

  // Extract clean text snippet for excerpt
  const cleanSnippet = (note.excerpt || "")
    .replace(/<div data-type="kanban-board"[\s\S]*?(<\/div>|\/>|$)/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/^#+\s+.*$/gm, "")
    .replace(/[*_`~[\]]/g, "")
    .trim();

  // Extract parent folder/workspace name
  const parentName =
    note.parent ||
    note.groupName ||
    (note.path ? note.path.split("/").slice(-2, -1)[0] : "General");

  return (
    <div
      onClick={() => onOpen?.(note.id)}
      className="group relative cursor-pointer select-none transition-all duration-150"
    >
      <Card
        className={cn(
          "flex flex-col justify-between border-border bg-card/90 backdrop-blur-xs hover:border-primary/50 hover:shadow-md transition-all duration-200 overflow-hidden rounded-xl",
          note.coverColor
        )}
      >
        {/* Top Header: Parent Badge & Actions */}
        <CardHeader className="p-3 pb-1 space-y-0 flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 min-w-0 max-w-[70%] text-[11px] font-medium text-txt-secondary">
            <Folder className="h-3 w-3 text-txt-brand shrink-0" />
            <span className="truncate" title={parentName}>
              {parentName}
            </span>
          </div>

          <div
            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-txt-muted hover:text-amber-500 rounded-md"
              onClick={() => onToggleStar?.(note.id)}
            >
              <Star
                className={cn(
                  "h-3 w-3",
                  note.isStarred && "fill-amber-400 text-amber-400"
                )}
              />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-txt-muted hover:text-txt-primary rounded-md"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 border-border bg-popover shadow-xl rounded-xl"
              >
                <DropdownMenuItem
                  onClick={() => onOpen?.(note.id)}
                  className="cursor-pointer gap-2 px-3 py-2 text-xs"
                >
                  <FileEdit className="h-3.5 w-3.5" /> Open Note
                </DropdownMenuItem>

                {onMove && (
                  <DropdownMenuItem
                    onClick={() => onMove(note.id)}
                    className="cursor-pointer gap-2 px-3 py-2 text-xs"
                  >
                    <FolderOutput className="h-3.5 w-3.5" /> Move
                  </DropdownMenuItem>
                )}

                {onExport && (
                  <DropdownMenuItem
                    onClick={() => onExport(note.id)}
                    className="cursor-pointer gap-2 px-3 py-2 text-xs"
                  >
                    <FileText className="h-3.5 w-3.5" /> Export
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (note.path) {
                      await noteIpc.revealInFinder(note.path);
                    }
                  }}
                  className="cursor-pointer gap-2 px-3 py-2 text-xs"
                >
                  <FolderOpen className="h-3.5 w-3.5" /> Open in Folder
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-border" />

                <DropdownMenuItem
                  className="cursor-pointer gap-2 px-3 py-2 text-xs text-destructive focus:text-destructive"
                  onClick={() => onDelete?.(note.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        {/* Content: Title & Excerpt */}
        <CardContent className="p-3 pt-1 pb-2 flex flex-col gap-1.5">
          <CardTitle className="text-xs font-semibold text-txt-primary leading-snug line-clamp-2 group-hover:text-txt-brand transition-colors">
            {note.title}
          </CardTitle>

          {cleanSnippet && (
            <p className="text-[11px] text-txt-muted line-clamp-2 leading-relaxed">
              {cleanSnippet}
            </p>
          )}
        </CardContent>

        {/* Footer: Tags & Date */}
        <CardFooter className="p-3 pt-1 flex items-center justify-between text-[10px] text-txt-muted gap-2 border-t border-border/40 mt-1">
          {/* Tags */}
          <div className="flex items-center gap-1 overflow-hidden min-w-0 max-w-[70%]">
            {visibleTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                title={`#${tag}`}
                className="max-w-[75px] truncate px-1.5 py-0 text-[9px] font-normal text-txt-secondary shrink-0 bg-secondary/70 border-border/50"
              >
                #{tag}
              </Badge>
            ))}

            {remainingTags.length > 0 && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      onClick={(e) => e.stopPropagation()}
                      className="px-1 py-0 text-[9px] font-normal text-txt-muted hover:text-txt-primary cursor-default shrink-0"
                    >
                      +{remainingTags.length}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="start"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 max-w-[200px] shadow-xl bg-popover text-popover-foreground border border-border rounded-lg"
                  >
                    <p className="text-[10px] text-txt-muted font-medium mb-1">
                      All tags:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {remainingTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="px-1.5 py-0 text-[9px] font-normal text-txt-secondary"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Timestamp */}
          <span className="shrink-0 text-[10px] text-txt-muted/80">
            {formatRelativeTime(note.updatedAt)}
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}
