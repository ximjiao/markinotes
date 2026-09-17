"use client";

import React, { useState, useMemo, useEffect } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  Columns3,
  Plus,
  Trash2,
  MoreHorizontal,
  GripVertical,
  X,
  Check,
  Edit2,
  Workflow,
  Sparkles,
  Calendar,
  Flag,
  CheckSquare,
} from "lucide-react";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { KanbanTaskDrawer } from "./kanban-task-drawer";
import { NotePreviewRenderer } from "@/features/home/_components/note-preview-renderer";
import type { KanbanBlockColumn, KanbanBlockCard } from "./custom-kanban-extension";
import { cn } from "@/lib/utils";

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
    name: "Content / Editorial",
    columns: ["Idea", "Drafting", "In Review", "Published"],
  },
  {
    name: "Bug Tracking",
    columns: ["Reported", "Investigating", "Fixing", "QA Verified", "Closed"],
  },
];

const COLOR_PALETTES = [
  { id: "slate", name: "Slate", dot: "bg-slate-400 dark:bg-slate-500", border: "border-slate-500/25 bg-slate-500/5" },
  { id: "blue", name: "Blue", dot: "bg-sky-500 dark:bg-sky-400", border: "border-sky-500/25 bg-sky-500/5" },
  { id: "amber", name: "Amber", dot: "bg-amber-500 dark:bg-amber-400", border: "border-amber-500/25 bg-amber-500/5" },
  { id: "purple", name: "Purple", dot: "bg-purple-500 dark:bg-purple-400", border: "border-purple-500/25 bg-purple-500/5" },
  { id: "emerald", name: "Green", dot: "bg-emerald-500 dark:bg-emerald-400", border: "border-emerald-500/25 bg-emerald-500/5" },
  { id: "rose", name: "Rose", dot: "bg-rose-500 dark:bg-rose-400", border: "border-rose-500/25 bg-rose-500/5" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-500 bg-red-500/10 border-red-500/30",
  high: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  medium: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
  low: "text-blue-500 bg-blue-500/10 border-blue-500/30",
};

function getColorMeta(col: { color?: string }, index: number) {
  if (col.color) {
    const found = COLOR_PALETTES.find((cp) => cp.id === col.color);
    if (found) return found;
  }
  return COLOR_PALETTES[index % COLOR_PALETTES.length];
}

// ─── Sortable Card Component for Board ───
interface SortableCardProps {
  card: KanbanBlockCard;
  colId: string;
  onClickCard: (card: KanbanBlockCard, colId: string) => void;
  onDeleteCard: (colId: string, cardId: string) => void;
}

function SortableCardItem({ card, colId, onClickCard, onDeleteCard }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "Card",
      card,
      colId,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const priorityMeta = card.priority ? PRIORITY_COLORS[card.priority] : null;

  // Extract checklist task stats if present in description
  const checklistStats = useMemo(() => {
    if (!card.description) return null;
    const taskMatches = card.description.match(/^[-*]\s+\[([ xX])\]/gm);
    if (!taskMatches || taskMatches.length === 0) return null;
    const total = taskMatches.length;
    const checked = card.description.match(/^[-*]\s+\[[xX]\]/gm)?.length || 0;
    return { total, checked };
  }, [card.description]);

  // Clean description text snippet (stripping markdown markers)
  const cleanDescriptionText = useMemo(() => {
    if (!card.description) return "";
    return card.description
      .replace(/^#+\s+/gm, "")
      .replace(/^[-*]\s+\[([ xX])\]\s+/gm, "")
      .replace(/^[-*+]\s+/gm, "")
      .replace(/[*_`~]/g, "")
      .trim();
  }, [card.description]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClickCard(card, colId)}
      className={cn(
        "group/card flex flex-col justify-between gap-1.5 p-3 rounded-xl border border-border/60 bg-card/95 shadow-2xs hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer active:cursor-grabbing touch-none select-none",
        isDragging && "opacity-30 border-dashed border-primary"
      )}
    >
      {/* Top Card Line: Priority & Delete Action */}
      <div className="flex items-start justify-between gap-1.5">
        <span className="text-xs font-semibold text-txt-primary leading-snug break-words">
          {card.title}
        </span>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteCard(colId, card.id);
          }}
          className="text-txt-muted hover:text-destructive opacity-0 group-hover/card:opacity-100 transition-opacity p-0.5 shrink-0 cursor-pointer"
          title="Delete task"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Description Snippet Preview (Rich formatting like home note cards) */}
      {card.description && card.description.trim() && (
        <div className="relative overflow-hidden w-full max-h-[50px] my-0.5">
          <NotePreviewRenderer content={card.description} title={card.title} />
          {/* Bottom Fade Gradient Mask */}
          <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-card via-card/85 to-transparent pointer-events-none" />
        </div>
      )}

      {/* Card Metadata Footer: Priority, Due Date, Checklists, Tags */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {priorityMeta && (
          <Badge
            variant="outline"
            className={cn("text-[9px] px-1.5 py-0 capitalize gap-1 font-medium", priorityMeta)}
          >
            <Flag className="h-2.5 w-2.5" />
            {card.priority}
          </Badge>
        )}

        {card.dueDate && (
          <Badge
            variant="secondary"
            className="text-[9px] px-1.5 py-0 gap-1 text-txt-muted font-normal bg-secondary/80"
          >
            <Calendar className="h-2.5 w-2.5" />
            {card.dueDate}
          </Badge>
        )}

        {checklistStats && (
          <Badge
            variant="secondary"
            className={cn(
              "text-[9px] px-1.5 py-0 gap-1 font-medium",
              checklistStats.checked === checklistStats.total
                ? "text-emerald-500 bg-emerald-500/10 border border-emerald-500/20"
                : "text-txt-muted bg-secondary/80"
            )}
          >
            <CheckSquare className="h-2.5 w-2.5" />
            {checklistStats.checked}/{checklistStats.total}
          </Badge>
        )}

        {card.tags &&
          card.tags.map((t) => (
            <Badge
              key={t}
              variant="secondary"
              className="text-[9px] px-1.5 py-0 bg-secondary text-txt-secondary font-normal"
            >
              #{t}
            </Badge>
          ))}
      </div>
    </div>
  );
}

// ─── Droppable Column Container Component ───
interface DroppableColumnProps {
  col: KanbanBlockColumn;
  index: number;
  onUpdateTitle: (colId: string, newTitle: string) => void;
  onDeleteColumn: (colId: string) => void;
  onOpenCreateDrawer: (colId: string) => void;
  onClickCard: (card: KanbanBlockCard, colId: string) => void;
  onDeleteCard: (colId: string, cardId: string) => void;
}

function DroppableBoardColumn({
  col,
  index,
  onUpdateTitle,
  onDeleteColumn,
  onOpenCreateDrawer,
  onClickCard,
  onDeleteCard,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.id,
    data: {
      type: "Column",
      colId: col.id,
    },
  });

  const colorMeta = getColorMeta(col, index);
  const cardIds = useMemo(() => col.cards.map((c) => c.id), [col.cards]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-72 shrink-0 rounded-2xl border bg-secondary/30 transition-all duration-150 p-3 min-h-[180px]",
        colorMeta.border,
        isOver && "ring-2 ring-primary/40 border-primary bg-primary/10 shadow-sm"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
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
          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 shrink-0 text-txt-muted font-bold">
            {col.cards.length}
          </Badge>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenCreateDrawer(col.id)}
            className="h-6 w-6 text-txt-muted hover:text-txt-primary rounded-md cursor-pointer"
            title="Add task to column"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDeleteColumn(col.id)}
            className="h-6 w-6 text-txt-muted hover:text-destructive rounded-md cursor-pointer"
            title="Delete column"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Cards List with SortableContext */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2.5 flex-1 max-h-80 overflow-y-auto pr-0.5">
          {col.cards.map((card) => (
            <SortableCardItem
              key={card.id}
              card={card}
              colId={col.id}
              onClickCard={onClickCard}
              onDeleteCard={onDeleteCard}
            />
          ))}

          {/* Quick Add Button at bottom of column */}
          <button
            type="button"
            onClick={() => onOpenCreateDrawer(col.id)}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-border/60 hover:border-primary/40 hover:bg-background/50 text-txt-muted hover:text-txt-primary text-xs font-medium transition-colors justify-center cursor-pointer mt-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add card
          </button>
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Sortable Status Item in Manage Modal ───
interface SortableStatusItemProps {
  status: KanbanBlockColumn;
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

      {/* Card Count */}
      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0 text-txt-muted">
        {status.cards.length} cards
      </Badge>

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

// ─── Main Kanban Block Node View ───
export function KanbanBlockNodeView(props: NodeViewProps) {
  const { node, updateAttributes, deleteNode } = props;

  const rawData = node.attrs.data;
  const boardTitle = node.attrs.title || "Kanban Board";

  const initialColumns: KanbanBlockColumn[] = useMemo(() => {
    try {
      if (typeof rawData === "string") {
        return JSON.parse(rawData);
      }
      return Array.isArray(rawData) ? rawData : [];
    } catch {
      return [];
    }
  }, [rawData]);

  // Local state to maintain smooth real-time drag without parent rerender lag
  const [localColumns, setLocalColumns] = useState<KanbanBlockColumn[]>(initialColumns);

  useEffect(() => {
    setLocalColumns(initialColumns);
  }, [initialColumns]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(boardTitle);

  // Active Dragged Card in Board
  const [activeCard, setActiveCard] = useState<{ card: KanbanBlockCard; colId: string } | null>(null);

  // Task Drawer State (ClickUp/Linear-style Slide-over)
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    colId: string;
    card: KanbanBlockCard | null;
  }>({
    isOpen: false,
    colId: localColumns[0]?.id || "todo",
    card: null,
  });

  // Manage Statuses Modal state
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [tempStatuses, setTempStatuses] = useState<KanbanBlockColumn[]>([]);

  // DND Sensors for board and modal with 4px activation constraint
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

  // Sync columns update back to TipTap Node Attributes
  const syncUpdate = (updatedColumns: KanbanBlockColumn[], updatedTitle?: string) => {
    setLocalColumns(updatedColumns);
    updateAttributes({
      data: JSON.stringify(updatedColumns),
      title: updatedTitle !== undefined ? updatedTitle : boardTitle,
    });
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    const finalTitle = titleValue.trim() || "Kanban Board";
    setTitleValue(finalTitle);
    syncUpdate(localColumns, finalTitle);
  };

  // Open Task Drawer for New Task
  const handleOpenCreateDrawer = (colId: string) => {
    setDrawerState({
      isOpen: true,
      colId,
      card: null,
    });
  };

  // Open Task Drawer for Editing Existing Task
  const handleOpenEditDrawer = (card: KanbanBlockCard, colId: string) => {
    setDrawerState({
      isOpen: true,
      colId,
      card,
    });
  };

  // Save Task from Drawer
  const handleSaveDrawerTask = (targetColId: string, cardData: KanbanBlockCard) => {
    const isEditing = !!drawerState.card;
    const oldColId = drawerState.colId;

    let updated: KanbanBlockColumn[] = [];

    if (!isEditing) {
      // Add new card to target column
      updated = localColumns.map((col) =>
        col.id === targetColId ? { ...col, cards: [...col.cards, cardData] } : col
      );
    } else {
      // Update existing card and handle column change if any
      const cleaned = localColumns.map((col) =>
        col.id === oldColId
          ? { ...col, cards: col.cards.filter((c) => c.id !== cardData.id) }
          : col
      );

      updated = cleaned.map((col) =>
        col.id === targetColId ? { ...col, cards: [...col.cards, cardData] } : col
      );
    }

    syncUpdate(updated);
  };

  const handleDeleteDrawerTask = (colId: string, cardId: string) => {
    const updated = localColumns.map((col) =>
      col.id === colId
        ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
        : col
    );
    syncUpdate(updated);
  };

  // Manage Statuses Handlers
  const openManageModal = () => {
    setTempStatuses(JSON.parse(JSON.stringify(localColumns)));
    setIsManageModalOpen(true);
  };

  const handleSaveManageModal = () => {
    syncUpdate(tempStatuses);
    setIsManageModalOpen(false);
  };

  const changeModalColor = (index: number, colorId: string) => {
    const copy = [...tempStatuses];
    copy[index] = { ...copy[index], color: colorId };
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
    const newCol: KanbanBlockColumn = {
      id: `col-${crypto.randomUUID().slice(0, 6)}`,
      title: `Status ${tempStatuses.length + 1}`,
      cards: [],
      color: COLOR_PALETTES[tempStatuses.length % COLOR_PALETTES.length].id,
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
    const currentCardsMap: Record<string, KanbanBlockCard[]> = {};
    localColumns.forEach((c) => {
      currentCardsMap[c.title.toLowerCase()] = c.cards;
    });

    const newCols: KanbanBlockColumn[] = presetCols.map((name, i) => ({
      id: `col-${crypto.randomUUID().slice(0, 6)}`,
      title: name,
      color: COLOR_PALETTES[i % COLOR_PALETTES.length].id,
      cards: currentCardsMap[name.toLowerCase()] || [],
    }));

    setTempStatuses(newCols);
  };

  // Direct Column Actions
  const handleAddColumnDirect = () => {
    const newColId = `col-${crypto.randomUUID().slice(0, 6)}`;
    const newCol: KanbanBlockColumn = {
      id: newColId,
      title: `Column ${localColumns.length + 1}`,
      cards: [],
      color: COLOR_PALETTES[localColumns.length % COLOR_PALETTES.length].id,
    };
    syncUpdate([...localColumns, newCol]);
  };

  const handleDeleteColumnDirect = (colId: string) => {
    const filtered = localColumns.filter((c) => c.id !== colId);
    syncUpdate(filtered);
  };

  const handleUpdateColumnTitleDirect = (colId: string, newTitle: string) => {
    const updated = localColumns.map((c) =>
      c.id === colId ? { ...c, title: newTitle.trim() || "Untitled Column" } : c
    );
    syncUpdate(updated);
  };

  // Board Card DND Handlers via @dnd-kit
  const handleBoardDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const cardData = active.data.current;
    if (cardData && cardData.type === "Card") {
      setActiveCard({ card: cardData.card, colId: cardData.colId });
    }
  };

  const handleBoardDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    setLocalColumns((prevCols) => {
      const sourceCol = prevCols.find((c) => c.cards.some((card) => card.id === activeId));
      const targetCol = prevCols.find(
        (c) => c.id === overId || c.cards.some((card) => card.id === overId)
      );

      if (!sourceCol || !targetCol || sourceCol.id === targetCol.id) {
        return prevCols;
      }

      const cardToMove = sourceCol.cards.find((c) => c.id === activeId);
      if (!cardToMove) return prevCols;

      const overIsCard = targetCol.cards.some((c) => c.id === overId);
      const overIndex = overIsCard
        ? targetCol.cards.findIndex((c) => c.id === overId)
        : targetCol.cards.length;

      return prevCols.map((col) => {
        if (col.id === sourceCol.id) {
          return { ...col, cards: col.cards.filter((c) => c.id !== activeId) };
        }
        if (col.id === targetCol.id) {
          const nextCards = [...col.cards];
          nextCards.splice(overIndex, 0, cardToMove);
          return { ...col, cards: nextCards };
        }
        return col;
      });
    });
  };

  const handleBoardDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) {
      syncUpdate(localColumns);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    setLocalColumns((prevCols) => {
      const sourceCol = prevCols.find((c) => c.cards.some((card) => card.id === activeId));
      const targetCol = prevCols.find(
        (c) => c.id === overId || c.cards.some((card) => card.id === overId)
      );

      let finalCols = prevCols;

      if (sourceCol && targetCol && sourceCol.id === targetCol.id) {
        const oldIndex = sourceCol.cards.findIndex((c) => c.id === activeId);
        const newIndex = sourceCol.cards.findIndex((c) => c.id === overId);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const nextCards = arrayMove(sourceCol.cards, oldIndex, newIndex);
          finalCols = prevCols.map((c) => (c.id === sourceCol.id ? { ...c, cards: nextCards } : c));
        }
      }

      syncUpdate(finalCols);
      return finalCols;
    });
  };

  return (
    <NodeViewWrapper className="my-6 not-prose select-none rounded-2xl border border-border/80 bg-surface/40 backdrop-blur-xs p-4 shadow-sm transition-all duration-200">
      {/* ─── Board Header ─── */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Columns3 className="h-4 w-4" />
          </div>

          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <Input
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTitleSubmit()}
                onBlur={handleTitleSubmit}
                autoFocus
                className="h-7 text-xs font-semibold px-2 py-0.5 w-48 bg-background border-border"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleTitleSubmit}
                className="h-6 w-6 text-txt-muted hover:text-txt-primary"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-1.5 cursor-pointer group/title px-1.5 py-0.5 rounded hover:bg-accent/50"
            >
              <h4 className="text-sm font-bold text-txt-primary">{boardTitle}</h4>
              <Edit2 className="h-3 w-3 text-txt-muted opacity-0 group-hover/title:opacity-100 transition-opacity" />
            </div>
          )}

          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 text-txt-muted">
            {localColumns.length} columns
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddColumnDirect}
            className="h-7 text-xs gap-1 border-border bg-background/80 shadow-xs hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Column
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-txt-muted hover:text-txt-primary rounded-lg"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-border bg-popover shadow-xl rounded-xl">
              <DropdownMenuItem
                onClick={() => setIsEditingTitle(true)}
                className="cursor-pointer gap-2 px-3 py-2 text-xs"
              >
                <Edit2 className="h-3.5 w-3.5 text-txt-secondary" /> Rename Board
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleAddColumnDirect}
                className="cursor-pointer gap-2 px-3 py-2 text-xs"
              >
                <Plus className="h-3.5 w-3.5 text-txt-secondary" /> Add Column
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={openManageModal}
                className="cursor-pointer gap-2 px-3 py-2 text-xs"
              >
                <Workflow className="h-3.5 w-3.5 text-txt-secondary" /> Manage Statuses & Order...
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={deleteNode}
                className="cursor-pointer gap-2 px-3 py-2 text-xs text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Board Block
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ─── Columns Horizontal Container ─── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleBoardDragStart}
        onDragOver={handleBoardDragOver}
        onDragEnd={handleBoardDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-2 pt-1 scroll-smooth">
          {localColumns.map((col, idx) => (
            <DroppableBoardColumn
              key={col.id}
              col={col}
              index={idx}
              onUpdateTitle={handleUpdateColumnTitleDirect}
              onDeleteColumn={handleDeleteColumnDirect}
              onOpenCreateDrawer={handleOpenCreateDrawer}
              onClickCard={handleOpenEditDrawer}
              onDeleteCard={handleDeleteDrawerTask}
            />
          ))}

          {/* Empty State / Add Column Quick Tile */}
          {localColumns.length === 0 && (
            <div
              onClick={handleAddColumnDirect}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border/60 rounded-xl text-center cursor-pointer hover:border-primary/40 w-64 shrink-0 transition-colors"
            >
              <Plus className="h-5 w-5 text-txt-muted mb-1" />
              <span className="text-xs font-medium text-txt-muted">Add First Column</span>
            </div>
          )}
        </div>

        {/* Drag Overlay for Smooth Card Floating */}
        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div className="flex flex-col justify-between gap-1.5 p-3 rounded-xl border border-primary/70 bg-card shadow-2xl rotate-2 w-64 pointer-events-none opacity-95">
              <span className="text-xs font-semibold text-txt-primary">
                {activeCard.card.title}
              </span>
              {activeCard.card.description && (
                <div className="overflow-hidden w-full max-h-[40px]">
                  <NotePreviewRenderer content={activeCard.card.description} title={activeCard.card.title} />
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ─── Slide-over Task Detail Drawer (ClickUp / Linear Style) ─── */}
      <KanbanTaskDrawer
        isOpen={drawerState.isOpen}
        onClose={() => setDrawerState({ isOpen: false, colId: localColumns[0]?.id || "todo", card: null })}
        boardTitle={boardTitle}
        columns={localColumns}
        currentColId={drawerState.colId}
        card={drawerState.card}
        onSave={handleSaveDrawerTask}
        onDelete={handleDeleteDrawerTask}
      />

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
    </NodeViewWrapper>
  );
}
