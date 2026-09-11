"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface NotePreviewRendererProps {
  content: string;
  title?: string;
  className?: string;
}

// Inline Markdown Parser for bold, italic, code, strikethrough, links
function MiniFormattedInline({ text }: { text: string }) {
  if (!text) return null;

  // 1. Clean trailing backslashes used for hard breaks in markdown
  let clean = text.replace(/\\+$/, "").trim();

  // 2. Unescape backslash escapes (e.g. \[ -> [, \] -> ], \- -> -, etc.)
  clean = clean.replace(/\\([\[\]\(\)\-\*\_\\`#|])/g, "$1");

  // 3. Regex tokens: **bold**, *italic*, `code`, ~~strike~~, [text](url)
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|`[^`]+`|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g;
  const parts = clean.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;

        // Bold
        if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
          return (
            <strong key={index} className="font-semibold text-txt-primary">
              {part.slice(2, -2)}
            </strong>
          );
        }

        // Italic
        if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
          return (
            <em key={index} className="italic text-txt-secondary">
              {part.slice(1, -1)}
            </em>
          );
        }

        // Inline Code
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={index}
              className="px-1 py-0.5 rounded text-[9.5px] font-mono bg-secondary/80 text-txt-primary border border-border/50"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        // Strikethrough
        if (part.startsWith("~~") && part.endsWith("~~")) {
          return (
            <del key={index} className="line-through opacity-70">
              {part.slice(2, -2)}
            </del>
          );
        }

        // Link
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          return (
            <span key={index} className="text-txt-brand font-medium">
              {linkMatch[1]}
            </span>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .map((c) => c.trim().replace(/\\+$/, ""))
    .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);
}

function isTableSeparatorRow(line: string): boolean {
  return /^\|?\s*:?-+:?\s*(\|:?-+:?\s*)*\|?$/.test(line.trim());
}

export function NotePreviewRenderer({ content, title, className }: NotePreviewRendererProps) {
  if (!content || !content.trim()) {
    return <span className="text-xs text-txt-muted italic font-normal">Empty note...</span>;
  }

  // 1. Strip YAML frontmatter if present
  let cleanContent = content.replace(/^---\s*[\s\S]*?---\s*/, "");

  // 2. Unescape basic markdown backslashes in general text
  cleanContent = cleanContent.replace(/\\([\[\]\(\)\-\*\_\\`#])/g, "$1");

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

    // Skip the first heading if it's identical to the note title
    if (!hasSkippedTitle && title && trimmed.replace(/^#+\s*/, "").trim().toLowerCase() === title.trim().toLowerCase()) {
      hasSkippedTitle = true;
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
        <div key={`h1-${i}`} className="pt-1 pb-0.5 text-xs font-bold text-txt-primary flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
          <span className="truncate">
            <MiniFormattedInline text={trimmed.slice(2)} />
          </span>
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

    // 9. Standard Paragraph
    elements.push(
      <p key={`p-${i}`} className="text-[11px] text-txt-secondary leading-relaxed font-normal">
        <MiniFormattedInline text={trimmed} />
      </p>
    );
    i++;
  }

  return <div className={cn("flex flex-col gap-1 w-full", className)}>{elements}</div>;
}
