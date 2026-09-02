"use client";

import React from "react";
import { NoteCard } from "./note-card";
import type { NoteCardData, ViewMode } from "../_types/home.types";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Folder, MoreHorizontal, Star, Trash2, FolderOutput } from "lucide-react";
import { EmptyState } from "@/components/shared";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface NoteGridProps {
  notes: NoteCardData[];
  viewMode: ViewMode;
  onOpenNote?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onMove?: (id: string) => void;
}

export function NoteGrid({ notes, viewMode, onOpenNote, onDelete, onToggleStar, onMove }: NoteGridProps) {
  if (notes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <EmptyState
          title="No documents found"
          description="Create a new document or change your search query."
        />
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 h-full w-full">
      <div className="p-6">
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onOpen={onOpenNote}
                onDelete={onDelete}
                onToggleStar={onToggleStar}
                onMove={onMove}
              />
            ))}
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-x-auto bg-card">
            <Table className="table-fixed w-full min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2 min-w-[200px]">Title</TableHead>
                  <TableHead className="w-[150px]">Location</TableHead>
                  <TableHead className="w-[150px]">Tags</TableHead>
                  <TableHead className="w-[120px] text-right whitespace-nowrap">Last Modified</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.map((note) => (
                  <TableRow
                    key={note.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => onOpenNote?.(note.id)}
                  >
                    <TableCell className="font-medium text-txt-primary">
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <FileText className="h-4 w-4 text-txt-brand shrink-0" style={{ flexShrink: 0 }} />
                        <span className="truncate min-w-0">{note.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-txt-secondary text-xs">
                      <div className="flex items-center gap-1.5 w-full min-w-0">
                        <Folder className="h-3.5 w-3.5 text-txt-muted shrink-0" style={{ flexShrink: 0 }} />
                        <span className="truncate min-w-0">{note.groupName || "Space"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 overflow-hidden w-full">
                        {note.tags?.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px] shrink-0">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs text-txt-muted whitespace-nowrap">
                      {note.updatedAt}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="pr-4">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-txt-muted transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onOpenNote?.(note.id)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Open
                          </DropdownMenuItem>
                          {onMove && (
                            <DropdownMenuItem onClick={() => onMove(note.id)}>
                              <FolderOutput className="mr-2 h-4 w-4" />
                              Move
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onToggleStar?.(note.id)}>
                            <Star className="mr-2 h-4 w-4" />
                            {note.isStarred ? "Unstar" : "Star"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete?.(note.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
