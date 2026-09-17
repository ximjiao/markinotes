"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Calendar as CalendarIcon,
  Flag,
  Tag,
  Trash2,
  Plus,
  Layers,
  FileText,
  ChevronDown,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isValid } from "date-fns";
import type { KanbanBlockCard, KanbanBlockColumn } from "./custom-kanban-extension";
import { TaskDescriptionEditor } from "./task-description-editor";
import { cn } from "@/lib/utils";

const PRIORITIES = [
  { id: "urgent", label: "Urgent", dot: "bg-red-500", text: "text-red-500" },
  { id: "high", label: "High", dot: "bg-amber-500", text: "text-amber-500" },
  { id: "medium", label: "Medium", dot: "bg-yellow-500", text: "text-yellow-500" },
  { id: "low", label: "Low", dot: "bg-blue-500", text: "text-blue-500" },
  { id: "none", label: "No Priority", dot: "bg-slate-400", text: "text-txt-muted" },
] as const;

interface KanbanTaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  boardTitle: string;
  columns: KanbanBlockColumn[];
  currentColId: string;
  card?: KanbanBlockCard | null; // null if creating a new card
  onSave: (targetColId: string, cardData: KanbanBlockCard) => void;
  onDelete?: (colId: string, cardId: string) => void;
}

export function KanbanTaskDrawer({
  isOpen,
  onClose,
  boardTitle,
  columns,
  currentColId,
  card,
  onSave,
  onDelete,
}: KanbanTaskDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedColId, setSelectedColId] = useState<string>(currentColId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<KanbanBlockCard["priority"]>("none");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Exit animation lifecycle management
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Smooth Exit Animation Transition
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
    } else if (isRendered) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsRendered(false);
        setIsClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isRendered]);

  // Comprehensive Background Scroll Locking & Event Containment
  useEffect(() => {
    if (!isRendered) return;

    // 1. Lock document body and root
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    // 2. Lock all scrollable ancestors and editor containers
    const scrollContainers = Array.from(
      document.querySelectorAll(".overflow-y-auto, .overflow-auto, [data-full-width]")
    ) as HTMLElement[];

    const affectedContainers: { el: HTMLElement; overflowY: string }[] = [];
    const drawerEl = drawerRef.current;

    scrollContainers.forEach((el) => {
      if (drawerEl && drawerEl.contains(el)) return;
      affectedContainers.push({ el, overflowY: el.style.overflowY });
      el.style.overflowY = "hidden";
    });

    // 3. Global wheel & touch event listener to prevent background scroll leaking
    const handleGlobalWheel = (e: WheelEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isClosing) {
        if (isExpanded) {
          setIsExpanded(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("wheel", handleGlobalWheel, { passive: false });
    window.addEventListener("touchmove", handleGlobalTouchMove, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      affectedContainers.forEach(({ el, overflowY }) => {
        el.style.overflowY = overflowY;
      });
      window.removeEventListener("wheel", handleGlobalWheel);
      window.removeEventListener("touchmove", handleGlobalTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRendered, isClosing, isExpanded, onClose]);

  // Sync state whenever card or drawer opens
  useEffect(() => {
    if (isOpen) {
      setSelectedColId(currentColId);
      if (card) {
        setTitle(card.title || "");
        setDescription(card.description || "");
        setPriority(card.priority || "none");
        setDueDate(card.dueDate || "");
        setTags(card.tags || []);
      } else {
        setTitle("");
        setDescription("");
        setPriority("none");
        setDueDate("");
        setTags([]);
      }
      setIsAddingTag(false);
      setNewTagInput("");
      setIsCalendarOpen(false);
      setIsExpanded(false);
    }
  }, [isOpen, card, currentColId]);

  if (!isRendered) return null;

  const currentColumn = columns.find((c) => c.id === selectedColId);
  const activePriorityMeta =
    PRIORITIES.find((p) => p.id === priority) || PRIORITIES[4];

  const selectedDate = dueDate
    ? (() => {
        try {
          const d = parseISO(dueDate);
          return isValid(d) ? d : undefined;
        } catch {
          return undefined;
        }
      })()
    : undefined;

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().replace(/^#/, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setNewTagInput("");
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalTitle = title.trim();
    if (!finalTitle) return;

    const finalCard: KanbanBlockCard = {
      id: card?.id || `card-${crypto.randomUUID().slice(0, 8)}`,
      title: finalTitle,
      description: description.trim() || undefined,
      priority: priority !== "none" ? priority : undefined,
      dueDate: dueDate || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    onSave(selectedColId, finalCard);
    onClose();
  };

  const drawerContent = (
    <div
      ref={drawerRef}
      className={cn(
        "fixed inset-0 z-50 select-text",
        isClosing ? "pointer-events-none" : "pointer-events-auto"
      )}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        onWheel={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200",
          isClosing ? "animate-out fade-out" : "animate-in fade-in"
        )}
      />

      {/* Slide-over Drawer Panel or Centered Modal (ClickUp / Linear style) */}
      <div
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        className={cn(
          "bg-card shadow-2xl flex flex-col overscroll-contain touch-pan-y transition-all duration-200",
          isExpanded
            ? "fixed inset-4 sm:inset-y-10 sm:left-1/2 sm:-translate-x-1/2 w-full max-w-4xl max-h-[88vh] border border-border rounded-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150"
            : "fixed inset-y-0 right-0 w-full sm:w-[540px] border-l border-border",
          isClosing && (isExpanded ? "animate-out zoom-out-95 fade-out duration-200" : "animate-out slide-out-to-right duration-200"),
          !isClosing && !isExpanded && "animate-in slide-in-from-right duration-200"
        )}
      >
        {/* Drawer Top Navigation Header */}
        <div
          className={cn(
            "flex items-center justify-between border-b border-border/70 shrink-0 bg-secondary/10 transition-all duration-200",
            isExpanded ? "px-8 py-4" : "px-6 py-4"
          )}
        >
          <div className="flex items-center gap-2 text-xs text-txt-muted">
            <span className="font-semibold text-txt-primary flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-txt-brand" />
              {boardTitle}
            </span>
            <span>/</span>

            {/* Status Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary hover:bg-accent text-xs font-semibold text-txt-primary border border-border/60 transition-colors">
                  <span>{currentColumn?.title || "Status"}</span>
                  <ChevronDown className="h-3 w-3 text-txt-muted" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 p-1.5 shadow-xl rounded-xl z-[70]">
                {columns.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => setSelectedColId(c.id)}
                    className={cn(
                      "text-xs cursor-pointer rounded-lg",
                      selectedColId === c.id && "bg-accent font-bold text-primary"
                    )}
                  >
                    {c.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 text-txt-muted hover:text-txt-primary rounded-lg transition-colors"
              title={isExpanded ? "Switch to side drawer" : "Expand to center modal"}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-txt-muted hover:text-txt-primary rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Drawer Body Form (Scrollable) */}
        <div
          className={cn(
            "flex-1 overflow-y-auto overscroll-contain space-y-6 transition-all duration-200",
            isExpanded ? "px-8 py-6" : "px-6 py-5"
          )}
        >
          {/* Task Title Input */}
          <div className="space-y-1">
            <input
              type="text"
              placeholder="Task Title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
              autoFocus
              className="w-full text-lg font-bold text-txt-primary bg-transparent border-none outline-none placeholder:text-txt-muted/50 leading-snug"
            />
          </div>

          {/* Properties Meta Section (Priority, Due Date, Tags) */}
          <div className="space-y-3.5 py-3 border-y border-border/50">
            {/* Priority Selector */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-txt-muted flex items-center gap-2 font-medium w-28">
                <Flag className="h-3.5 w-3.5 text-txt-muted" /> Priority
              </span>
              <div className="flex-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/70 bg-secondary/30 hover:bg-accent text-xs font-medium transition-colors">
                      <span className={cn("h-2 w-2 rounded-full", activePriorityMeta.dot)} />
                      <span>{activePriorityMeta.label}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-36 p-1 rounded-xl shadow-xl z-[70]">
                    {PRIORITIES.map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => setPriority(p.id)}
                        className="flex items-center gap-2 text-xs cursor-pointer py-1.5"
                      >
                        <span className={cn("h-2 w-2 rounded-full", p.dot)} />
                        <span>{p.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Due Date */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-txt-muted flex items-center gap-2 font-medium w-28">
                <CalendarIcon className="h-3.5 w-3.5 text-txt-muted" /> Due Date
              </span>
              <div className="flex-1 flex items-center gap-2">
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-1 rounded-lg border border-border/70 bg-secondary/30 hover:bg-accent text-xs font-medium transition-colors text-left",
                        !selectedDate && "text-txt-muted"
                      )}
                    >
                      <CalendarIcon className="h-3.5 w-3.5 opacity-70" />
                      <span>{selectedDate ? format(selectedDate, "MMM d, yyyy") : "Pick a due date"}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 rounded-xl shadow-2xl border-border bg-popover z-[70]"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setDueDate(format(date, "yyyy-MM-dd"));
                          setIsCalendarOpen(false);
                        } else {
                          setDueDate("");
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>

                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate("")}
                    className="h-6 w-6 rounded-md hover:bg-secondary/60 flex items-center justify-center text-txt-muted hover:text-destructive transition-colors"
                    title="Clear date"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Tags Property */}
            <div className="flex items-start justify-between text-xs pt-0.5">
              <span className="text-txt-muted flex items-center gap-2 font-medium w-28 pt-1">
                <Tag className="h-3.5 w-3.5 text-txt-muted" /> Tags
              </span>
              <div className="flex-1 flex flex-wrap items-center gap-1.5">
                {tags.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="gap-1 pl-2 pr-1 py-0.5 text-xs font-normal bg-secondary border border-border/60"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-txt-muted hover:text-destructive ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}

                {isAddingTag ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="tag..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                        if (e.key === "Escape") setIsAddingTag(false);
                      }}
                      autoFocus
                      className="h-6 w-20 px-2 text-xs bg-background border border-primary rounded"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleAddTag}
                      className="h-6 px-1.5 text-xs"
                    >
                      Add
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingTag(true)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed border-border text-[11px] text-txt-muted hover:text-txt-primary hover:bg-secondary/40 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add Tag
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Task Description / Notes (Rich TipTap & Markdown Editor) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-txt-muted flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-txt-muted" /> Description / Notes
              </span>
              <span className="text-[10px] text-txt-muted font-mono">
                Press <kbd className="px-1 py-0.5 rounded bg-secondary border border-border text-[9px]">/</kbd> for commands
              </span>
            </div>
            <TaskDescriptionEditor
              value={description}
              onChange={setDescription}
            />
          </div>
        </div>

        {/* Drawer Bottom Actions Footer */}
        <div
          className={cn(
            "flex items-center justify-between border-t border-border/70 bg-secondary/10 shrink-0 transition-all duration-200",
            isExpanded ? "px-8 py-4" : "px-6 py-3.5"
          )}
        >
          {card && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onDelete(currentColId, card.id);
                onClose();
              }}
              className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Task
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSubmit()}
              disabled={!title.trim()}
              className="h-8 text-xs bg-primary text-primary-foreground font-semibold px-4 shadow-sm"
            >
              {card ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (mounted && typeof document !== "undefined") {
    return createPortal(drawerContent, document.body);
  }

  return drawerContent;
}
