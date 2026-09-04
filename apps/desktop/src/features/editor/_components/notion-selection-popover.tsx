"use client";

import React, { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/core";
import {
  Sparkles,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Type,
  ChevronRight,
  ChevronDown,
  Loader2,
  Check,
  Copy,
  ArrowDownToLine,
  RefreshCw,
  X,
  Send,
  Wand2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  NotionMenuSectionHeader,
  NotionMenuItem,
} from "./notion-popover-primitives";
import { noteIpc } from "@/features/home/_lib/note-ipc";

const TEXT_COLORS = [
  { id: "default", label: "Default color", color: "inherit" },
  { id: "gray", label: "Gray", color: "#9ca3af" },
  { id: "brown", label: "Brown", color: "#b45309" },
  { id: "orange", label: "Orange", color: "#f97316" },
  { id: "yellow", label: "Yellow", color: "#eab308" },
  { id: "green", label: "Green", color: "#22c55e" },
  { id: "blue", label: "Blue", color: "#3b82f6" },
  { id: "purple", label: "Purple", color: "#a855f7" },
  { id: "pink", label: "Pink", color: "#ec4899" },
  { id: "red", label: "Red", color: "#ef4444" },
];

const BG_HIGHLIGHTS = [
  { id: "default", label: "Default background", bg: "transparent" },
  { id: "gray_background", label: "Gray background", bg: "rgba(156, 163, 175, 0.25)" },
  { id: "brown_background", label: "Brown background", bg: "rgba(180, 83, 9, 0.25)" },
  { id: "orange_background", label: "Orange background", bg: "rgba(249, 115, 22, 0.25)" },
  { id: "yellow_background", label: "Yellow background", bg: "rgba(234, 179, 8, 0.25)" },
  { id: "green_background", label: "Green background", bg: "rgba(34, 197, 94, 0.25)" },
  { id: "blue_background", label: "Blue background", bg: "rgba(59, 130, 246, 0.25)" },
  { id: "purple_background", label: "Purple background", bg: "rgba(168, 85, 247, 0.25)" },
  { id: "pink_background", label: "Pink background", bg: "rgba(236, 72, 153, 0.25)" },
  { id: "red_background", label: "Red background", bg: "rgba(239, 68, 68, 0.25)" },
];

interface NotionSelectionPopoverProps {
  editor: Editor;
  workspacePath?: string | null;
  noteId?: string;
}

export function NotionSelectionPopover({
  editor,
  workspacePath,
  noteId,
}: NotionSelectionPopoverProps) {
  const [activeSubmenu, setActiveSubmenu] = useState<"turnInto" | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "streaming" | "completed" | "error">("idle");
  const [aiResult, setAiResult] = useState("");
  const [aiErrorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [isColorOpen, setIsColorOpen] = useState(false);

  const isInTable = editor.isActive("table") || editor.isActive("tableCell") || editor.isActive("tableHeader");

  const handleApplyTextColor = (color: string) => {
    if (!editor) return;
    if (!color || color === "inherit" || color === "default") {
      editor.chain().focus().unsetMark("textColor").run();
    } else {
      editor.chain().focus().setMark("textColor", { color }).run();
    }
    setIsColorOpen(false);
  };

  const handleApplyHighlight = (bgColor: string) => {
    if (!editor) return;
    if (!bgColor || bgColor === "transparent" || bgColor === "default") {
      editor.chain().focus().unsetMark("textHighlight").run();
    } else {
      editor.chain().focus().setMark("textHighlight", { color: bgColor }).run();
    }
    setIsColorOpen(false);
  };

  // Determine current active block type
  const getCurrentBlockInfo = () => {
    if (isInTable) return { label: "Table Cell", icon: <Type className="h-3.5 w-3.5" /> };
    if (editor.isActive("heading", { level: 1 })) return { label: "Heading 1", icon: <Heading1 className="h-3.5 w-3.5" /> };
    if (editor.isActive("heading", { level: 2 })) return { label: "Heading 2", icon: <Heading2 className="h-3.5 w-3.5" /> };
    if (editor.isActive("heading", { level: 3 })) return { label: "Heading 3", icon: <Heading3 className="h-3.5 w-3.5" /> };
    if (editor.isActive("bulletList")) return { label: "Bulleted list", icon: <List className="h-3.5 w-3.5" /> };
    if (editor.isActive("orderedList")) return { label: "Numbered list", icon: <ListOrdered className="h-3.5 w-3.5" /> };
    if (editor.isActive("taskList")) return { label: "To-do list", icon: <CheckSquare className="h-3.5 w-3.5" /> };
    if (editor.isActive("blockquote")) return { label: "Quote", icon: <Quote className="h-3.5 w-3.5" /> };
    if (editor.isActive("codeBlock")) return { label: "Code", icon: <Code className="h-3.5 w-3.5" /> };
    return { label: "Text", icon: <Type className="h-3.5 w-3.5" /> };
  };

  const blockInfo = getCurrentBlockInfo();

  // Turn into handler
  const handleTurnInto = (type: string, options?: any) => {
    if (isInTable) return; // Prevent breaking table structure
    if (type === "paragraph") editor.chain().focus().setParagraph().run();
    else if (type === "heading") editor.chain().focus().toggleHeading({ level: options?.level || 1 }).run();
    else if (type === "bulletList") editor.chain().focus().toggleBulletList().run();
    else if (type === "orderedList") editor.chain().focus().toggleOrderedList().run();
    else if (type === "taskList") editor.chain().focus().toggleTaskList().run();
    else if (type === "blockquote") editor.chain().focus().toggleBlockquote().run();
    else if (type === "codeBlock") editor.chain().focus().toggleCodeBlock().run();
    setActiveSubmenu(null);
  };

  // Link handler
  const handleOpenLinkPopover = (open: boolean) => {
    if (open) {
      const currentHref = editor.getAttributes("link").href || "";
      setLinkUrl(currentHref);
    }
    setIsLinkOpen(open);
  };

  const handleSetLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    }
    setIsLinkOpen(false);
    setLinkUrl("");
  };

  // AI Stream Trigger
  const handleRunAi = async (instruction: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;

    const selectedText = editor.state.doc.textBetween(from, to, " ");
    if (!selectedText.trim()) return;

    setAiStatus("streaming");
    setAiResult("");
    setErrorMessage("");

    try {
      await noteIpc.editWithAiStream(
        workspacePath || "",
        selectedText,
        instruction,
        (chunk) => {
          setAiResult((prev) => prev + chunk);
        }
      );
      setAiStatus("completed");
    } catch (err: any) {
      setAiStatus("error");
      setErrorMessage(typeof err === "string" ? err : err?.message || "Gagal memproses AI");
    }
  };

  // AI Insertion Actions
  const handleReplaceSelection = () => {
    if (!editor || !aiResult) return;
    const { from, to } = editor.state.selection;
    editor.chain().focus().insertContentAt({ from, to }, aiResult).run();
    handleResetAi();
  };

  const handleInsertBelow = () => {
    if (!editor || !aiResult) return;
    if (isInTable) {
      const { to } = editor.state.selection;
      editor.chain().focus().insertContentAt(to, " " + aiResult).run();
      handleResetAi();
      return;
    }
    const { to } = editor.state.selection;
    const $to = editor.state.doc.resolve(to);
    const endOfBlock = $to.after(1);
    editor.chain().focus().insertContentAt(endOfBlock, {
      type: "paragraph",
      content: [{ type: "text", text: aiResult }],
    }).run();
    handleResetAi();
  };

  const handleCopyAiResult = async () => {
    if (!aiResult) return;
    await navigator.clipboard.writeText(aiResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleResetAi = () => {
    setAiStatus("idle");
    setAiResult("");
    setErrorMessage("");
    setCustomPrompt("");
  };

  return (
    <div className="flex flex-col rounded-xl border border-border bg-popover text-txt-primary shadow-2xl backdrop-blur-md z-50 text-xs w-[320px] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
      {/* ─── 1. Top Bar: Turn into & Inline Formatting Icons ─── */}
      <div className="flex items-center justify-between p-1.5 border-b border-border/50 bg-accent/20">
        {/* Turn into Dropdown */}
        <Popover open={activeSubmenu === "turnInto"} onOpenChange={(open) => setActiveSubmenu(open ? "turnInto" : null)}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs flex items-center gap-1.5 font-medium hover:bg-accent rounded-lg"
            >
              {blockInfo.icon}
              <span className="truncate max-w-[100px]">{blockInfo.label}</span>
              <ChevronDown className="h-3 w-3 text-txt-muted shrink-0 ml-0.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-48 p-1.5 bg-popover border border-border rounded-xl shadow-xl z-50 text-xs space-y-0.5">
            <NotionMenuSectionHeader>Turn into</NotionMenuSectionHeader>
            <NotionMenuItem icon={<Type className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("paragraph")}>
              Text
            </NotionMenuItem>
            <NotionMenuItem icon={<Heading1 className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("heading", { level: 1 })}>
              Heading 1
            </NotionMenuItem>
            <NotionMenuItem icon={<Heading2 className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("heading", { level: 2 })}>
              Heading 2
            </NotionMenuItem>
            <NotionMenuItem icon={<Heading3 className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("heading", { level: 3 })}>
              Heading 3
            </NotionMenuItem>
            <NotionMenuItem icon={<List className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("bulletList")}>
              Bulleted list
            </NotionMenuItem>
            <NotionMenuItem icon={<ListOrdered className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("orderedList")}>
              Numbered list
            </NotionMenuItem>
            <NotionMenuItem icon={<CheckSquare className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("taskList")}>
              To-do list
            </NotionMenuItem>
            <NotionMenuItem icon={<Quote className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("blockquote")}>
              Quote
            </NotionMenuItem>
            <NotionMenuItem icon={<Code className="h-3.5 w-3.5" />} onClick={() => handleTurnInto("codeBlock")}>
              Code
            </NotionMenuItem>
          </PopoverContent>
        </Popover>

        {/* Formatting Actions (Bold, Italic, Strike, Code, Link, Color) */}
        <div className="flex items-center gap-0.5">
          {/* Bold */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("h-7 w-7 rounded-md", editor.isActive("bold") && "bg-accent font-bold text-txt-brand")}
            title="Bold (⌘B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>

          {/* Italic */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("h-7 w-7 rounded-md", editor.isActive("italic") && "bg-accent text-txt-brand")}
            title="Italic (⌘I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>

          {/* Strikethrough */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn("h-7 w-7 rounded-md", editor.isActive("strike") && "bg-accent text-txt-brand")}
            title="Strikethrough (⌘⇧S)"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </Button>

          {/* Inline Code */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={cn("h-7 w-7 rounded-md", editor.isActive("code") && "bg-accent text-txt-brand")}
            title="Inline code (⌘E)"
          >
            <Code className="h-3.5 w-3.5" />
          </Button>

          {/* Link Popover */}
          <Popover open={isLinkOpen} onOpenChange={handleOpenLinkPopover}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7 rounded-md", editor.isActive("link") && "bg-accent text-txt-brand")}
                title="Tautan / Link (⌘K)"
              >
                <LinkIcon className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="center" className="w-64 p-2 bg-popover border border-border rounded-xl shadow-xl z-50 text-xs">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSetLink()}
                  placeholder="https://..."
                  className="flex-1 bg-accent/40 text-txt-primary text-xs px-2.5 py-1.5 rounded-lg border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/60"
                  autoFocus
                />
                <Button size="sm" onClick={handleSetLink} className="h-7 px-2 text-xs">
                  Set
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Color & Highlight Popover */}
          <Popover open={isColorOpen} onOpenChange={setIsColorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 rounded-md relative flex items-center justify-center font-bold text-xs",
                  (editor.isActive("textColor") || editor.isActive("textHighlight")) && "bg-accent text-txt-brand"
                )}
                title="Warna teks & Highlight"
              >
                <div className="flex flex-col items-center justify-center leading-none">
                  <span 
                    className="text-[11px] font-bold"
                    style={{ 
                      color: editor.getAttributes("textColor").color && editor.getAttributes("textColor").color !== "inherit" 
                        ? editor.getAttributes("textColor").color 
                        : undefined 
                    }}
                  >
                    A
                  </span>
                  <div 
                    className="h-0.5 w-3 rounded-full mt-0.5" 
                    style={{ 
                      backgroundColor: editor.getAttributes("textHighlight").color && editor.getAttributes("textHighlight").color !== "transparent"
                        ? editor.getAttributes("textHighlight").color 
                        : editor.getAttributes("textColor").color && editor.getAttributes("textColor").color !== "inherit"
                        ? editor.getAttributes("textColor").color
                        : "currentColor" 
                    }} 
                  />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="bottom" 
              align="end" 
              className="w-56 p-1 bg-popover border border-border rounded-xl shadow-2xl z-50 text-xs max-h-[300px] overflow-y-auto space-y-1"
            >
              <NotionMenuSectionHeader>Warna teks</NotionMenuSectionHeader>
              <div className="space-y-0.5">
                {TEXT_COLORS.map((c) => {
                  const activeColor = editor.getAttributes("textColor").color || "inherit";
                  const isSelected = (c.color === "inherit" && (!activeColor || activeColor === "inherit" || activeColor === "default")) || activeColor.toLowerCase() === c.color.toLowerCase();

                  return (
                    <NotionMenuItem
                      key={c.id}
                      active={isSelected}
                      icon={
                        <div 
                          className="h-4 w-4 rounded flex items-center justify-center font-bold text-xs text-txt-primary" 
                          style={{ color: c.color !== "inherit" ? c.color : undefined }}
                        >
                          A
                        </div>
                      }
                      onClick={() => handleApplyTextColor(c.color)}
                    >
                      {c.label}
                    </NotionMenuItem>
                  );
                })}
              </div>

              <NotionMenuSectionHeader className="pt-1.5 border-t border-border/40">Highlight</NotionMenuSectionHeader>
              <div className="space-y-0.5">
                {BG_HIGHLIGHTS.map((h) => {
                  const activeBg = editor.getAttributes("textHighlight").color || "transparent";
                  const isSelected = (h.bg === "transparent" && (!activeBg || activeBg === "transparent" || activeBg === "default")) || activeBg.toLowerCase() === h.bg.toLowerCase();

                  return (
                    <NotionMenuItem
                      key={h.id}
                      active={isSelected}
                      icon={
                        <div className="h-4 w-4 rounded flex items-center justify-center font-bold text-xs" style={{ backgroundColor: h.bg }}>
                          A
                        </div>
                      }
                      onClick={() => handleApplyHighlight(h.bg)}
                    >
                      {h.label}
                    </NotionMenuItem>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ─── 2. AI Skills & Preset Actions ─── */}
      {aiStatus === "idle" && (
        <div className="p-1 space-y-0.5">
          <NotionMenuSectionHeader className="flex items-center gap-1.5 text-txt-brand font-semibold">
            <Sparkles className="h-3 w-3 text-txt-brand" /> AI Skills
          </NotionMenuSectionHeader>

          <NotionMenuItem
            icon={<Wand2 className="h-3.5 w-3.5 text-purple-500" />}
            onClick={() => handleRunAi("Poles dan tingkatkan kualitas penulisan (improve writing) teks ini agar lebih jelas, natural, dan profesional tanpa mengubah maknanya.")}
          >
            Improve writing
          </NotionMenuItem>

          <NotionMenuItem
            icon={<Check className="h-3.5 w-3.5 text-emerald-500" />}
            onClick={() => handleRunAi("Perbaiki seluruh kesalahan ejaan, tata bahasa (grammar/PUEBI), dan tanda baca pada teks ini.")}
          >
            Fix spelling & grammar
          </NotionMenuItem>

          <NotionMenuItem
            icon={<FileText className="h-3.5 w-3.5 text-blue-500" />}
            onClick={() => handleRunAi("Jelaskan maksud dan konsep dari teks ini secara ringkas dan mudah dimengerti.")}
          >
            Explain
          </NotionMenuItem>

          <NotionMenuItem
            icon={<Sparkles className="h-3.5 w-3.5 text-amber-500" />}
            onClick={() => handleRunAi("Buat ringkasan (summary) yang padat dari teks terpilih ini.")}
          >
            Summarize selection
          </NotionMenuItem>

          <NotionMenuItem
            icon={<ArrowDownToLine className="h-3.5 w-3.5 text-indigo-500" />}
            onClick={() => handleRunAi("Buat teks ini lebih ringkas dan to the point (make shorter).")}
          >
            Make shorter
          </NotionMenuItem>

          <Separator className="my-1" />

          {/* Custom AI Prompt Input */}
          <div className="p-1">
            <div className="flex items-center gap-1.5 bg-accent/40 rounded-lg px-2.5 py-1.5 border border-border/60 focus-within:ring-1 focus-within:ring-primary/60">
              <Sparkles className="h-3.5 w-3.5 text-txt-brand shrink-0" />
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customPrompt.trim()) {
                    handleRunAi(customPrompt.trim());
                  }
                }}
                placeholder="Ask AI to edit or generate..."
                className="w-full bg-transparent text-txt-primary text-xs focus:outline-none placeholder:text-txt-muted/70"
              />
              <Button
                variant="ghost"
                size="icon"
                disabled={!customPrompt.trim()}
                onClick={() => customPrompt.trim() && handleRunAi(customPrompt.trim())}
                className="h-5 w-5 shrink-0 text-txt-muted hover:text-txt-brand"
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. AI Streaming & Result Card View ─── */}
      {aiStatus !== "idle" && (
        <div className="p-2.5 space-y-2 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between text-[11px] font-semibold text-txt-brand">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              {aiStatus === "streaming" ? "AI sedang menulis..." : "Hasil AI"}
            </div>
            {aiStatus === "streaming" && <Loader2 className="h-3 w-3 animate-spin text-txt-brand" />}
          </div>

          {/* AI Result Body */}
          <div className="p-2 rounded-lg bg-accent/40 border border-border/50 text-xs text-txt-primary font-sans whitespace-pre-wrap leading-relaxed">
            {aiResult || (aiStatus === "streaming" ? "Memproses..." : "")}
            {aiErrorMessage && <span className="text-destructive font-medium">{aiErrorMessage}</span>}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 pt-1">
            <Button
              size="sm"
              onClick={handleReplaceSelection}
              disabled={aiStatus === "streaming" || !aiResult}
              className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90 flex-1"
            >
              Replace selection
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleInsertBelow}
              disabled={aiStatus === "streaming" || !aiResult}
              className="h-7 text-xs px-2"
              title="Sisipkan di bawah"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyAiResult}
              disabled={!aiResult}
              className="h-7 w-7"
              title="Salin hasil"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetAi}
              className="h-7 w-7 text-txt-muted hover:text-destructive"
              title="Tutup / Batal"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
