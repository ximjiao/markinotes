"use client";

import React, { useState } from "react";
import { FolderPlus, FileText, Sparkles, CheckCircle2, ChevronRight, HardDrive } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isTauri } from "../_lib/note-ipc";
import { workspaceConfig } from "../../workspace/_lib/workspace-config";

interface OnboardingViewProps {
  onSelectFolder: () => void;
}

export function OnboardingView({ onSelectFolder }: OnboardingViewProps) {
  const [step, setStep] = useState(1);
  const [rootPath, setRootPath] = useState("");
  const [workspaceName, setWorkspaceName] = useState("My Workspace");

  const handleChooseFolder = async () => {
    if (isTauri()) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Workspace Folder",
      });
      if (selected && typeof selected === "string") {
        setRootPath(selected);
        setStep(2);
      }
    } else {
      // Web fallback
      const path = prompt("Enter a mock path for web dev (e.g. /Users/guest/Documents/Notes):");
      if (path) {
        setRootPath(path);
        setStep(2);
      }
    }
  };

  const handleComplete = () => {
    // Initial default folders
    const defaultFolders = [
      { id: crypto.randomUUID(), name: "Personal", path: `${rootPath}/Personal`, noteCount: 0 },
      { id: crypto.randomUUID(), name: "Work", path: `${rootPath}/Work`, noteCount: 0 },
      { id: crypto.randomUUID(), name: "Archive", path: `${rootPath}/Archive`, noteCount: 0 },
    ];
    
    workspaceConfig.set({
      rootPath,
      name: workspaceName,
      folders: defaultFolders,
      setupDone: true,
    });
    
    // In Tauri, we'd also call `invoke("workspace_init", { rootPath, folders })` here.
    // For now we'll do it later in the data hook or directly.
    onSelectFolder();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
      {/* Progress Indicator */}
      <div className="flex items-center gap-2 mb-8 text-xs font-medium">
        <div className={`flex items-center justify-center h-6 w-6 rounded-full ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>1</div>
        <div className={`h-px w-10 ${step >= 2 ? "bg-primary" : "bg-border"}`} />
        <div className={`flex items-center justify-center h-6 w-6 rounded-full ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</div>
        <div className={`h-px w-10 ${step >= 3 ? "bg-primary" : "bg-border"}`} />
        <div className={`flex items-center justify-center h-6 w-6 rounded-full ${step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>3</div>
      </div>

      <Card className="max-w-md w-full border-border shadow-lg transition-all duration-300">
        
        {step === 1 && (
          <>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-txt-brand mb-2">
                <Sparkles className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold text-txt-primary">Welcome to Markidown</CardTitle>
              <CardDescription className="text-xs text-txt-secondary mt-1">
                Local-first, markdown note taking app. Fast, beautiful, and secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-txt-secondary pt-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/40 border border-border/50">
                <HardDrive className="h-4 w-4 text-txt-brand shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-txt-primary">Pick your workspace</p>
                  <p className="text-[11px] text-txt-muted">Select a folder on your computer to store all your markdown notes.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleChooseFolder} className="w-full gap-2">
                <FolderPlus className="h-4 w-4" /> Choose Workspace Folder
              </Button>
            </CardFooter>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-txt-primary">Setup Workspace</CardTitle>
              <CardDescription className="text-xs text-txt-secondary">
                We'll create a few default folders for you to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name" className="text-xs font-semibold">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Folder Structure Preview</Label>
                <div className="p-3 bg-muted/30 rounded-md border border-border/50 font-mono text-[11px] text-txt-secondary">
                  <div className="text-txt-primary font-semibold mb-1">📁 {workspaceName}</div>
                  <div className="ml-4 pl-2 border-l border-border/60">
                    <div>├── 📁 Personal</div>
                    <div>├── 📁 Work</div>
                    <div>└── 📁 Archive</div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Back</Button>
              <Button size="sm" onClick={() => setStep(3)} className="gap-1">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold text-txt-primary">You're All Set!</CardTitle>
              <CardDescription className="text-xs text-txt-secondary mt-1">
                Your workspace is ready. You can change these settings anytime.
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-6">
              <Button onClick={handleComplete} className="w-full gap-2">
                Start Writing <ChevronRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}

