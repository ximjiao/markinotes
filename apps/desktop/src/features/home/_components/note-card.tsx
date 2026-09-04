"use client";

import React from "react";
import { Star, MoreHorizontal, FileText, Folder, Trash2, Edit3, Share2, FileEdit, FolderOutput } from "lucide-react";
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
import type { NoteCardData } from "../_types/home.types";
import { cn, formatRelativeTime, stripMarkdown } from "@/lib/utils";

interface NoteCardProps {
  note: NoteCardData;
  onOpen?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onMove?: (id: string) => void;
  onExport?: (id: string) => void;
}

export function NoteCard({ note, onOpen, onDelete, onToggleStar, onMove, onExport }: NoteCardProps) {
  const tags = note.tags || [];
  const visibleTags = tags.slice(0, 2);
  const remainingTags = tags.slice(2);

  return (
    <Card
      onClick={() => onOpen?.(note.id)}
      className={cn(
        "group relative flex flex-col justify-between aspect-[4/5] cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/40 bg-card border-border overflow-hidden",
        note.coverColor
      )}
    >
      {/* Header Info: Folder/Group badge & Options */}
      <CardHeader className="p-4 pb-2 space-y-0 flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-txt-secondary font-medium">
          <Folder className="h-3.5 w-3.5 text-txt-brand" />
          <span>{note.groupName || "In Space"}</span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-txt-muted hover:text-amber-500"
            onClick={() => onToggleStar?.(note.id)}
          >
            <Star className={cn("h-3.5 w-3.5", note.isStarred && "fill-amber-400 text-amber-400")} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-txt-muted">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 border-border bg-popover shadow-xl rounded-xl">
              <DropdownMenuItem onClick={() => onOpen?.(note.id)} className="cursor-pointer gap-2 px-3 py-2 text-xs">
                <FileEdit className="h-4 w-4" /> Open Note
              </DropdownMenuItem>
              
              {onMove && (
                <DropdownMenuItem onClick={() => onMove(note.id)} className="cursor-pointer gap-2 px-3 py-2 text-xs">
                  <FolderOutput className="h-4 w-4" /> Move
                </DropdownMenuItem>
              )}

              {onExport && (
                <DropdownMenuItem onClick={() => onExport(note.id)} className="cursor-pointer gap-2 px-3 py-2 text-xs">
                  <FileText className="h-4 w-4" /> Export
                </DropdownMenuItem>
              )}

              <DropdownMenuItem className="cursor-pointer gap-2 px-3 py-2 text-xs">
                <Share2 className="h-4 w-4" /> Share
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-border" />
              
              <DropdownMenuItem className="cursor-pointer gap-2 px-3 py-2 text-xs text-destructive focus:text-destructive" onClick={() => onDelete?.(note.id)}>
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Main Content Preview Block with Fade-Out Gradient */}
      <CardContent className="relative p-4 pt-1 flex-1 flex flex-col justify-start gap-2 overflow-hidden">
        <CardTitle className="text-sm font-semibold text-txt-primary line-clamp-2 leading-tight group-hover:text-txt-brand transition-colors shrink-0">
          {note.title}
        </CardTitle>
        <p className="text-xs text-txt-secondary leading-relaxed font-normal overflow-hidden">
          {stripMarkdown(note.excerpt)}
        </p>

        {/* Bottom Fade Gradient Mask */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card via-card/85 to-transparent pointer-events-none" />
      </CardContent>

      {/* Footer Meta: Tags & Timestamp */}
      <CardFooter className="p-4 pt-1 flex items-center justify-between text-[11px] text-txt-muted z-10 bg-card gap-2">
        <div className="flex items-center gap-1 overflow-hidden min-w-0 max-w-[70%]">
          {visibleTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              title={`#${tag}`}
              className="max-w-[85px] truncate px-1.5 py-0 text-[10px] font-normal text-txt-secondary shrink-0"
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
                    className="px-1.5 py-0 text-[10px] font-normal text-txt-muted hover:text-txt-primary hover:bg-accent cursor-default shrink-0"
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
        <span className="shrink-0 text-[10px]">Edited {formatRelativeTime(note.updatedAt)}</span>
      </CardFooter>
    </Card>
  );
}
