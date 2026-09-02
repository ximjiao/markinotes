"use client";

import React, { useState, useEffect } from "react";
import {
  Folder,
  FolderPlus,
  Trash2,
  GripVertical,
  Sun,
  Moon,
  Monitor,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { workspaceConfig } from "../../workspace/_lib/workspace-config";
import { LocalFolderNode } from "../../workspace/_types/folder.types";
import { isTauri } from "../../home/_lib/note-ipc";
import { invoke } from "@tauri-apps/api/core";
import { mkdir } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface SettingsViewProps {
  onWorkspaceChanged: () => void;
}

// Text size steps mapped to rem values
const TEXT_SIZES = [
  { label: "XS", rem: 0.75 },
  { label: "S", rem: 0.8125 },
  { label: "M", rem: 0.875 },
  { label: "L", rem: 1 },
  { label: "XL", rem: 1.125 },
];

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold  capitalize text-txt-muted/70 px-1 mb-2 ">
      {children}
    </p>
  );
}

function SettingRow({
  label,
  description,
  children,
  noBorder,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 px-5 py-4", !noBorder && "border-b border-border/60 last:border-0")}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-txt-primary leading-tight">{label}</p>
        {description && (
          <p className="text-xs text-txt-muted mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// Mini theme preview card
function ThemeCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  const isDark = value === "dark";
  const isSys = value === "system";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 group",
      )}
    >
      <div
        className={cn(
          "w-20 h-[52px] rounded-lg border-2 overflow-hidden relative transition-all",
          active ? "border-txt-brand shadow-md" : "border-border hover:border-txt-brand/40"
        )}
      >
        {/* Preview mockup */}
        {isSys ? (
          // Half light, half dark
          <div className="flex h-full">
            <div className="flex-1 bg-white">
              <div className="m-1.5 space-y-1">
                <div className="h-1 bg-gray-300 rounded w-3/4" />
                <div className="h-1 bg-gray-200 rounded w-1/2" />
                <div className="h-1 bg-blue-400 rounded w-2/3" />
              </div>
            </div>
            <div className="flex-1 bg-neutral-900">
              <div className="m-1.5 space-y-1">
                <div className="h-1 bg-neutral-600 rounded w-3/4" />
                <div className="h-1 bg-neutral-700 rounded w-1/2" />
                <div className="h-1 bg-blue-500 rounded w-2/3" />
              </div>
            </div>
          </div>
        ) : isDark ? (
          <div className="flex flex-col h-full bg-neutral-900 p-1.5 space-y-1">
            <div className="h-1 bg-neutral-600 rounded w-3/4" />
            <div className="h-1 bg-neutral-700 rounded w-1/2" />
            <div className="h-1 bg-blue-500 rounded w-2/3" />
            <div className="h-1 bg-neutral-700 rounded w-full" />
          </div>
        ) : (
          <div className="flex flex-col h-full bg-white p-1.5 space-y-1">
            <div className="h-1 bg-gray-300 rounded w-3/4" />
            <div className="h-1 bg-gray-200 rounded w-1/2" />
            <div className="h-1 bg-blue-400 rounded w-2/3" />
            <div className="h-1 bg-gray-200 rounded w-full" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 text-xs text-txt-secondary">
        {active && <Check className="h-3 w-3 text-txt-brand" />}
        <span className={cn(active && "text-txt-brand font-medium")}>{label}</span>
      </div>
    </button>
  );
}

export function SettingsView({ onWorkspaceChanged }: SettingsViewProps) {
  const config = workspaceConfig.get();
  const [workspaceName, setWorkspaceName] = useState(config.name);
  const [rootPath] = useState(config.rootPath);
  const [folders, setFolders] = useState<LocalFolderNode[]>(config.folders || []);
  const [newFolderName, setNewFolderName] = useState("");
  const [isReady, setIsReady] = useState(false);

  // Appearance states
  const { theme, setTheme } = useTheme();
  const [textSizeIdx, setTextSizeIdx] = useState(2); // default = M
  const [contrast, setContrast] = useState("standard");
  const [accent, setAccent] = useState("default");

  useEffect(() => {
    const storedIdx = Number(localStorage.getItem("marki_text_size_idx") ?? "2");
    const savedContrast = localStorage.getItem("markidown-contrast") || "standard";
    const savedAccent = localStorage.getItem("markidown-accent") || "default";

    setTextSizeIdx(storedIdx);
    setContrast(savedContrast);
    setAccent(savedAccent);

    document.documentElement.style.fontSize = `${TEXT_SIZES[storedIdx].rem}rem`;
    if (savedContrast === "high") document.documentElement.classList.add("high-contrast");
    document.documentElement.setAttribute("data-accent", savedAccent);
    setIsReady(true);
  }, []);

  const handleTextSize = (idx: number) => {
    setTextSizeIdx(idx);
    document.documentElement.style.fontSize = `${TEXT_SIZES[idx].rem}rem`;
    localStorage.setItem("marki_text_size_idx", String(idx));
  };

  const handleContrast = (val: string) => {
    setContrast(val);
    localStorage.setItem("markidown-contrast", val);
    if (val === "high") document.documentElement.classList.add("high-contrast");
    else document.documentElement.classList.remove("high-contrast");
  };

  const handleAccentChange = (val: string) => {
    setAccent(val);
    localStorage.setItem("markidown-accent", val);
    document.documentElement.setAttribute("data-accent", val);
  };

  const handleSaveName = () => {
    workspaceConfig.set({ name: workspaceName });
    toast.success("Saved");
    onWorkspaceChanged();
  };

  const handleChangeWorkspace = async () => {
    if (isTauri()) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true, multiple: false, title: "Select Workspace Folder" });
      if (selected && typeof selected === "string") {
        workspaceConfig.set({ rootPath: selected });
        toast.success("Workspace path updated");
        onWorkspaceChanged();
      }
    } else {
      const path = prompt("Enter new workspace path:", rootPath);
      if (path) {
        workspaceConfig.set({ rootPath: path });
        onWorkspaceChanged();
      }
    }
  };

  const handleAddFolder = async () => {
    if (isTauri()) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true, multiple: false, title: "Select Folder to Add" });
      
      if (selected && typeof selected === "string") {
        // Extract folder name from path
        const name = selected.split(/[/\\]/).pop() || "New Folder";
        
        // Check if folder is already added
        if (folders.some(f => f.path === selected)) {
          toast.error("Folder is already in your workspace");
          return;
        }

        const newFolder: LocalFolderNode = {
          id: crypto.randomUUID(),
          name,
          path: selected,
          noteCount: 0,
        };
        const newFolders = [...folders, newFolder];
        setFolders(newFolders);
        workspaceConfig.set({ folders: newFolders });
        toast.success(`"${newFolder.name}" added`);
        onWorkspaceChanged();
      }
    } else {
      const name = prompt("Enter new folder name:");
      if (!name) return;
      const newFolder: LocalFolderNode = {
        id: crypto.randomUUID(),
        name,
        path: `${rootPath}/${name}`,
        noteCount: 0,
      };
      const newFolders = [...folders, newFolder];
      setFolders(newFolders);
      workspaceConfig.set({ folders: newFolders });
      toast.success(`"${newFolder.name}" added`);
      onWorkspaceChanged();
    }
  };

  const handleDeleteFolder = (id: string) => {
    const newFolders = folders.filter((f) => f.id !== id);
    setFolders(newFolders);
    workspaceConfig.set({ folders: newFolders });
    toast.success("Folder removed");
    onWorkspaceChanged();
  };

  return (
    <div className="max-w-[640px] mx-auto space-y-7 pb-20">
      <div className="pt-2">
        <h1 className="text-xl font-semibold text-txt-primary tracking-tight">Settings</h1>
      </div>

      {/* ─── Workspace ─── */}
      <section>
        <SectionHeader>Workspace</SectionHeader>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-4 border-b border-border/60">
            <p className="flex-1 text-sm font-medium text-txt-primary">Workspace Name</p>
            <input
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              className="text-sm text-txt-secondary bg-transparent text-right outline-none border-none focus:text-txt-primary w-40 min-w-0"
            />
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-txt-primary">Storage Path</p>
              <p className="text-xs text-txt-muted mt-0.5 truncate">{rootPath || "Not set"}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleChangeWorkspace} className="text-xs h-7 shrink-0">
              Change
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Folders ─── */}
      <section>
        <SectionHeader>Folders</SectionHeader>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center gap-3 px-5 py-3.5 border-b border-border/60 last:border-0 group"
            >
              <GripVertical className="h-4 w-4 text-txt-muted/30 cursor-move shrink-0" />
              <Folder className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-txt-primary truncate">{folder.name}</p>
                <p className="text-[11px] text-txt-muted truncate">{folder.path}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-txt-muted hover:text-destructive shrink-0"
                onClick={() => handleDeleteFolder(folder.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {folders.length === 0 && (
            <div className="px-5 py-6 text-center text-sm text-txt-muted">No folders yet.</div>
          )}

          {/* Add folder row */}
          <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-t border-border/60">
            <span className="text-xs text-txt-muted font-medium">Add an existing folder to your workspace</span>
            <Button size="sm" onClick={handleAddFolder} className="h-8 gap-1.5 shrink-0">
              <FolderPlus className="h-3.5 w-3.5" />
              Add Folder
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Appearance ─── */}
      <section>
        <SectionHeader>Appearance</SectionHeader>
        <div className="rounded-xl border border-border bg-card overflow-hidden">

          {/* Theme — visual card picker */}
          <div className="px-5 py-5 border-b border-border/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-txt-primary">Theme</p>
                <p className="text-xs text-txt-muted mt-0.5">How Markidown looks on your device</p>
              </div>
              <div className="flex items-start gap-3">
                <ThemeCard label="Light" value="light" active={theme === "light"} onClick={() => setTheme("light")} />
                <ThemeCard label="Dark" value="dark" active={theme === "dark"} onClick={() => setTheme("dark")} />
                <ThemeCard label="Auto" value="system" active={theme === "system" || !theme} onClick={() => setTheme("system")} />
              </div>
            </div>
          </div>

          {/* Text Size — Apple-style slider */}
          <div className="px-5 py-5 border-b border-border/60">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-txt-primary">Text Size</p>
                <p className="text-xs text-txt-muted mt-0.5">Adjust the reading and UI text size</p>
              </div>
              <span className="text-xs text-txt-muted pt-0.5">{TEXT_SIZES[textSizeIdx].label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-txt-muted select-none" style={{ fontSize: "10px" }}>A</span>
              {/* Custom slider track with step dots */}
              <div className="relative flex-1 h-8 flex items-center">
                {/* Track */}
                <div className="absolute inset-x-0 h-1 bg-muted rounded-full" />
                {/* Filled */}
                <div
                  className="absolute left-0 h-1 bg-txt-brand rounded-full transition-all duration-150"
                  style={{ width: `${(textSizeIdx / (TEXT_SIZES.length - 1)) * 100}%` }}
                />
                {/* Step dots */}
                {TEXT_SIZES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleTextSize(i)}
                    className="absolute z-10 -translate-x-1/2"
                    style={{ left: `${(i / (TEXT_SIZES.length - 1)) * 100}%` }}
                  >
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full border-2 transition-all duration-150",
                        i <= textSizeIdx
                          ? "bg-txt-brand border-txt-brand"
                          : "bg-background border-muted-foreground/30"
                      )}
                    />
                  </button>
                ))}
                {/* Thumb */}
                <div
                  className="absolute z-20 -translate-x-1/2 h-5 w-5 rounded-full bg-white shadow-md border border-border transition-all duration-150"
                  style={{ left: `${(textSizeIdx / (TEXT_SIZES.length - 1)) * 100}%` }}
                />
                {/* Invisible range input for native drag */}
                <input
                  type="range"
                  min={0}
                  max={TEXT_SIZES.length - 1}
                  step={1}
                  value={textSizeIdx}
                  onChange={(e) => handleTextSize(Number(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer z-30"
                />
              </div>
              <span className="text-base font-medium text-txt-muted select-none" style={{ fontSize: "18px" }}>A</span>
            </div>
            <p className="text-center text-xs text-txt-muted mt-2">{TEXT_SIZES[textSizeIdx].label} · {Math.round(TEXT_SIZES[textSizeIdx].rem * 16)}pt</p>
          </div>

          {/* Contrast */}
          <div className="px-5 py-4 border-b border-border/60">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-txt-primary">Contrast</p>
                <p className="text-xs text-txt-muted mt-0.5">Increase contrast for better readability</p>
              </div>
              <div className="flex items-center rounded-lg border border-border overflow-hidden">
                {["Standard", "High"].map((label, i) => {
                  const val = label.toLowerCase();
                  const active = contrast === val;
                  return (
                    <button
                      key={val}
                      onClick={() => handleContrast(val)}
                      className={cn(
                        "px-4 py-1.5 text-xs font-medium transition-colors",
                        i === 0 ? "border-r border-border" : "",
                        active ? "bg-txt-primary text-background" : "text-txt-secondary hover:text-txt-primary"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Accent Color */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-txt-primary">Accent color</p>
              </div>
              <Select value={accent} onValueChange={handleAccentChange}>
                <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
                  <SelectValue placeholder="Select accent..." />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { val: "default", label: "Default", colorCls: "bg-gray-400" },
                    { val: "blue", label: "Blue", colorCls: "bg-blue-500" },
                    { val: "green", label: "Green", colorCls: "bg-green-500" },
                    { val: "yellow", label: "Yellow", colorCls: "bg-yellow-500" },
                    { val: "pink", label: "Pink", colorCls: "bg-pink-500" },
                    { val: "orange", label: "Orange", colorCls: "bg-orange-500" },
                    { val: "purple", label: "Purple", colorCls: "bg-purple-500" },
                    { val: "white", label: "White", colorCls: "bg-neutral-200 border border-neutral-300 dark:border-none dark:bg-white" },
                  ].map(opt => (
                    <SelectItem key={opt.val} value={opt.val} className="text-xs">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", opt.colorCls)} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Danger Zone ─── */}
      <section>
        <SectionHeader>Danger Zone</SectionHeader>
        <div className="rounded-xl border border-destructive/30 bg-card overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-txt-primary">Reset App</p>
              <p className="text-xs text-txt-muted mt-0.5">
                Clear all settings and return to onboarding. Your files stay safe.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="shrink-0"
              onClick={() => {
                if (confirm("Reset app config? Your markdown files won't be deleted.")) {
                  workspaceConfig.clear();
                  window.location.reload();
                }
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              Reset
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
