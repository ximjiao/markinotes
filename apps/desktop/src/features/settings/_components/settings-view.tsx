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
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { workspaceConfig, AiProvider } from "../../workspace/_lib/workspace-config";
import { LocalFolderNode } from "../../workspace/_types/folder.types";
import { isTauri, noteIpc } from "../../home/_lib/note-ipc";
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

const PROVIDER_OPTIONS: {
  id: AiProvider;
  label: string;
  badge?: string;
  keyPlaceholder: string;
  defaultModel: string;
  models: { id: string; label: string; desc?: string }[];
}[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    badge: "Fast & High Context",
    keyPlaceholder: "AIzaSy...",
    defaultModel: "gemini-1.5-flash",
    models: [
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", desc: "Recommended · Fast & efficient" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", desc: "Complex reasoning & deep analysis" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", desc: "Next-gen high speed" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    badge: "Smart & Natural",
    keyPlaceholder: "sk-ant-...",
    defaultModel: "claude-3-5-sonnet-20241022",
    models: [
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", desc: "Recommended · State of the art" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", desc: "Lightweight & responsive" },
      { id: "claude-3-opus-20240229", label: "Claude 3 Opus", desc: "Deep analytical reasoning" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI ChatGPT",
    badge: "Industry Standard",
    keyPlaceholder: "sk-...",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Recommended · Fast & versatile" },
      { id: "gpt-4o", label: "GPT-4o", desc: "Flagship multi-modal model" },
      { id: "o3-mini", label: "o3-mini", desc: "High-level STEM & reasoning" },
    ],
  },
  {
    id: "custom",
    label: "Custom / Self-Hosted",
    badge: "Custom Endpoint",
    keyPlaceholder: "API key or token...",
    defaultModel: "custom-model",
    models: [
      { id: "custom-model", label: "Custom Model", desc: "Specify custom model identifier" },
    ],
  },
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
  const [aiProvider, setAiProvider] = useState<AiProvider>(config.aiProvider || "gemini");
  const [aiApiKey, setAiApiKey] = useState(config.aiApiKey || config.geminiApiKey || "");
  const [aiModel, setAiModel] = useState(config.aiModel || config.geminiModel || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isCustomModelInput, setIsCustomModelInput] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testFeedback, setTestFeedback] = useState<{ message: string; latency_ms?: number; model?: string } | null>(null);
  const [isReady, setIsReady] = useState(false);

  const currentProvider = PROVIDER_OPTIONS.find((p) => p.id === aiProvider) || PROVIDER_OPTIONS[0];

  // Appearance states
  const { theme, setTheme } = useTheme();
  const [textSizeIdx, setTextSizeIdx] = useState(2); // default = M
  const [contrast, setContrast] = useState("standard");
  const [accent, setAccent] = useState("default");

  useEffect(() => {
    const storedIdx = Number(localStorage.getItem("marki_text_size_idx") ?? "2");
    const savedContrast = localStorage.getItem("markidown-contrast") || "standard";
    const savedAccent = localStorage.getItem("markidown-accent") || "default";

    const currentConfig = workspaceConfig.get();
    const resolvedProvider = currentConfig.aiProvider || "gemini";
    const resolvedKey = currentConfig.aiApiKey || currentConfig.geminiApiKey || "";
    const resolvedModel = currentConfig.aiModel || currentConfig.geminiModel || "";

    setAiProvider(resolvedProvider);
    setAiApiKey(resolvedKey);
    setAiModel(resolvedModel);
    setWorkspaceName(currentConfig.name || "");
    setFolders(currentConfig.folders || []);

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

      {/* ─── AI Configuration ─── */}
      <section>
        <SectionHeader>AI Configuration</SectionHeader>
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/60">
          
          {/* Provider Selector */}
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-txt-primary">AI Provider</p>
              <p className="text-xs text-txt-muted mt-0.5">
                Choose the model provider for AI summary and editing
              </p>
            </div>
            <Select
              value={aiProvider}
              onValueChange={(val: AiProvider) => {
                setAiProvider(val);
                const provDef = PROVIDER_OPTIONS.find((p) => p.id === val);
                const nextModel = provDef?.defaultModel || "";
                setAiModel(nextModel);
                setIsCustomModelInput(val === "custom");
                workspaceConfig.set({ aiProvider: val, aiModel: nextModel });
                setTestStatus("idle");
                setTestFeedback(null);
              }}
            >
              <SelectTrigger className="w-[190px] h-8 text-xs bg-background">
                <SelectValue placeholder="Select provider..." />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3 w-3 text-txt-brand" />
                      <span>{opt.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Selector */}
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-txt-primary">Model</p>
              <p className="text-xs text-txt-muted mt-0.5">
                {currentProvider?.badge || "Select model"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isCustomModelInput && aiProvider !== "custom" ? (
                <div className="flex items-center gap-1.5">
                  <Select
                    value={aiModel || currentProvider?.defaultModel || ""}
                    onValueChange={(val) => {
                      if (val === "__custom__") {
                        setIsCustomModelInput(true);
                      } else {
                        setAiModel(val);
                        workspaceConfig.set({ aiModel: val, geminiModel: val });
                        setTestStatus("idle");
                        setTestFeedback(null);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[190px] h-8 text-xs bg-background">
                      <SelectValue placeholder="Select model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {currentProvider?.models.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          <div className="flex flex-col">
                            <span className="font-medium">{m.label}</span>
                            {m.desc && <span className="text-[10px] text-txt-muted">{m.desc}</span>}
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__" className="text-xs text-txt-brand font-medium">
                        Custom Model ID…
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="text"
                    placeholder={currentProvider?.defaultModel || "Enter model ID..."}
                    className="w-[150px] h-8 text-xs"
                    value={aiModel}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAiModel(val);
                      workspaceConfig.set({ aiModel: val, geminiModel: val });
                      setTestStatus("idle");
                      setTestFeedback(null);
                    }}
                  />
                  {aiProvider !== "custom" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-txt-muted hover:text-txt-primary"
                      onClick={() => {
                        setIsCustomModelInput(false);
                        const fallbackModel = currentProvider?.defaultModel || "";
                        setAiModel(fallbackModel);
                        workspaceConfig.set({ aiModel: fallbackModel, geminiModel: fallbackModel });
                      }}
                    >
                      Presets
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* API Key */}
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-txt-primary">API Key</p>
              <p className="text-xs text-txt-muted mt-0.5">
                Leave blank to fallback to .env configuration
              </p>
            </div>
            <div className="relative flex items-center">
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder={currentProvider?.keyPlaceholder || "API key..."}
                className="w-[200px] h-8 text-xs pr-8"
                value={aiApiKey}
                onChange={(e) => {
                  const val = e.target.value;
                  setAiApiKey(val);
                  workspaceConfig.set({ aiApiKey: val, geminiApiKey: val });
                  setTestStatus("idle");
                  setTestFeedback(null);
                }}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 text-txt-muted hover:text-txt-primary focus:outline-none transition-colors"
                title={showApiKey ? "Hide API key" : "Show API key"}
              >
                {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Test Connection & Live Status */}
          <div className="flex flex-col gap-3 px-5 py-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-txt-primary">Connectivity Test</span>
                {testStatus === "success" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected ({testFeedback?.latency_ms}ms)
                  </span>
                )}
                {testStatus === "error" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20">
                    <XCircle className="h-3 w-3" />
                    Connection Error
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs shrink-0"
                disabled={testStatus === "testing"}
                onClick={async () => {
                  setTestStatus("testing");
                  setTestFeedback(null);
                  try {
                    const res = await noteIpc.testAiConnection(
                      rootPath,
                      aiProvider,
                      aiApiKey.trim() || undefined,
                      aiModel.trim() || undefined
                    );
                    if (res.success) {
                      setTestStatus("success");
                      setTestFeedback(res);
                      toast.success(`Connected (${res.latency_ms}ms)`);
                    } else {
                      setTestStatus("error");
                      setTestFeedback(res);
                      toast.error(res.message || "Connection failed");
                    }
                  } catch (err: any) {
                    setTestStatus("error");
                    const msg = typeof err === "string" ? err : err?.message || "Failed to connect to AI provider";
                    setTestFeedback({ message: msg });
                    toast.error(msg);
                  }
                }}
              >
                {testStatus === "testing" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>

            {testFeedback?.message && (
              <p
                className={cn(
                  "text-[11px] leading-relaxed rounded-lg p-2.5 border",
                  testStatus === "success"
                    ? "bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                    : testStatus === "error"
                    ? "bg-destructive/5 text-destructive border-destructive/20"
                    : "bg-muted text-txt-muted border-border"
                )}
              >
                {testFeedback.message}
              </p>
            )}
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
