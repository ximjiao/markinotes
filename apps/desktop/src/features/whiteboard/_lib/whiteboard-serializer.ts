import type { WhiteboardBoardData, WhiteboardPage } from "../_types/whiteboard.types";

export const DEFAULT_PAGE_ID = "page-general";

export function createDefaultWhiteboard(title = "UX Board"): WhiteboardBoardData {
  const initialPage: WhiteboardPage = {
    id: DEFAULT_PAGE_ID,
    name: "General",
    viewport: { x: 0, y: 0, zoom: 1 },
    elements: [
      {
        id: "sticky-1",
        type: "sticky",
        x: 100,
        y: 100,
        width: 180,
        height: 180,
        title: "User Flow Note",
        content: "User enters application and views dashboard overview.",
        color: "#FEF08A", // yellow
      },
      {
        id: "shape-1",
        type: "shape",
        shapeType: "rectangle",
        x: 360,
        y: 130,
        width: 200,
        height: 120,
        title: "Dashboard",
        content: "Main dashboard workspace",
        color: "#BAE6FD", // light blue
      },
    ],
    connectors: [
      {
        id: "conn-1",
        sourceId: "sticky-1",
        targetId: "shape-1",
        label: "navigates to",
        style: "curved",
        color: "#94A3B8",
      },
    ],
  };

  return {
    id: `board-${Date.now()}`,
    title,
    activePageId: initialPage.id,
    pages: [initialPage],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Serializes WhiteboardBoardData into a human-readable Markdown format
 * with an embedded JSON comment payload for full state preservation.
 */
export function serializeWhiteboardToMarkdown(board: WhiteboardBoardData): string {
  const activePage =
    board.pages.find((p) => p.id === board.activePageId) || board.pages[0];

  let md = `# Board: ${board.title || "Whiteboard"}\n\n`;

  // Summary per page
  board.pages.forEach((page) => {
    md += `### 📄 Page: ${page.name}${page.id === board.activePageId ? " (Active)" : ""}\n\n`;

    // Notes and Elements
    const stickyOrShapes = page.elements.filter((e) => e.type !== "draw");
    if (stickyOrShapes.length > 0) {
      md += `#### 📌 Elements\n`;
      stickyOrShapes.forEach((el) => {
        const typeLabel = el.type === "sticky" ? "Sticky Note" : el.shapeType || el.type;
        const heading = el.title ? `**${el.title}**` : `_${typeLabel}_`;
        const body = el.content ? `: ${el.content.replace(/\n/g, " ")}` : "";
        md += `- [${typeLabel}] ${heading}${body}\n`;
      });
      md += `\n`;
    }

    // Connectors
    if (page.connectors && page.connectors.length > 0) {
      md += `#### 🔗 Connectors\n`;
      page.connectors.forEach((conn) => {
        const src = page.elements.find((e) => e.id === conn.sourceId);
        const tgt = page.elements.find((e) => e.id === conn.targetId);
        const srcName = src?.title || src?.content.slice(0, 20) || conn.sourceId;
        const tgtName = tgt?.title || tgt?.content.slice(0, 20) || conn.targetId;
        const label = conn.label ? ` --[${conn.label}]--> ` : ` ➔ `;
        md += `- ${srcName}${label}${tgtName}\n`;
      });
      md += `\n`;
    }
  });

  // Hidden full state metadata
  const payload = JSON.stringify(board);
  md += `<!-- flow-board-meta: ${payload} -->\n`;

  return md;
}

/**
 * Parses raw Markdown / attribute data into structured WhiteboardBoardData.
 */
export function parseWhiteboardFromMarkdown(rawContent: string): WhiteboardBoardData {
  if (!rawContent) return createDefaultWhiteboard();

  // 1. Try to parse directly if JSON string
  if (rawContent.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(rawContent);
      if (parsed && Array.isArray(parsed.pages)) {
        return parsed as WhiteboardBoardData;
      }
    } catch {
      // ignore
    }
  }

  // 2. Extract from <!-- flow-board-meta: ... --> comment
  const metaMatch = rawContent.match(/<!-- flow-board-meta:\s*([\s\S]*?)\s*-->/);
  if (metaMatch && metaMatch[1]) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      if (parsed && Array.isArray(parsed.pages)) {
        return parsed as WhiteboardBoardData;
      }
    } catch (err) {
      console.error("[whiteboard-serializer] Failed to parse JSON metadata:", err);
    }
  }

  return createDefaultWhiteboard();
}
