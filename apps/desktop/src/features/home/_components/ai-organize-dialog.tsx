"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Folder, FolderPlus, Loader2 } from "lucide-react";
import { AIOrganizeResponse } from "./home-dashboard";

interface AIOrganizeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: AIOrganizeResponse;
  draftTitles: { id: string; title: string }[];
  onConfirm: (approvedMoves: AIOrganizeResponse) => void;
  isLoading?: boolean;
}

export function AIOrganizeDialog({
  isOpen,
  onClose,
  suggestions,
  draftTitles,
  onConfirm,
  isLoading
}: AIOrganizeDialogProps) {
  // We can let the user uncheck some suggestions if they want, but for simplicity, we just show them and confirm all.
  const [isProcessing, setIsProcessing] = useState(false);

  const hasMoves = Object.keys(suggestions.moves || {}).length > 0;
  const hasCreates = Object.keys(suggestions.creates || {}).length > 0;
  const hasSuggestions = hasMoves || hasCreates;

  const handleConfirm = async () => {
    setIsProcessing(true);
    await onConfirm(suggestions);
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            AI Organize Suggestions
          </DialogTitle>
          <DialogDescription>
            {isLoading 
              ? "Gemini is analyzing your drafts..." 
              : hasSuggestions 
                ? "Here are the suggested folders for your drafts:" 
                : "No matching folders found for the current drafts."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-[300px] overflow-y-auto pr-2 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-txt-muted gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-txt-brand" />
              <span className="text-sm">Thinking...</span>
            </div>
          ) : hasSuggestions ? (
            <>
              {hasCreates && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-txt-muted uppercase tracking-wider">New Folders</h4>
                  {Object.entries(suggestions.creates!).map(([noteId, folderName]) => {
                    const note = draftTitles.find(n => n.id === noteId);
                    return (
                      <div key={noteId} className="flex flex-col gap-1 text-sm p-3 rounded-lg border border-brand/30 bg-brand/5">
                        <div className="font-semibold text-txt-primary truncate">{note?.title || "Unknown Draft"}</div>
                        <div className="flex items-center gap-1.5 text-xs text-brand">
                          <FolderPlus className="h-3.5 w-3.5" />
                          Create & Move to: <span className="font-medium">{folderName}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {hasMoves && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-txt-muted uppercase tracking-wider mt-4">Existing Folders</h4>
                  {Object.entries(suggestions.moves!).map(([noteId, folderPath]) => {
                    const note = draftTitles.find(n => n.id === noteId);
                    const folderName = folderPath.split("/").pop();
                    return (
                      <div key={noteId} className="flex flex-col gap-1 text-sm p-3 rounded-lg border border-border bg-background">
                        <div className="font-semibold text-txt-primary truncate">{note?.title || "Unknown Draft"}</div>
                        <div className="flex items-center gap-1.5 text-xs text-txt-secondary">
                          <Folder className="h-3.5 w-3.5" />
                          Move to: <span className="font-medium">{folderName}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isProcessing || isLoading}>
            Cancel
          </Button>
          {!isLoading && hasSuggestions && (
            <Button onClick={handleConfirm} disabled={isProcessing} className="gap-2">
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Move
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
