"use client";

import React from "react";
import { FolderPlus, FileText, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface OnboardingViewProps {
  onSelectFolder: () => void;
}

export function OnboardingView({ onSelectFolder }: OnboardingViewProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-background">
      <Card className="max-w-md w-full border-border shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-txt-brand mb-2">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-txt-primary">Welcome to Markidown</CardTitle>
          <CardDescription className="text-xs text-txt-secondary mt-1">
            Local-first, markdown note taking app with Notion polish & Apple Notes speed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs text-txt-secondary pt-2">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/40 border border-border/50">
            <FileText className="h-4 w-4 text-txt-brand shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-txt-primary">Your Data Stays Yours</p>
              <p className="text-[11px] text-txt-muted">All notes are stored as plain .md files with YAML frontmatter on your Mac.</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={onSelectFolder} className="w-full gap-2 bg-primary text-primary-foreground">
            <FolderPlus className="h-4 w-4" /> Choose Workspace Folder on Mac
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
