"use client";

import React from "react";
import { Star, MoreHorizontal, FileText, Folder, FolderOpen, Trash2, Edit3, FileEdit, FolderOutput } from "lucide-react";
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
import type { NoteCardData, NoteCardProps } from "../_types/home.types";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/formatters";
import { NotePreviewRenderer } from "./note-preview-renderer";
import { MiniFormattedInline } from "../_lib/note-preview-parser";
import { UI_COPY } from "@/lib/constants/copy";
import { noteIpc } from "../_lib/note-ipc";

function getCleanCardTitle(rawTitle: string): string {
  if (!rawTitle) return UI_COPY.editor.untitledNote;
  let clean = rawTitle.trim();
  clean = clean.replace(/^[#\s]+/, "");
  clean = clean.replace(/\*\*(.*?)\*\*/g, "$1");
  clean = clean.replace(/\*(.*?)\*/g, "$1");
  clean = clean.replace(/__(.*?)__/g, "$1");
  clean = clean.replace(/_(.*?)_/g, "$1");
  clean = clean.replace(/~~(.*?)~~/g, "$1");
  clean = clean.replace(/`([^`]+)`/g, "$1");
  clean = clean.replace(/!\[([^\]]*)\]\((.*?)\)/g, "$1");
  clean = clean.replace(/\[([^\]]+)\]\((.*?)\)/g, "$1");
  clean = clean.replace(/<[^>]*>/g, "");
  return clean.trim() || UI_COPY.editor.untitledNote;
}

export function NoteCard({
  note,
  variant = "grid",
  className,
  onOpen,
  onDelete,
  onToggleStar,
  onMove,
  onExport,
}: NoteCardProps) {
  const isKanban = variant === "kanban";
  const tags = note.tags || [];
  const visibleTags = tags.slice(0, 2);
  const remainingTags = tags.slice(2);

  return (
    <Card
      onClick={() => onOpen?.(note.id)}
      className={cn(
        "group relative flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/40 bg-card border-border overflow-hidden rounded-xl",
        isKanban ? "h-auto min-h-[130px] max-h-[165px]" : "aspect-[4/5]",
        note.coverColor,
        className
      )}
    >
      {/* Header Info: Folder/Group badge & Options */}
      <CardHeader className={cn("space-y-0 flex-row items-center justify-between shrink-0", isKanban ? "p-3 pb-1" : "p-4 pb-2")}>
        <div className="flex items-center gap-1.5 text-xs text-txt-secondary font-medium truncate max-w-[70%]">
          <Folder className="h-3.5 w-3.5 text-txt-brand shrink-0" />
          <span className="truncate">{note.groupName || "In Space"}</span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-txt-muted hover:text-amber-500 rounded-md cursor-pointer"
            onClick={() => onToggleStar?.(note.id)}
          >
            <Star className={cn("h-3.5 w-3.5", note.isStarred && "fill-amber-400 text-amber-400")} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-txt-muted hover:text-txt-primary rounded-md cursor-pointer">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 border-border bg-popover shadow-xl rounded-xl">
              <DropdownMenuItem onClick={() => onOpen?.(note.id)} className="cursor-pointer gap-2 px-3 py-2 text-xs">
                <FileEdit className="h-4 w-4" /> {UI_COPY.actions.openNote}
              </DropdownMenuItem>
              
              {onMove && (
                <DropdownMenuItem onClick={() => onMove(note.id)} className="cursor-pointer gap-2 px-3 py-2 text-xs">
                  <FolderOutput className="h-4 w-4" /> {UI_COPY.actions.move}
                </DropdownMenuItem>
              )}

              {onExport && (
                <DropdownMenuItem onClick={() => onExport(note.id)} className="cursor-pointer gap-2 px-3 py-2 text-xs">
                  <FileText className="h-4 w-4" /> {UI_COPY.actions.export}
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
                <FolderOpen className="h-4 w-4" /> {UI_COPY.actions.showInFolder}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-border" />
              
              <DropdownMenuItem className="cursor-pointer gap-2 px-3 py-2 text-xs text-destructive focus:text-destructive" onClick={() => onDelete?.(note.id)}>
                <Trash2 className="h-4 w-4" /> {UI_COPY.actions.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Main Content Preview Block with Fade-Out Gradient */}
      <CardContent className={cn("relative flex-1 flex flex-col justify-start gap-1 overflow-hidden", isKanban ? "px-3 py-1" : "p-4 pt-1 gap-1.5")}>
        <CardTitle className={cn("font-semibold text-txt-primary line-clamp-2 leading-tight group-hover:text-txt-brand transition-colors shrink-0", isKanban ? "text-xs" : "text-sm")}>
          <MiniFormattedInline text={getCleanCardTitle(note.title)} />
        </CardTitle>
        <div className={cn("overflow-hidden w-full flex-1", isKanban ? "max-h-[38px]" : "")}>
          <NotePreviewRenderer content={note.excerpt} title={note.title} />
        </div>

        {/* Bottom Fade Gradient Mask */}
        <div className={cn("absolute inset-x-0 bottom-0 bg-gradient-to-t from-card via-card/85 to-transparent pointer-events-none", isKanban ? "h-6" : "h-14")} />
      </CardContent>

      {/* Footer Meta: Tags & Timestamp */}
      <CardFooter className={cn("flex items-center justify-between text-txt-muted z-10 bg-card gap-2", isKanban ? "px-3 py-1.5 text-[10px] mt-0.5" : "p-4 pt-1 text-[11px]")}>
        <div className="flex items-center gap-1 overflow-hidden min-w-0 max-w-[70%]">
          {visibleTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              title={`#${tag}`}
              className={cn("truncate font-normal text-txt-secondary shrink-0 bg-secondary/70 border-border/50", isKanban ? "max-w-[75px] px-1.5 py-0 text-[9px]" : "max-w-[85px] px-1.5 py-0 text-[10px]")}
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
                    className={cn("font-normal text-txt-muted hover:text-txt-primary hover:bg-accent cursor-default shrink-0", isKanban ? "px-1 py-0 text-[9px]" : "px-1.5 py-0 text-[10px]")}
                  >
                    +{remainingTags.length}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="start"
                  onClick={(e) => e.stopPropagation()}
                  className="p-2.5 max-w-[220px] shadow-xl bg-popover text-popover-foreground border border-border rounded-lg"
                >
                  <p className="text-[10px] text-txt-muted font-medium mb-1.5">All tags in this note:</p>
                  <div className="flex flex-wrap gap-1">
                    {remainingTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="px-1.5 py-0 text-[10px] font-normal text-txt-secondary"
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
        <span className="shrink-0 text-[10px] text-txt-muted/80">{formatRelativeTime(note.updatedAt)}</span>
      </CardFooter>
    </Card>
  );
}
