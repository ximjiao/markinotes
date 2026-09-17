"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  X,
  Tag,
  Folder,
  Layers,
  Sparkles,
  Workflow,
  GripVertical,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { NoteCard } from "./note-card";
import type { NoteCardData, NoteKanbanBoardProps, KanbanColumn } from "../_types/home.types";
import { cn } from "@/lib/utils";

const COLOR_PALETTES = [
  { id: "slate", name: "Slate", dot: "bg-slate-400 dark:bg-slate-500", border: "border-slate-500/20 bg-slate-500/5" },
  { id: "blue", name: "Blue", dot: "bg-sky-500 dark:bg-sky-400", border: "border-sky-500/20 bg-sky-500/5" },
  { id: "amber", name: "Amber", dot: "bg-amber-500 dark:bg-amber-400", border: "border-amber-500/20 bg-amber-500/5" },
  { id: "purple", name: "Purple", dot: "bg-purple-500 dark:bg-purple-400", border: "border-purple-500/20 bg-purple-500/5" },
  { id: "emerald", name: "Green", dot: "bg-emerald-500 dark:bg-emerald-400", border: "border-emerald-500/20 bg-emerald-500/5" },
  { id: "rose", name: "Rose", dot: "bg-rose-500 dark:bg-rose-400", border: "border-rose-500/20 bg-rose-500/5" },
];

const PRESET_WORKFLOWS = [
  {
    name: "Simple (Trello)",
    columns: ["To Do", "In Progress", "Done"],
  },
  {
    name: "Agile / Scrum",
    columns: ["Backlog", "To Do", "In Progress", "Review", "Done"],
  },
  {
    name: "Editorial",
    columns: ["Idea", "Drafting", "In Review", "Published"],
  },
  {
    name: "Bug Tracking",
    columns: ["Reported", "Investigating", "Fixing", "Verified", "Closed"],
  },
];

const DEFAULT_COLUMNS: KanbanColumn[] = [
  {
    id: "todo",
    title: "To Do",
    dotColor: "bg-slate-400 dark:bg-slate-500",
    color: "border-slate-500/20 bg-slate-500/5",
  },
  {
    id: "in-progress",
    title: "In Progress",
    dotColor: "bg-amber-500 dark:bg-amber-400",
    color: "border-amber-500/20 bg-amber-500/5",
  },
  {
    id: "review",
    title: "Review",
    dotColor: "bg-purple-500 dark:bg-purple-400",
    color: "border-purple-500/20 bg-purple-500/5",
  },
  {
    id: "done",
    title: "Done",
    dotColor: "bg-emerald-500 dark:bg-emerald-400",
    color: "border-emerald-500/20 bg-emerald-500/5",
  },
];

function getColorMeta(col: { color?: string; dotColor?: string }, index: number) {
  if (col.color && col.dotColor) {
    return { dot: col.dotColor, border: col.color, id: col.color, name: "Custom" };
  }
  return COLOR_PALETTES[index % COLOR_PALETTES.length];
}

// ─── Sortable Card in Board using @dnd-kit ───
interface SortableHomeCardItemProps {
  note: NoteCardData;
  colId: string;
  onOpenNote?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onMove?: (id: string) => void;
  onExport?: (id: string) => void;
}

function SortableHomeCardItem({
  note,
  colId,
  onOpenNote,
  onDelete,
  onToggleStar,
  onMove,
  onExport,
}: SortableHomeCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: note.id,
    data: {
      type: "Card",
      note,
      colId,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn("touch-none select-none cursor-grab active:cursor-grabbing", isDragging && "opacity-20")}
    >
      <NoteCard
        note={note}
        variant="kanban"
        onOpen={onOpenNote}
        onDelete={onDelete}
        onToggleStar={onToggleStar}
        onMove={onMove}
        onExport={onExport}
      />
    </div>
  );
}

// ─── Droppable Column Component using @dnd-kit ───
interface DroppableHomeColumnProps {
  col: KanbanColumn;
  index: number;
  colNotes: NoteCardData[];
  onOpenNote?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onMove?: (id: string) => void;
  onExport?: (id: string) => void;
  onCreateNoteInColumn?: (status: string) => void;
  onUpdateTitle: (colId: string, title: string) => void;
  onDeleteColumn: (colId: string) => void;
  onOpenManageModal: () => void;
}

function DroppableHomeColumn({
  col,
  index,
  colNotes,
  onOpenNote,
  onDelete,
  onToggleStar,
  onMove,
  onExport,
  onCreateNoteInColumn,
  onUpdateTitle,
  onDeleteColumn,
  onOpenManageModal,
}: DroppableHomeColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.id,
    data: {
      type: "Column",
      colId: col.id,
      column: col,
    },
  });

  const colorMeta = getColorMeta(col, index);
  const cardIds = useMemo(() => colNotes.map((n) => n.id), [colNotes]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-80 shrink-0 h-full max-h-full rounded-2xl border bg-secondary/30 backdrop-blur-xs transition-all duration-200 shadow-xs",
        colorMeta.border,
        isOver && "border-primary/80 ring-2 ring-primary/20 bg-primary/10 shadow-md"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
          <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", colorMeta.dot)} />
          <input
            type="text"
            defaultValue={col.title}
            onBlur={(e) => onUpdateTitle(col.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="text-xs font-bold text-txt-primary bg-transparent border-none outline-none focus:bg-background/80 focus:ring-1 focus:ring-primary rounded px-1 w-full truncate"
          />
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-[10px] font-semibold text-txt-muted bg-background/80 border-border/60 shrink-0"
          >
            {colNotes.length}
          </Badge>
        </div>

        <div className="flex items-center gap-0.5">
          {onCreateNoteInColumn && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCreateNoteInColumn(col.title)}
              title={`Add note to ${col.title}`}
              className="h-7 w-7 text-txt-muted hover:text-txt-primary hover:bg-background/80 rounded-lg cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-txt-muted hover:text-txt-primary hover:bg-background/80 rounded-lg cursor-pointer"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 border-border bg-popover shadow-xl rounded-xl">
              <DropdownMenuItem
                onClick={() => onCreateNoteInColumn?.(col.title)}
                className="cursor-pointer gap-2 px-3 py-2 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> New Note Here
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onOpenManageModal}
                className="cursor-pointer gap-2 px-3 py-2 text-xs"
              >
                <Workflow className="h-3.5 w-3.5" /> Manage Statuses
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteColumn(col.id)}
                className="cursor-pointer gap-2 px-3 py-2 text-xs text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sortable Cards Container */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[140px]">
          {colNotes.map((note) => (
            <SortableHomeCardItem
              key={note.id}
              note={note}
              colId={col.id}
              onOpenNote={onOpenNote}
              onDelete={onDelete}
              onToggleStar={onToggleStar}
              onMove={onMove}
              onExport={onExport}
            />
          ))}

          {/* Empty Column Placeholder */}
          {colNotes.length === 0 && (
            <div
              onClick={() => onCreateNoteInColumn?.(col.title)}
              className={cn(
                "flex flex-col items-center justify-center p-6 border-2 border-dashed border-border/60 rounded-xl text-center cursor-pointer hover:border-primary/40 hover:bg-background/50 transition-colors group",
                isOver && "border-primary bg-primary/10"
              )}
            >
              <Plus className="h-5 w-5 text-txt-muted group-hover:text-primary mb-1 transition-colors" />
              <span className="text-xs font-medium text-txt-muted group-hover:text-txt-primary">
                No documents
              </span>
              <span className="text-[10px] text-txt-muted/70 mt-0.5">
                Click + to add a note
              </span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Sortable Status Item in Manage Modal ───
interface SortableStatusItemProps {
  status: KanbanColumn;
  index: number;
  onColorChange: (idx: number, colorId: string) => void;
  onTitleChange: (idx: number, title: string) => void;
  onDelete: (idx: number) => void;
}

function SortableStatusItem({
  status,
  index,
  onColorChange,
  onTitleChange,
  onDelete,
}: SortableStatusItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id || `status-${index}` });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: "relative",
  };

  const colorMeta = getColorMeta(status, index);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between gap-2 p-2 rounded-xl border border-border/70 bg-card hover:border-border transition-colors",
        isDragging && "shadow-xl border-primary ring-2 ring-primary/30 z-50 opacity-95 scale-[1.01]"
      )}
    >
      {/* Draggable Grip Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center px-1 text-txt-muted hover:text-txt-primary cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Color Dot Picker Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="h-5 w-5 rounded-full flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shrink-0"
            title="Change status color"
          >
            <span className={cn("h-3 w-3 rounded-full ring-2 ring-background", colorMeta.dot)} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36 p-1.5 rounded-xl shadow-xl">
          {COLOR_PALETTES.map((cp) => (
            <DropdownMenuItem
              key={cp.id}
              onClick={() => onColorChange(index, cp.id)}
              className="flex items-center gap-2 text-xs cursor-pointer py-1.5"
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", cp.dot)} />
              <span>{cp.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Title Input */}
      <Input
        type="text"
        value={status.title}
        onChange={(e) => onTitleChange(index, e.target.value)}
        className="h-8 text-xs font-medium flex-1 bg-background border-border"
      />

      {/* Delete Status */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onDelete(index)}
        className="h-7 w-7 text-txt-muted hover:text-destructive shrink-0"
        title="Delete status"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function NoteKanbanBoard({
  notes,
  workspacePath,
  onOpenNote,
  onDelete,
  onToggleStar,
  onMove,
  onExport,
  onUpdateStatus,
  onCreateNoteInColumn,
}: NoteKanbanBoardProps) {
  const [boardSearch, setBoardSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedParent, setSelectedParent] = useState<string | null>(null);

  // Active dragging card for @dnd-kit
  const [activeNote, setActiveNote] = useState<{ note: NoteCardData; colId: string } | null>(null);

  // Dynamic Workspace Columns with localStorage persistence
  const storageKey = workspacePath ? `marki_home_columns_${workspacePath}` : "marki_home_columns_default";

  const [columns, setColumns] = useState<KanbanColumn[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return DEFAULT_COLUMNS;
  });

  // Re-sync columns if workspacePath changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setColumns(parsed);
            return;
          }
        } catch {}
      }
      setColumns(DEFAULT_COLUMNS);
    }
  }, [storageKey]);

  const saveColumns = (newCols: KanbanColumn[]) => {
    setColumns(newCols);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(newCols));
    }
  };

  // Manage Statuses Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [tempStatuses, setTempStatuses] = useState<KanbanColumn[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Extract all unique tags across current notes
  const allUniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => {
      (n.tags || []).forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Extract all unique parents (folders/notebooks) across current notes
  const allUniqueParents = useMemo(() => {
    const parentSet = new Set<string>();
    notes.forEach((n) => {
      const parent =
        n.parent ||
        n.groupName ||
        (n.path ? n.path.split("/").slice(-2, -1)[0] : "General");
      if (parent) parentSet.add(parent);
    });
    return Array.from(parentSet).sort();
  }, [notes]);

  // Filter notes by search, tags, and parent
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // 1. Search Query Filter
      if (boardSearch.trim()) {
        const query = boardSearch.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(query);
        const matchExcerpt = (n.excerpt || "").toLowerCase().includes(query);
        const matchTag = (n.tags || []).some((t) => t.toLowerCase().includes(query));
        if (!matchTitle && !matchExcerpt && !matchTag) return false;
      }

      // 2. Tag Filter
      if (selectedTags.length > 0) {
        const noteTags = (n.tags || []).map((t) => t.toLowerCase());
        const hasAllTags = selectedTags.every((st) => noteTags.includes(st.toLowerCase()));
        if (!hasAllTags) return false;
      }

      // 3. Parent Filter
      if (selectedParent) {
        const noteParent =
          n.parent ||
          n.groupName ||
          (n.path ? n.path.split("/").slice(-2, -1)[0] : "General");
        if (noteParent !== selectedParent) return false;
      }

      return true;
    });
  }, [notes, boardSearch, selectedTags, selectedParent]);

  // Dynamic mapping of notes to columns
  const initialColumnMap = useMemo(() => {
    const map: Record<string, NoteCardData[]> = {};
    columns.forEach((col) => {
      map[col.id] = [];
    });

    filteredNotes.forEach((note) => {
      const rawStatus = (note.status || "To Do").toLowerCase().trim();
      const rawNormalized = rawStatus.replace(/\s+/g, "-");

      const matched = columns.find(
        (c) =>
          c.id === rawStatus ||
          c.id === rawNormalized ||
          c.title.toLowerCase() === rawStatus ||
          c.title.toLowerCase().replace(/\s+/g, "-") === rawNormalized
      );

      if (matched && map[matched.id]) {
        map[matched.id].push(note);
      } else if (columns[0] && map[columns[0].id]) {
        map[columns[0].id].push(note);
      }
    });

    return map;
  }, [filteredNotes, columns]);

  // Local column notes state for real-time drag-and-drop feedback
  const [columnNotesMap, setColumnNotesMap] = useState<Record<string, NoteCardData[]>>(initialColumnMap);

  useEffect(() => {
    setColumnNotesMap(initialColumnMap);
  }, [initialColumnMap]);

  // ─── @dnd-kit Board Drag Handlers ───
  const handleBoardDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const cardData = active.data.current;
    if (cardData && cardData.type === "Card") {
      setActiveNote({ note: cardData.note, colId: cardData.colId });
    }
  };

  const handleBoardDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    setColumnNotesMap((prevMap) => {
      // Find source column
      let sourceColId = "";
      let movingNote: NoteCardData | undefined;

      for (const colId of Object.keys(prevMap)) {
        const found = prevMap[colId].find((n) => n.id === activeId);
        if (found) {
          sourceColId = colId;
          movingNote = found;
          break;
        }
      }

      if (!sourceColId || !movingNote) return prevMap;

      // Find target column: either over a Column or over another Card in a Column
      let targetColId = "";
      if (prevMap[overId] !== undefined) {
        targetColId = overId;
      } else {
        for (const colId of Object.keys(prevMap)) {
          if (prevMap[colId].some((n) => n.id === overId)) {
            targetColId = colId;
            break;
          }
        }
      }

      if (!targetColId || sourceColId === targetColId) return prevMap;

      const targetNotes = prevMap[targetColId] || [];
      const overIndex = targetNotes.findIndex((n) => n.id === overId);
      const insertIndex = overIndex >= 0 ? overIndex : targetNotes.length;

      const nextSourceNotes = prevMap[sourceColId].filter((n) => n.id !== activeId);
      const nextTargetNotes = [...targetNotes];
      nextTargetNotes.splice(insertIndex, 0, movingNote);

      return {
        ...prevMap,
        [sourceColId]: nextSourceNotes,
        [targetColId]: nextTargetNotes,
      };
    });
  };

  const handleBoardDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const currentActiveNote = activeNote;
    setActiveNote(null);

    if (!over || !currentActiveNote) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Identify the target column
    let targetCol = columns.find((c) => c.id === overId);
    if (!targetCol) {
      for (const col of columns) {
        const colNotes = columnNotesMap[col.id] || [];
        if (colNotes.some((n) => n.id === overId)) {
          targetCol = col;
          break;
        }
      }
    }

    if (targetCol && onUpdateStatus) {
      onUpdateStatus(activeId, targetCol.title);
    }
  };

  // Direct Column Operations
  const handleAddColumnDirect = () => {
    const newColId = `col-${crypto.randomUUID().slice(0, 6)}`;
    const colorMeta = COLOR_PALETTES[columns.length % COLOR_PALETTES.length];
    const newCol: KanbanColumn = {
      id: newColId,
      title: `Column ${columns.length + 1}`,
      dotColor: colorMeta.dot,
      color: colorMeta.border,
    };
    saveColumns([...columns, newCol]);
  };

  const handleDeleteColumnDirect = (colId: string) => {
    const filtered = columns.filter((c) => c.id !== colId);
    saveColumns(filtered.length > 0 ? filtered : DEFAULT_COLUMNS);
  };

  const handleUpdateColumnTitleDirect = (colId: string, newTitle: string) => {
    const updated = columns.map((c) =>
      c.id === colId ? { ...c, title: newTitle.trim() || "Untitled Column" } : c
    );
    saveColumns(updated);
  };

  // Manage Statuses Modal Operations
  const openManageModal = () => {
    setTempStatuses(JSON.parse(JSON.stringify(columns)));
    setIsManageModalOpen(true);
  };

  const handleSaveManageModal = () => {
    if (tempStatuses.length > 0) {
      saveColumns(tempStatuses);
    }
    setIsManageModalOpen(false);
  };

  const changeModalColor = (index: number, colorId: string) => {
    const found = COLOR_PALETTES.find((cp) => cp.id === colorId);
    if (!found) return;
    const copy = [...tempStatuses];
    copy[index] = { ...copy[index], dotColor: found.dot, color: found.border };
    setTempStatuses(copy);
  };

  const changeModalTitle = (index: number, newTitle: string) => {
    const copy = [...tempStatuses];
    copy[index] = { ...copy[index], title: newTitle };
    setTempStatuses(copy);
  };

  const deleteModalColumn = (index: number) => {
    const copy = [...tempStatuses];
    copy.splice(index, 1);
    setTempStatuses(copy);
  };

  const addModalColumn = () => {
    const colorMeta = COLOR_PALETTES[tempStatuses.length % COLOR_PALETTES.length];
    const newCol: KanbanColumn = {
      id: `col-${crypto.randomUUID().slice(0, 6)}`,
      title: `Status ${tempStatuses.length + 1}`,
      dotColor: colorMeta.dot,
      color: colorMeta.border,
    };
    setTempStatuses([...tempStatuses, newCol]);
  };

  const handleModalDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tempStatuses.findIndex(
        (s, i) => (s.id || `status-${i}`) === active.id
      );
      const newIndex = tempStatuses.findIndex(
        (s, i) => (s.id || `status-${i}`) === over.id
      );
      if (oldIndex !== -1 && newIndex !== -1) {
        setTempStatuses((items) => arrayMove(items, oldIndex, newIndex));
      }
    }
  };

  const applyPresetWorkflow = (presetCols: string[]) => {
    const newCols: KanbanColumn[] = presetCols.map((name, i) => {
      const colorMeta = COLOR_PALETTES[i % COLOR_PALETTES.length];
      return {
        id: `col-${crypto.randomUUID().slice(0, 6)}`,
        title: name,
        dotColor: colorMeta.dot,
        color: colorMeta.border,
      };
    });
    setTempStatuses(newCols);
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const hasActiveFilters = boardSearch || selectedTags.length > 0 || selectedParent !== null;

  return (
    <div className="flex flex-col flex-1 h-full w-full overflow-hidden bg-background">
      {/* ─── Kanban Toolbar (Search, Tags, Parent Filters, Manage Statuses & Add Column) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-b border-border/60 bg-surface/30 shrink-0">
        {/* Left Side: Inline Search & Filter Badges */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative w-64 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-txt-muted pointer-events-none" />
            <Input
              type="text"
              value={boardSearch}
              onChange={(e) => setBoardSearch(e.target.value)}
              placeholder="Search in board..."
              className="pl-8 pr-7 h-8 text-xs bg-background/80 border-border shadow-xs placeholder:text-txt-muted focus-visible:ring-primary"
            />
            {boardSearch && (
              <button
                onClick={() => setBoardSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary p-0.5 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Tags Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 text-xs gap-1.5 border-border bg-background/80 shadow-xs",
                  selectedTags.length > 0 && "border-primary/50 text-primary font-medium"
                )}
              >
                <Tag className="h-3.5 w-3.5" />
                Tags
                {selectedTags.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1 text-[10px] ml-0.5 bg-primary/10 text-primary font-bold"
                  >
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 p-1.5 rounded-xl shadow-xl max-h-64 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-semibold text-txt-muted uppercase">Filter by Tag</div>
              {allUniqueTags.length === 0 ? (
                <div className="p-3 text-xs text-txt-muted text-center">No tags in notes</div>
              ) : (
                allUniqueTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <DropdownMenuItem
                      key={tag}
                      onClick={() => toggleTagFilter(tag)}
                      className={cn(
                        "text-xs cursor-pointer rounded-lg flex items-center justify-between",
                        isSelected && "bg-accent font-medium text-primary"
                      )}
                    >
                      <span className="truncate">#{tag}</span>
                      {isSelected && <Badge variant="secondary" className="h-4 px-1 text-[9px]">Active</Badge>}
                    </DropdownMenuItem>
                  );
                })
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Parent Folder Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 text-xs gap-1.5 border-border bg-background/80 shadow-xs",
                  selectedParent && "border-primary/50 text-primary font-medium"
                )}
              >
                <Folder className="h-3.5 w-3.5" />
                {selectedParent || "Folder"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 p-1.5 rounded-xl shadow-xl max-h-64 overflow-y-auto">
              <DropdownMenuItem
                onClick={() => setSelectedParent(null)}
                className={cn("text-xs cursor-pointer rounded-lg", !selectedParent && "bg-accent font-medium text-primary")}
              >
                All Folders
              </DropdownMenuItem>
              {allUniqueParents.map((parent) => (
                <DropdownMenuItem
                  key={parent}
                  onClick={() => setSelectedParent(parent)}
                  className={cn(
                    "text-xs cursor-pointer rounded-lg",
                    selectedParent === parent && "bg-accent font-medium text-primary"
                  )}
                >
                  <Folder className="h-3.5 w-3.5 mr-2 text-txt-brand" />
                  {parent}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBoardSearch("");
                setSelectedTags([]);
                setSelectedParent(null);
              }}
              className="h-8 text-xs text-txt-muted hover:text-txt-primary gap-1 px-2"
            >
              <X className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>

        {/* Right Side: Total card count & Workflow Management */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-txt-muted mr-1">
            <Layers className="h-3.5 w-3.5" />
            <span>{filteredNotes.length} notes</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openManageModal}
            className="h-8 text-xs gap-1.5 border-border bg-background/80 shadow-xs hover:bg-accent cursor-pointer"
          >
            <Workflow className="h-3.5 w-3.5 text-txt-brand" />
            Manage Statuses
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleAddColumnDirect}
            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Column
          </Button>
        </div>
      </div>

      {/* ─── DndContext Unconstrained Horizontal Kanban Board ─── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleBoardDragStart}
        onDragOver={handleBoardDragOver}
        onDragEnd={handleBoardDragEnd}
      >
        <div className="flex-1 w-full overflow-x-auto overflow-y-hidden select-none p-6 pt-4">
          <div className="inline-flex items-stretch gap-5 min-w-full h-full pb-2">
            {columns.map((col, idx) => {
              const colNotes = columnNotesMap[col.id] || [];

              return (
                <DroppableHomeColumn
                  key={col.id}
                  col={col}
                  index={idx}
                  colNotes={colNotes}
                  onOpenNote={onOpenNote}
                  onDelete={onDelete}
                  onToggleStar={onToggleStar}
                  onMove={onMove}
                  onExport={onExport}
                  onCreateNoteInColumn={onCreateNoteInColumn}
                  onUpdateTitle={handleUpdateColumnTitleDirect}
                  onDeleteColumn={handleDeleteColumnDirect}
                  onOpenManageModal={openManageModal}
                />
              );
            })}

            {/* Add Column Quick Tile at the end of board */}
            <div
              onClick={handleAddColumnDirect}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border/60 rounded-2xl text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/20 w-80 shrink-0 self-stretch min-h-[420px] transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-secondary/80 flex items-center justify-center mb-2">
                <Plus className="h-5 w-5 text-txt-muted" />
              </div>
              <span className="text-xs font-semibold text-txt-primary">Add Column</span>
              <span className="text-[11px] text-txt-muted mt-0.5">Create a new status pipeline stage</span>
            </div>
          </div>
        </div>

        {/* Floating Card Drag Preview */}
        <DragOverlay dropAnimation={null}>
          {activeNote ? (
            <div className="w-72 rotate-2 shadow-2xl opacity-90 pointer-events-none">
              <NoteCard note={activeNote.note} variant="kanban" />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ─── Manage Statuses Modal ─── */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="max-w-md border-border bg-card p-6 shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Workflow className="h-3.5 w-3.5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-txt-primary">
                  Manage Statuses
                </DialogTitle>
                <DialogDescription className="text-xs text-txt-muted">
                  Reorder or customize column workflow.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Presets Bar */}
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-semibold text-txt-muted">
              Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_WORKFLOWS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPresetWorkflow(preset.columns)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-border/80 bg-secondary/40 hover:bg-secondary text-txt-secondary hover:text-txt-primary transition-colors cursor-pointer font-medium"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Status Items List with @dnd-kit sortable */}
          <div className="space-y-2 py-1">
            <span className="text-xs font-semibold text-txt-muted">
              Columns ({tempStatuses.length})
            </span>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragEnd={handleModalDragEnd}
            >
              <SortableContext
                items={tempStatuses.map((s, i) => s.id || `status-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="max-h-[50vh] overflow-y-auto space-y-2 p-1 -m-1">
                  {tempStatuses.map((st, idx) => (
                    <SortableStatusItem
                      key={st.id || `status-${idx}`}
                      status={st}
                      index={idx}
                      onColorChange={changeModalColor}
                      onTitleChange={changeModalTitle}
                      onDelete={deleteModalColumn}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addModalColumn}
              className="w-full h-8 text-xs gap-1.5 border-dashed border-border hover:border-primary/50 cursor-pointer mt-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Column
            </Button>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between gap-2 border-t border-border/60">
            <span className="text-[11px] text-txt-muted">
              Drag handle ⠿ to reorder
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsManageModalOpen(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveManageModal}
                className="h-8 text-xs bg-primary text-primary-foreground font-semibold px-4 shadow-sm cursor-pointer"
              >
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
