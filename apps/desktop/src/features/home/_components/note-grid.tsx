"use client";

import React from "react";
import { NoteCard } from "./note-card";
import type { NoteCardData, ViewMode } from "../_types/home.types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Folder } from "lucide-react";
import { EmptyState } from "@/components/shared";

interface NoteGridProps {
  notes: NoteCardData[];
  viewMode: ViewMode;
  onOpenNote?: (id: string) => void;
  onDeleteNote?: (id: string) => void;
}

export function NoteGrid({ notes, viewMode, onOpenNote, onDeleteNote }: NoteGridProps) {
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
              <NoteCard key={note.id} note={note} onOpen={onOpenNote} onDelete={onDeleteNote} />
            ))}
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Title</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Last Modified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.map((note) => (
                  <TableRow
                    key={note.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => onOpenNote?.(note.id)}
                  >
                    <TableCell className="font-medium text-txt-primary flex items-center gap-2">
                      <FileText className="h-4 w-4 text-txt-brand shrink-0" />
                      <span className="truncate">{note.title}</span>
                    </TableCell>
                    <TableCell className="text-txt-secondary text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Folder className="h-3.5 w-3.5 text-txt-muted" />
                        {note.groupName || "Space"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {note.tags?.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs text-txt-muted">
                      {note.updatedAt}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
