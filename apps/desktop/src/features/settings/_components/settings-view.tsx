"use client";

import React, { useState } from "react";
import { Folder, FolderPlus, Save, Trash2, Edit2, GripVertical } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { workspaceConfig } from "../../workspace/_lib/workspace-config";
import { LocalFolderNode } from "../../workspace/_types/folder.types";
import { isTauri } from "../../home/_lib/note-ipc";
import { toast } from "sonner";

interface SettingsViewProps {
  onWorkspaceChanged: () => void;
}

export function SettingsView({ onWorkspaceChanged }: SettingsViewProps) {
  const config = workspaceConfig.get();
  const [workspaceName, setWorkspaceName] = useState(config.name);
  const [rootPath, setRootPath] = useState(config.rootPath);
  const [folders, setFolders] = useState<LocalFolderNode[]>(config.folders || []);
  const [newFolderName, setNewFolderName] = useState("");

  const handleSaveGeneral = () => {
    workspaceConfig.set({ name: workspaceName, rootPath });
    toast.success("General settings saved");
    onWorkspaceChanged();
  };

  const handleChangeWorkspace = async () => {
    if (isTauri()) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Workspace Folder",
      });
      if (selected && typeof selected === "string") {
        setRootPath(selected);
      }
    } else {
      const path = prompt("Enter new workspace path:", rootPath);
      if (path) setRootPath(path);
    }
  };

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: LocalFolderNode = {
      id: crypto.randomUUID(),
      name: newFolderName.trim(),
      path: `${rootPath}/${newFolderName.trim()}`,
      noteCount: 0,
    };
    const newFolders = [...folders, newFolder];
    setFolders(newFolders);
    workspaceConfig.set({ folders: newFolders });
    setNewFolderName("");
    toast.success("Folder added");
    onWorkspaceChanged();
  };

  const handleDeleteFolder = (id: string) => {
    const newFolders = folders.filter((f) => f.id !== id);
    setFolders(newFolders);
    workspaceConfig.set({ folders: newFolders });
    toast.success("Folder removed from workspace");
    onWorkspaceChanged();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-txt-primary tracking-tight">Settings</h1>
        <p className="text-sm text-txt-secondary">Manage your workspace configuration and preferences.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="folders">Folders</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Workspace Details</CardTitle>
              <CardDescription>Configure the active workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="max-w-md"
                />
              </div>

              <div className="space-y-2">
                <Label>Workspace Path</Label>
                <div className="flex items-center gap-2 max-w-md">
                  <Input value={rootPath} readOnly className="bg-muted text-txt-secondary flex-1" />
                  <Button variant="outline" onClick={handleChangeWorkspace}>Change</Button>
                </div>
                <p className="text-xs text-txt-muted">
                  Changing the path will switch to a different workspace. Notes will not be moved automatically.
                </p>
              </div>

              <Button onClick={handleSaveGeneral} className="gap-2">
                <Save className="h-4 w-4" /> Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="folders" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Managed Folders</CardTitle>
              <CardDescription>Folders visible in your workspace sidebar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                {folders.map((folder) => (
                  <div key={folder.id} className="flex items-center gap-3 p-3 rounded-md border border-border bg-card hover:bg-accent/30 transition-colors">
                    <GripVertical className="h-4 w-4 text-txt-muted cursor-move shrink-0" />
                    <Folder className="h-4 w-4 text-txt-brand shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-txt-primary truncate">{folder.name}</p>
                      <p className="text-[11px] text-txt-muted truncate">{folder.path}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-txt-muted hover:text-destructive">
                      <Trash2 className="h-4 w-4" onClick={() => handleDeleteFolder(folder.id)} />
                    </Button>
                  </div>
                ))}

                {folders.length === 0 && (
                  <p className="text-sm text-txt-muted p-4 text-center border border-dashed border-border rounded-md">
                    No folders added yet.
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-border">
                <Label className="mb-2 block">Add New Folder</Label>
                <div className="flex items-center gap-2 max-w-md">
                  <Input
                    placeholder="Folder name (e.g. Projects)"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddFolder()}
                  />
                  <Button variant="secondary" onClick={handleAddFolder} className="gap-2 shrink-0">
                    <FolderPlus className="h-4 w-4" /> Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
