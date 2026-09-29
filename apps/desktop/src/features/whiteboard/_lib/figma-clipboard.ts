import type { WhiteboardElement, WhiteboardConnector } from "../_types/whiteboard.types";

/**
 * Converts elements (Sticky notes, Sections, Shapes) into semantic Flexbox HTML
 * that Figma natively converts into Auto Layout Frames upon pasting.
 */
export function generateFigmaHtml(elements: WhiteboardElement[]): string {
  const itemsHtml = elements
    .filter((el) => el.type !== "draw")
    .map((el) => {
      const bgColor = el.color || "#FEF08A";
      const borderRadius = el.shapeType === "circle" ? "50%" : el.type === "sticky" ? "8px" : "12px";

      return `
    <div style="
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      background-color: ${bgColor};
      border-radius: ${borderRadius};
      border: 1px solid rgba(0,0,0,0.08);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      width: ${el.width}px;
      min-height: ${el.height}px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
    ">
      ${
        el.title
          ? `<div style="font-size: 15px; font-weight: 700; color: #0F172A; line-height: 1.3;">
              ${escapeHtml(el.title)}
            </div>`
          : ""
      }
      <div style="font-size: 13px; font-weight: 400; color: #334155; line-height: 1.5; white-space: pre-wrap;">
        ${escapeHtml(el.content || "")}
      </div>
    </div>`;
    })
    .join("\n");

  return `
  <div style="
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    padding: 32px;
    background-color: #F8FAFC;
    box-sizing: border-box;
  ">
    ${itemsHtml}
  </div>`;
}

/**
 * Generates an SVG string representation of elements and connectors for Figma vector import.
 */
export function generateFigmaSvg(
  elements: WhiteboardElement[],
  connectors: WhiteboardConnector[]
): string {
  if (elements.length === 0) return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>`;

  // Compute bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach((el) => {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  });

  const padding = 40;
  const width = Math.max(200, maxX - minX + padding * 2);
  const height = Math.max(200, maxY - minY + padding * 2);
  const offsetX = minX - padding;
  const offsetY = minY - padding;

  let svgElements = "";

  // 1. Render Connectors (lines & arrows)
  connectors.forEach((conn) => {
    const src = elements.find((e) => e.id === conn.sourceId);
    const tgt = elements.find((e) => e.id === conn.targetId);
    if (!src || !tgt) return;

    const x1 = src.x + src.width / 2 - offsetX;
    const y1 = src.y + src.height / 2 - offsetY;
    const x2 = tgt.x + tgt.width / 2 - offsetX;
    const y2 = tgt.y + tgt.height / 2 - offsetY;
    const strokeColor = conn.color || "#64748B";

    svgElements += `
      <g class="connector">
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4 2" />
        <circle cx="${x2}" cy="${y2}" r="4" fill="${strokeColor}" />
      </g>`;
  });

  // 2. Render Elements
  elements.forEach((el) => {
    const rx = el.x - offsetX;
    const ry = el.y - offsetY;
    const fill = el.color || "#FEF08A";

    if (el.type === "draw" && el.points && el.points.length > 1) {
      const pathD = el.points.reduce((acc, pt, idx) => {
        const px = pt.x - offsetX;
        const py = pt.y - offsetY;
        return idx === 0 ? `M ${px} ${py}` : `${acc} L ${px} ${py}`;
      }, "");
      svgElements += `<path d="${pathD}" stroke="${fill}" stroke-width="${el.strokeWidth || 3}" fill="none" stroke-linecap="round" />`;
    } else {
      const radius = el.shapeType === "circle" ? "50%" : "8";
      svgElements += `
        <g class="element" transform="translate(${rx}, ${ry})">
          <rect width="${el.width}" height="${el.height}" rx="${radius}" fill="${fill}" stroke="#CBD5E1" stroke-width="1.5" />
          ${
            el.title
              ? `<text x="12" y="24" font-family="Inter, sans-serif" font-size="14" font-weight="bold" fill="#0F172A">${escapeXml(el.title)}</text>`
              : ""
          }
          <text x="12" y="${el.title ? 44 : 24}" font-family="Inter, sans-serif" font-size="12" fill="#334155">${escapeXml(el.content || "")}</text>
        </g>`;
    }
  });

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>
    text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
  ${svgElements}
</svg>`.trim();
}

/**
 * Copies elements to system clipboard in both HTML (Auto Layout Frame for Figma)
 * and SVG (Vector graphics for Figma) formats simultaneously.
 */
export async function copyElementsToFigmaClipboard(
  elements: WhiteboardElement[],
  connectors: WhiteboardConnector[] = []
): Promise<boolean> {
  try {
    const htmlData = generateFigmaHtml(elements);
    const svgData = generateFigmaSvg(elements, connectors);
    const textData = elements.map((e) => `${e.title || "Item"}: ${e.content}`).join("\n");

    const blobHtml = new Blob([htmlData], { type: "text/html" });
    const blobSvg = new Blob([svgData], { type: "image/svg+xml" });
    const blobText = new Blob([textData], { type: "text/plain" });

    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": blobHtml,
        "image/svg+xml": blobSvg,
        "text/plain": blobText,
      }),
    ]);

    return true;
  } catch (error) {
    console.error("[figma-clipboard] Failed to copy to clipboard:", error);
    return false;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeXml(str: string): string {
  return escapeHtml(str);
}
