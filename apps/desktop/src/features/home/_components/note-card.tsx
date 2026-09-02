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
import type { NoteCardData } from "../_types/home.types";
import { cn, formatRelativeTime } from "@/lib/utils";

interface NoteCardProps {
  note: NoteCardData;
  onOpen?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onMove?: (id: string) => void;
  onExport?: (id: string) => void;
}

export function NoteCard({ note, onOpen, onDelete, onToggleStar, onMove, onExport }: NoteCardProps) {
  return (
    <Card
      onClick={() => onOpen?.(note.id)}
      className={cn(
        "group relative flex flex-col justify-between h-64 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/40 bg-card border-border overflow-hidden",
        note.coverColor
      )}
    >
      {/* Header Info: Folder/Group badge & Options */}
      <CardHeader className="p-4 pb-2 space-y-0 flex-row items-center justify-between">
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

      {/* Main Content Preview Block */}
      <CardContent className="p-4 pt-1 flex-1 flex flex-col justify-start gap-2">
        <CardTitle className="text-sm font-semibold text-txt-primary line-clamp-2 leading-tight group-hover:text-txt-brand transition-colors">
          {note.title}
        </CardTitle>
        <p className="text-xs text-txt-secondary line-clamp-4 leading-relaxed font-normal">
          {note.excerpt}
        </p>
      </CardContent>

      {/* Footer Meta: Tags & Timestamp */}
      <CardFooter className="p-4 pt-0 flex items-center justify-between text-[11px] text-txt-muted  mt-2">
        <div className="flex items-center gap-1 overflow-hidden max-w-[70%]">
          {note.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[10px] font-normal text-txt-secondary">
              #{tag}
            </Badge>
          ))}
        </div>
        <span className="shrink-0">Edited {formatRelativeTime(note.updatedAt)}</span>
      </CardFooter>
    </Card>
  );
}
