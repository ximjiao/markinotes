export type WhiteboardTool =
  | "select"
  | "hand"
  | "pen"
  | "sticky"
  | "shape"
  | "connector"
  | "text"
  | "section"
  | "table"
  | "stamp";

export type ShapeType =
  // Basic
  | "rectangle"
  | "circle"
  | "diamond"
  | "triangle"
  | "triangle-down"
  | "pill"
  | "pentagon"
  | "octagon"
  | "cross"
  | "arrow-left"
  | "arrow-right"
  | "chevron"
  | "star"
  | "speech"
  // Flowchart
  | "parallelogram"
  | "cylinder"
  | "document"
  | "folder"
  | "trapezoid"
  | "predefined-process"
  | "summing-junction"
  | "or-junction"
  | "hexagon"
  // Advanced / System
  | "cloud"
  | "server"
  | "database"
  | "screen"
  | "cpu"
  | "cube"
  | "shield"
  | "key"
  | "mail"
  | "code"
  | "terminal"
  | "mobile"
  | "globe"
  | "user"
  | "gear"
  | "lightning";

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface WhiteboardElement {
  id: string;
  type: "sticky" | "shape" | "text" | "section" | "draw";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  title?: string;
  color?: string; // hex color or preset name
  shapeType?: ShapeType;
  points?: CanvasPosition[]; // for freehand pen draw
  strokeWidth?: number;
  fontSize?: "small" | "medium" | "large" | "huge";
  isBold?: boolean;
  isStrike?: boolean;
  rotation?: number;
}

export interface WhiteboardConnector {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: "top" | "right" | "bottom" | "left";
  targetHandle?: "top" | "right" | "bottom" | "left";
  label?: string;
  style?: "straight" | "curved" | "orthogonal";
  color?: string;
}

export interface WhiteboardPage {
  id: string;
  name: string;
  elements: WhiteboardElement[];
  connectors: WhiteboardConnector[];
  viewport: CanvasViewport;
}

export interface WhiteboardBoardData {
  id: string;
  title: string;
  noteId?: string;
  activePageId: string;
  pages: WhiteboardPage[];
  updatedAt: string;
}
