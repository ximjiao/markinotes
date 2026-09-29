import { create } from "zustand";
import type {
  WhiteboardBoardData,
  WhiteboardElement,
  WhiteboardConnector,
  WhiteboardPage,
  WhiteboardTool,
  ShapeType,
  CanvasViewport,
} from "../_types/whiteboard.types";
import { createDefaultWhiteboard } from "../_lib/whiteboard-serializer";

interface WhiteboardStoreState {
  board: WhiteboardBoardData;
  activeTool: WhiteboardTool;
  selectedShapeType: ShapeType;
  selectedShapeColor: string;
  selectedStickyColor: string;
  selectedElementIds: string[];
  isPanning: boolean;
  history: WhiteboardBoardData[];
  historyIndex: number;

  // Actions
  setBoard: (board: WhiteboardBoardData) => void;
  setBoardTitle: (title: string) => void;
  setActiveTool: (tool: WhiteboardTool) => void;
  setSelectedShapeType: (shapeType: ShapeType) => void;
  setSelectedShapeColor: (color: string) => void;
  setSelectedStickyColor: (color: string) => void;
  setSelectedElementIds: (ids: string[]) => void;
  setIsPanning: (isPanning: boolean) => void;

  // Page Management
  setActivePage: (pageId: string) => void;
  addPage: (name?: string) => string;
  renamePage: (pageId: string, name: string) => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;

  // Viewport
  updateViewport: (viewport: Partial<CanvasViewport>) => void;
  resetZoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;

  // Element Actions
  addElement: (element: Omit<WhiteboardElement, "id">) => string;
  updateElement: (id: string, updates: Partial<WhiteboardElement>) => void;
  deleteElements: (ids: string[]) => void;

  // Connectors
  addConnector: (connector: Omit<WhiteboardConnector, "id">) => string;
  deleteConnector: (id: string) => void;

  // History (Undo/Redo)
  undo: () => void;
  redo: () => void;
}

export const useWhiteboardStore = create<WhiteboardStoreState>((set, get) => ({
  board: createDefaultWhiteboard(),
  activeTool: "select",
  selectedShapeType: "rectangle",
  selectedShapeColor: "#FFFFFF",
  selectedStickyColor: "#FEF08A",
  selectedElementIds: [],
  isPanning: false,
  history: [createDefaultWhiteboard()],
  historyIndex: 0,

  setBoard: (board) =>
    set({
      board,
      history: [board],
      historyIndex: 0,
      selectedElementIds: [],
    }),

  setBoardTitle: (title) =>
    set((state) => ({
      board: { ...state.board, title, updatedAt: new Date().toISOString() },
    })),

  setActiveTool: (activeTool) => set({ activeTool }),
  setSelectedShapeType: (selectedShapeType) => set({ selectedShapeType }),
  setSelectedShapeColor: (selectedShapeColor) => set({ selectedShapeColor }),
  setSelectedStickyColor: (selectedStickyColor) => set({ selectedStickyColor }),
  setSelectedElementIds: (selectedElementIds) => set({ selectedElementIds }),
  setIsPanning: (isPanning) => set({ isPanning }),

  // Pages
  setActivePage: (pageId) =>
    set((state) => {
      const pageExists = state.board.pages.some((p) => p.id === pageId);
      if (!pageExists) return state;
      return {
        board: { ...state.board, activePageId: pageId },
        selectedElementIds: [],
      };
    }),

  addPage: (name) => {
    const id = `page-${Date.now()}`;
    const pageNumber = get().board.pages.length + 1;
    const newPage: WhiteboardPage = {
      id,
      name: name || `Page ${pageNumber}`,
      elements: [],
      connectors: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    set((state) => ({
      board: {
        ...state.board,
        activePageId: id,
        pages: [...state.board.pages, newPage],
        updatedAt: new Date().toISOString(),
      },
      selectedElementIds: [],
    }));

    return id;
  },

  renamePage: (pageId, name) =>
    set((state) => ({
      board: {
        ...state.board,
        pages: state.board.pages.map((p) => (p.id === pageId ? { ...p, name } : p)),
        updatedAt: new Date().toISOString(),
      },
    })),

  deletePage: (pageId) =>
    set((state) => {
      if (state.board.pages.length <= 1) return state; // Don't delete last page
      const nextPages = state.board.pages.filter((p) => p.id !== pageId);
      const nextActiveId =
        state.board.activePageId === pageId ? nextPages[0].id : state.board.activePageId;

      return {
        board: {
          ...state.board,
          activePageId: nextActiveId,
          pages: nextPages,
          updatedAt: new Date().toISOString(),
        },
        selectedElementIds: [],
      };
    }),

  duplicatePage: (pageId) => {
    const state = get();
    const source = state.board.pages.find((p) => p.id === pageId);
    if (!source) return;

    const newId = `page-${Date.now()}`;
    const duplicatedPage: WhiteboardPage = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      elements: source.elements.map((e) => ({ ...e, id: `el-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` })),
      connectors: [...source.connectors],
    };

    set({
      board: {
        ...state.board,
        activePageId: newId,
        pages: [...state.board.pages, duplicatedPage],
        updatedAt: new Date().toISOString(),
      },
      selectedElementIds: [],
    });
  },

  // Viewport
  updateViewport: (viewportUpdates) =>
    set((state) => ({
      board: {
        ...state.board,
        pages: state.board.pages.map((p) =>
          p.id === state.board.activePageId
            ? { ...p, viewport: { ...p.viewport, ...viewportUpdates } }
            : p
        ),
      },
    })),

  resetZoom: () => get().updateViewport({ zoom: 1, x: 0, y: 0 }),
  zoomIn: () => {
    const activePage = get().board.pages.find((p) => p.id === get().board.activePageId);
    const curZoom = activePage?.viewport.zoom ?? 1;
    const curX = activePage?.viewport.x ?? 0;
    const curY = activePage?.viewport.y ?? 0;
    const nextZoom = Math.min(3.0, +(curZoom + 0.15).toFixed(2));
    
    const focalX = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
    const focalY = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
    
    const worldX = (focalX - curX) / curZoom;
    const worldY = (focalY - curY) / curZoom;
    
    const nextX = Math.round(focalX - worldX * nextZoom);
    const nextY = Math.round(focalY - worldY * nextZoom);
    
    get().updateViewport({ zoom: nextZoom, x: nextX, y: nextY });
  },
  zoomOut: () => {
    const activePage = get().board.pages.find((p) => p.id === get().board.activePageId);
    const curZoom = activePage?.viewport.zoom ?? 1;
    const curX = activePage?.viewport.x ?? 0;
    const curY = activePage?.viewport.y ?? 0;
    const nextZoom = Math.max(0.2, +(curZoom - 0.15).toFixed(2));
    
    const focalX = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
    const focalY = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
    
    const worldX = (focalX - curX) / curZoom;
    const worldY = (focalY - curY) / curZoom;
    
    const nextX = Math.round(focalX - worldX * nextZoom);
    const nextY = Math.round(focalY - worldY * nextZoom);
    
    get().updateViewport({ zoom: nextZoom, x: nextX, y: nextY });
  },

  // Elements
  addElement: (elementData) => {
    const id = `el-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newElement: WhiteboardElement = { ...elementData, id };

    set((state) => {
      const nextPages = state.board.pages.map((page) => {
        if (page.id !== state.board.activePageId) return page;
        return {
          ...page,
          elements: [...page.elements, newElement],
        };
      });

      const updatedBoard = {
        ...state.board,
        pages: nextPages,
        updatedAt: new Date().toISOString(),
      };

      return {
        board: updatedBoard,
        selectedElementIds: [id],
      };
    });

    return id;
  },

  updateElement: (id, updates) =>
    set((state) => ({
      board: {
        ...state.board,
        pages: state.board.pages.map((page) => {
          if (page.id !== state.board.activePageId) return page;
          return {
            ...page,
            elements: page.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
          };
        }),
        updatedAt: new Date().toISOString(),
      },
    })),

  deleteElements: (ids) =>
    set((state) => ({
      board: {
        ...state.board,
        pages: state.board.pages.map((page) => {
          if (page.id !== state.board.activePageId) return page;
          return {
            ...page,
            elements: page.elements.filter((el) => !ids.includes(el.id)),
            connectors: page.connectors.filter(
              (c) => !ids.includes(c.sourceId) && !ids.includes(c.targetId)
            ),
          };
        }),
        updatedAt: new Date().toISOString(),
      },
      selectedElementIds: [],
    })),

  // Connectors
  addConnector: (connectorData) => {
    const id = `conn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newConnector: WhiteboardConnector = { ...connectorData, id };

    set((state) => ({
      board: {
        ...state.board,
        pages: state.board.pages.map((page) => {
          if (page.id !== state.board.activePageId) return page;
          return {
            ...page,
            connectors: [...page.connectors, newConnector],
          };
        }),
        updatedAt: new Date().toISOString(),
      },
    }));

    return id;
  },

  deleteConnector: (id) =>
    set((state) => ({
      board: {
        ...state.board,
        pages: state.board.pages.map((page) => {
          if (page.id !== state.board.activePageId) return page;
          return {
            ...page,
            connectors: page.connectors.filter((c) => c.id !== id),
          };
        }),
        updatedAt: new Date().toISOString(),
      },
    })),

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      set({
        board: history[nextIndex],
        historyIndex: nextIndex,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      set({
        board: history[nextIndex],
        historyIndex: nextIndex,
      });
    }
  },
}));
