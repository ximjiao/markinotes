"use client";

import React from "react";
import { Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotePreviewRendererProps } from "../_types/home.types";
import {
  MiniFormattedInline,
  parseTableRow,
  isTableSeparatorRow,
  extractImageInfo,
  resolveImageSrc,
} from "../_lib/note-preview-parser";

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseKanbanBlockData(fullBlock: string): {
  title: string;
  columns: { id: string; title: string; cards?: { id: string; title: string; tags?: string[] }[] }[];
} {
  const titleMatch = fullBlock.match(/data-title=(?:\\?["'])(.*?)(?:\\?["'])/);
  const title = titleMatch ? titleMatch[1] : "Kanban Board";

  // Data extraction - match everything starting with data-kanban-data=" until the matching quote or end of string
  let rawJson = "";
  const matchWithEndQuote = fullBlock.match(/data-kanban-data=(?:\\?["'])([\s\S]*?)(?:\\?["'])(?:\s|>|\/|$)/);
  if (matchWithEndQuote && matchWithEndQuote[1].trim()) {
    rawJson = matchWithEndQuote[1];
  } else {
    const matchOpen = fullBlock.match(/data-kanban-data=(?:\\?["'])([\s\S]*)/);
    if (matchOpen) {
      rawJson = matchOpen[1];
    }
  }

  const decoded = decodeHtmlEntities(rawJson).replace(/\\"/g, '"');

  // 1. Direct JSON parse
  try {
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return { title, columns: parsed };
    }
  } catch {}

  // 2. Slicing back from the end to repair truncated JSON
  for (let idx = decoded.lastIndexOf("}"); idx > 0; idx = decoded.lastIndexOf("}", idx - 1)) {
    const slice = decoded.slice(0, idx + 1);
    try {
      const parsed = JSON.parse(slice + "]");
      if (Array.isArray(parsed) && parsed.length > 0) return { title, columns: parsed };
    } catch {}
    try {
      const parsed = JSON.parse(slice + "]}]");
      if (Array.isArray(parsed) && parsed.length > 0) return { title, columns: parsed };
    } catch {}
  }

  // 3. Fallback: Regex extraction of columns and cards
  const cols: { id: string; title: string; cards: { id: string; title: string; tags?: string[] }[] }[] = [];
  const colRegex = /\{"id":"([^"]+)","title":"([^"]+)"(?:,"cards":\[([\s\S]*?)\])?/g;
  let m;
  while ((m = colRegex.exec(decoded)) !== null) {
    const cards: { id: string; title: string; tags?: string[] }[] = [];
    if (m[3]) {
      const cardRegex = /\{"id":"([^"]+)","title":"([^"]+)"/g;
      let cm;
      while ((cm = cardRegex.exec(m[3])) !== null) {
        cards.push({ id: cm[1], title: cm[2] });
      }
    }
    cols.push({ id: m[1], title: m[2], cards });
  }

  if (cols.length > 0) {
    return { title, columns: cols };
  }

  return {
    title,
    columns: [
      { id: "todo", title: "To Do", cards: [] },
      { id: "in-progress", title: "In Progress", cards: [] },
      { id: "done", title: "Done", cards: [] },
    ],
  };
}

export function NotePreviewRenderer({ content, title, className }: NotePreviewRendererProps) {
  if (!content || !content.trim()) {
    return <span className="text-xs text-txt-muted italic font-normal">Empty note...</span>;
  }

  // 1. Strip YAML frontmatter if present
  let cleanContent = content.replace(/^---\s*[\s\S]*?---\s*/, "");

  // 2. Unescape basic markdown backslashes in general text
  cleanContent = cleanContent.replace(/\\([\[\]\(\)\-\*\_\\`#])/g, "$1");

  // 3. Normalize split markdown images/links across newlines
  cleanContent = cleanContent.replace(/!\[([^\]]*)\]\s*\n\s*\(([^)]+)\)/g, "![$1]($2)");
  cleanContent = cleanContent.replace(/\[([^\]]*)\]\s*\n\s*\(([^)]+)\)/g, "[$1]($2)");

  const lines = cleanContent.split("\n");
  const elements: React.ReactNode[] = [];

  let i = 0;
  let hasSkippedTitle = false;

  while (i < lines.length && elements.length < 15) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Skip the first heading or first line if it matches the note title
    if (!hasSkippedTitle && title) {
      const cleanLine = trimmed
        .replace(/^#+\s*/, "")
        .replace(/[*_`~]/g, "")
        .trim()
        .toLowerCase();
      const cleanTitle = title
        .replace(/^#+\s*/, "")
        .replace(/[*_`~]/g, "")
        .trim()
        .toLowerCase();
      if (cleanLine && cleanTitle && (cleanLine === cleanTitle || cleanLine.startsWith(cleanTitle) || cleanTitle.startsWith(cleanLine))) {
        hasSkippedTitle = true;
        i++;
        continue;
      }
    }

    // 0. Image Block (![alt](url) or <img ... src="..." />)
    const imgInfo = extractImageInfo(trimmed);
    if (imgInfo && imgInfo.src) {
      elements.push(
        <div key={`img-${i}`} className="my-1.5 w-full overflow-hidden rounded-lg border border-border/60 bg-secondary/20 shadow-2xs">
          <img
            src={imgInfo.src}
            alt={imgInfo.alt || "Note image preview"}
            className="w-full h-28 object-cover rounded-lg hover:scale-102 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget.parentElement as HTMLElement)?.style.setProperty("display", "none");
            }}
          />
        </div>
      );
      i++;
      continue;
    }

    // 0.1 Embedded Kanban Board (<div data-type="kanban-board" ...)
    if (
      trimmed.includes('data-type="kanban-board"') ||
      trimmed.includes("data-type='kanban-board'") ||
      trimmed.includes('data-type=\\"kanban-board\\"') ||
      trimmed.includes("data-kanban-data")
    ) {
      let fullBlock = trimmed;
      const kanbanStartIdx = i;
      while (i + 1 < lines.length && !lines[i].includes("</div>") && !lines[i].endsWith("/>")) {
        i++;
        fullBlock += " " + lines[i].trim();
      }
      i++;

      const { title: boardTitle, columns } = parseKanbanBlockData(fullBlock);
      const totalTasks = columns.reduce((acc, col) => acc + (col.cards?.length || 0), 0);

      elements.push(
        <div
          key={`kanban-${kanbanStartIdx}`}
          className="my-1.5 w-full overflow-hidden rounded-lg border border-border/80 bg-secondary/30 p-2 shadow-2xs space-y-1.5"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-1 text-txt-secondary pb-1 border-b border-border/40">
            <div className="flex items-center gap-1.5 min-w-0">
              <Columns3 className="h-3.5 w-3.5 text-txt-brand shrink-0" />
              <span className="text-[10.5px] font-semibold text-txt-primary truncate">
                {boardTitle}
              </span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-secondary text-txt-muted font-medium shrink-0 border border-border/40">
              {columns.length} cols · {totalTasks} tasks
            </span>
          </div>

          {/* Mini Columns */}
          <div className="grid grid-flow-col auto-cols-fr gap-1.5 overflow-hidden">
            {columns.slice(0, 3).map((col, cIdx) => (
              <div
                key={col.id || cIdx}
                className="flex flex-col gap-1 p-1.5 rounded-md bg-card/90 border border-border/50 min-w-0"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-semibold text-txt-secondary truncate">
                    {col.title}
                  </span>
                  <span className="text-[8px] px-1 py-0 rounded-full bg-secondary/80 text-txt-muted shrink-0 font-medium">
                    {col.cards?.length || 0}
                  </span>
                </div>
                {col.cards && col.cards.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {col.cards.slice(0, 2).map((c) => (
                      <div
                        key={c.id}
                        className="px-1.5 py-0.5 rounded bg-background/90 border border-border/40 text-[8.5px] text-txt-primary truncate leading-tight flex items-center justify-between gap-1 shadow-2xs"
                      >
                        <span className="truncate">{c.title}</span>
                        {c.tags && c.tags.length > 0 && (
                          <span className="text-[7.5px] px-1 py-0 rounded bg-secondary text-txt-muted shrink-0">
                            #{c.tags[0]}
                          </span>
                        )}
                      </div>
                    ))}
                    {col.cards.length > 2 && (
                      <span className="text-[8px] text-txt-muted pl-0.5 font-medium">
                        +{col.cards.length - 2} more
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="py-1 text-[8px] text-txt-muted/50 italic text-center">
                    Empty
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
      continue;
    }

    // 0.2 Embedded Table of Contents (<div data-type="table-of-contents" ...)
    if (
      trimmed.includes('data-type="table-of-contents"') ||
      trimmed.includes("data-type='table-of-contents'") ||
      trimmed.includes('data-type=\\"table-of-contents\\"')
    ) {
      const tocStartIdx = i;
      while (i + 1 < lines.length && !lines[i].includes("</div>") && !lines[i].endsWith("/>")) {
        i++;
      }
      i++;

      // Extract headings from all remaining lines in the document for the mini TOC preview
      const previewHeadings: { level: number; text: string }[] = [];
      for (const line of lines) {
        const hMatch = line.trim().match(/^(#{1,3})\s+(.*)$/);
        if (hMatch) {
          const level = hMatch[1].length;
          const text = hMatch[2].replace(/[*_`~]/g, "").trim();
          if (text) {
            previewHeadings.push({ level, text });
          }
        }
      }

      if (previewHeadings.length > 0) {
        elements.push(
          <div
            key={`toc-${tocStartIdx}`}
            className="my-1 w-full space-y-0.5 select-none font-sans"
          >
            {previewHeadings.slice(0, 3).map((h, idx) => (
              <div
                key={idx}
                className={cn(
                  "text-[10px] leading-snug truncate text-txt-secondary/90",
                  h.level === 1 ? "pl-0 font-medium text-txt-primary/90" : h.level === 2 ? "pl-2.5 text-[9.5px]" : "pl-5 text-[9px]"
                )}
              >
                <span className="underline decoration-border underline-offset-2 decoration-[1px]">
                  {h.text}
                </span>
              </div>
            ))}
            {previewHeadings.length > 3 && (
              <div className="text-[8.5px] text-txt-muted pl-2.5">
                +{previewHeadings.length - 3} more sections...
              </div>
            )}
          </div>
        );
      }
      continue;
    }

    // Skip stray opening/closing HTML tags
    if (/^<\/?(div|span|p|section)[^>]*>/i.test(trimmed)) {
      i++;
      continue;
    }

    // 1. Code Block (```)
    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      const codeStartIdx = i;
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```") && codeLines.length < 3) {
        codeLines.push(lines[i]);
        i++;
      }
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        i++;
      }
      if (i < lines.length) i++; // skip closing ```

      elements.push(
        <div
          key={`code-${codeStartIdx}`}
          className="my-1 p-1.5 rounded-md bg-secondary/50 border border-border/50 text-[9.5px] font-mono text-txt-primary truncate leading-snug"
        >
          {codeLines.join("\n") || "code"}
        </div>
      );
      continue;
    }

    // 2. Markdown Table (| header |)
    if (trimmed.includes("|") && (trimmed.startsWith("|") || trimmed.endsWith("|"))) {
      const tableLines: string[] = [];
      const tableStartIdx = i;
      while (i < lines.length && lines[i].trim().includes("|") && tableLines.length < 5) {
        tableLines.push(lines[i]);
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = parseTableRow(tableLines[0]);
        let bodyStartIndex = 1;
        if (isTableSeparatorRow(tableLines[1])) {
          bodyStartIndex = 2;
        }
        const bodyRows = tableLines.slice(bodyStartIndex).map((l) => parseTableRow(l));

        elements.push(
          <div
            key={`table-${tableStartIdx}`}
            className="my-1.5 w-full overflow-hidden rounded border border-border/70 bg-secondary/20 shadow-2xs"
          >
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-secondary/60 border-b border-border/60">
                  {headerCells.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className="px-1.5 py-0.5 font-semibold text-txt-primary text-[9px] truncate"
                    >
                      <MiniFormattedInline text={h} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-accent/20">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-1.5 py-0.5 text-txt-secondary text-[9px] truncate leading-tight"
                      >
                        <MiniFormattedInline text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      } else {
        i = tableStartIdx; // backtrack if not a real table
      }
    }

    // 3. Blockquotes (Group ALL consecutive lines starting with > into 1 single callout box)
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      const quoteStartIdx = i;
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        const qLine = lines[i].trim().replace(/^>\s?/, "").replace(/\\+$/, "").trim();
        if (qLine) {
          quoteLines.push(qLine);
        }
        i++;
      }

      if (quoteLines.length > 0) {
        elements.push(
          <div
            key={`quote-${quoteStartIdx}`}
            className="my-1.5 pl-2.5 py-1.5 border-l-2 border-primary/80 bg-primary/5 text-[10.5px] text-txt-secondary space-y-1 rounded-r-xs"
          >
            {quoteLines.map((ql, qIdx) => (
              <div key={qIdx} className="leading-snug">
                <MiniFormattedInline text={ql} />
              </div>
            ))}
          </div>
        );
      }
      continue;
    }

    // 4. Horizontal Rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<hr key={`hr-${i}`} className="my-1 border-t border-border/50" />);
      i++;
      continue;
    }

    // 5. Headings
    if (trimmed.startsWith("# ")) {
      elements.push(
        <div key={`h1-${i}`} className="pt-1 pb-0.5 text-xs font-bold text-txt-primary truncate">
          <MiniFormattedInline text={trimmed.slice(2)} />
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <div key={`h2-${i}`} className="pt-1 pb-0.5 text-[11px] font-semibold text-txt-primary truncate">
          <MiniFormattedInline text={trimmed.slice(3)} />
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("### ") || trimmed.startsWith("#### ")) {
      const hText = trimmed.replace(/^#+\s*/, "");
      elements.push(
        <div key={`h3-${i}`} className="pt-0.5 pb-0.5 text-[10px] font-semibold text-txt-secondary uppercase tracking-wider truncate">
          <MiniFormattedInline text={hText} />
        </div>
      );
      i++;
      continue;
    }

    // 6. Task List (- [ ] or - [x])
    const taskMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[1].toLowerCase() === "x";
      elements.push(
        <div key={`task-${i}`} className="flex items-start gap-1.5 py-0.5 text-[10.5px] leading-tight">
          <span
            className={cn(
              "h-3 w-3 rounded-[3px] border flex items-center justify-center shrink-0 mt-0.5 text-[8px]",
              isChecked
                ? "bg-primary border-primary text-primary-foreground font-bold"
                : "border-border/80 bg-background/50"
            )}
          >
            {isChecked && "✓"}
          </span>
          <span className={cn("text-txt-secondary leading-tight line-clamp-1 flex-1", isChecked && "line-through opacity-70")}>
            <MiniFormattedInline text={taskMatch[2]} />
          </span>
        </div>
      );
      i++;
      continue;
    }

    // 7. Bullet Lists (- item, * item)
    const bulletMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-1.5 py-0.5 text-[10.5px] leading-normal pl-0.5">
          <span className="h-1 w-1 rounded-full bg-txt-muted shrink-0 mt-1.5" />
          <span className="text-txt-secondary line-clamp-1 flex-1">
            <MiniFormattedInline text={bulletMatch[1]} />
          </span>
        </div>
      );
      i++;
      continue;
    }

    // 8. Numbered Lists (1. item)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-1.5 py-0.5 text-[10.5px] leading-normal pl-0.5">
          <span className="text-[9px] text-txt-muted shrink-0 font-mono mt-0.5">{numMatch[1]}.</span>
          <span className="text-txt-secondary line-clamp-1 flex-1">
            <MiniFormattedInline text={numMatch[2]} />
          </span>
        </div>
      );
      i++;
      continue;
    }

    // 9. Standard Paragraph (Guard against unparsed HTML tags, JSON or attribute fragments)
    if (
      /^<\/?(div|span|p|section|table|tr|td|th)[^>]*>$/i.test(trimmed) ||
      trimmed.includes("&quot;") ||
      trimmed.startsWith("<div") ||
      trimmed.startsWith("data-") ||
      trimmed.endsWith("</div>")
    ) {
      i++;
      continue;
    }

    elements.push(
      <p key={`p-${i}`} className="text-[11px] text-txt-secondary leading-relaxed font-normal">
        <MiniFormattedInline text={trimmed} />
      </p>
    );
    i++;
  }

  return <div className={cn("flex flex-col gap-1 w-full", className)}>{elements}</div>;
}
