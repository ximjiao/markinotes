"use client";

import React from "react";
import { Sparkles, Info, Lightbulb, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PrettifiedSummaryProps } from "../_types/ai-chat.types";
import { noteIpc } from "@/features/home/_lib/note-ipc";

/**
 * Inline Markdown Parser for AI Responses
 */
export function FormattedInline({ text }: { text: string }) {
  if (!text) return null;

  // 1. Unescape escaped characters and strip stray heading symbols inside quotes/brackets (e.g. "## Title" -> "Title")
  const normalized = text
    .replace(/\\([`*_~[\]()])/g, "$1")
    .replace(/(["'(\[]|^|\s)#{1,6}\s+/g, "$1");

  const parts: React.ReactNode[] = [];
  let remaining = normalized;
  let key = 0;

  while (remaining.length > 0) {
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const boldItalicMatch = remaining.match(/(\*\*\*|___)(.+?)\1/);
    const boldMatch = remaining.match(/(\*\*|__)(.+?)\1/);
    const codeMatch = remaining.match(/`([^`]+)`/);
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_)/);
    const strikeMatch = remaining.match(/~~([^~]+)~~/);
    const markMatch = remaining.match(/==([^=]+)==/);
    const mathMatch = remaining.match(/\$([^$]+)\$/);

    const candidates = [
      linkMatch && linkMatch.index !== undefined ? { type: "link", index: linkMatch.index, match: linkMatch, inner: linkMatch[1], href: linkMatch[2] } : null,
      boldItalicMatch && boldItalicMatch.index !== undefined ? { type: "boldItalic", index: boldItalicMatch.index, match: boldItalicMatch, inner: boldItalicMatch[2] } : null,
      boldMatch && boldMatch.index !== undefined ? { type: "bold", index: boldMatch.index, match: boldMatch, inner: boldMatch[2] } : null,
      codeMatch && codeMatch.index !== undefined ? { type: "code", index: codeMatch.index, match: codeMatch, inner: codeMatch[1] } : null,
      italicMatch && italicMatch.index !== undefined ? { type: "italic", index: italicMatch.index, match: italicMatch, inner: italicMatch[1] || italicMatch[2] } : null,
      strikeMatch && strikeMatch.index !== undefined ? { type: "strike", index: strikeMatch.index, match: strikeMatch, inner: strikeMatch[1] } : null,
      markMatch && markMatch.index !== undefined ? { type: "mark", index: markMatch.index, match: markMatch, inner: markMatch[1] } : null,
      mathMatch && mathMatch.index !== undefined ? { type: "math", index: mathMatch.index, match: mathMatch, inner: mathMatch[1] } : null,
    ]
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => a.index - b.index);

    if (candidates.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = candidates[0]!;
    const before = remaining.slice(0, first.index);
    if (before) parts.push(before);

    const fullMatchLength = first.match[0].length;
    const innerContent = first.inner;

    if (first.type === "link") {
      parts.push(
        <a
          key={key++}
          href={first.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (first.href) {
              noteIpc.openExternalUrl(first.href);
            }
          }}
          className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity font-medium cursor-pointer"
        >
          <FormattedInline text={innerContent} />
        </a>
      );
    } else if (first.type === "boldItalic") {
      parts.push(
        <strong key={key++} className="font-bold italic text-txt-primary">
          <FormattedInline text={innerContent} />
        </strong>
      );
    } else if (first.type === "bold") {
      parts.push(
        <strong key={key++} className="font-semibold text-txt-primary">
          <FormattedInline text={innerContent} />
        </strong>
      );
    } else if (first.type === "code") {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-primary/10 text-primary font-mono text-[11px] border border-primary/20 font-medium"
        >
          {innerContent}
        </code>
      );
    } else if (first.type === "italic") {
      parts.push(
        <em key={key++} className="italic text-txt-secondary">
          <FormattedInline text={innerContent} />
        </em>
      );
    } else if (first.type === "strike") {
      parts.push(
        <del key={key++} className="line-through text-txt-secondary opacity-70">
          <FormattedInline text={innerContent} />
        </del>
      );
    } else if (first.type === "mark") {
      parts.push(
        <mark key={key++} className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 px-1 py-0.5 rounded">
          <FormattedInline text={innerContent} />
        </mark>
      );
    } else if (first.type === "math") {
      parts.push(
        <span
          key={key++}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-secondary/80 text-txt-primary font-mono text-[11px] border border-border/50"
        >
          {innerContent}
        </span>
      );
    }

    remaining = remaining.slice(first.index + fullMatchLength);
  }

  return <>{parts}</>;
}

export function parseTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);

  const cells: string[] = [];
  let current = "";
  let escaped = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === "\\" && !escaped) {
      escaped = true;
      current += char;
    } else if (char === "|" && !escaped) {
      cells.push(current.trim());
      current = "";
    } else {
      escaped = false;
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function isTableSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("-")) return false;
  const cells = parseTableRow(trimmed);
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c.trim()));
}

export function parseTableAlignments(separatorLine: string): ("left" | "center" | "right")[] {
  const cells = parseTableRow(separatorLine);
  return cells.map((cell) => {
    const c = cell.trim();
    if (c.startsWith(":") && c.endsWith(":")) return "center";
    if (c.endsWith(":")) return "right";
    return "left";
  });
}

/**
 * Prettified Summary Component - Full Markdown Block Renderer
 */
export function PrettifiedSummary({ content, isStreaming }: PrettifiedSummaryProps) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code Block
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      elements.push(
        <div key={`code-${i}`} className="my-2 rounded-lg border border-border/70 overflow-hidden bg-secondary/50 shadow-2xs">
          {lang && (
            <div className="px-3 py-1 bg-secondary/80 border-b border-border/50 text-[10px] font-mono text-txt-muted flex items-center justify-between">
              <span>{lang}</span>
            </div>
          )}
          <pre className="p-3 text-[11px] font-mono overflow-x-auto text-txt-primary">
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 2. Table Block
    if (trimmed.includes("|") && (trimmed.startsWith("|") || (i + 1 < lines.length && isTableSeparatorRow(lines[i + 1])))) {
      const tableLines: string[] = [];
      const tableStartIdx = i;
      while (i < lines.length && lines[i].trim().includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = parseTableRow(tableLines[0]);
        let alignments: ("left" | "center" | "right")[] = [];
        let bodyStartIndex = 1;

        if (isTableSeparatorRow(tableLines[1])) {
          alignments = parseTableAlignments(tableLines[1]);
          bodyStartIndex = 2;
        }

        const bodyRows = tableLines.slice(bodyStartIndex).map((l) => parseTableRow(l));

        elements.push(
          <div key={`table-${tableStartIdx}`} className="my-2.5 overflow-x-auto rounded-lg border border-border/70 bg-surface/40 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-secondary/70 border-b border-border/60">
                  {headerCells.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className={cn(
                        "px-3 py-2 font-semibold text-txt-primary text-[11px] whitespace-nowrap",
                        alignments[hIdx] === "center" ? "text-center" : alignments[hIdx] === "right" ? "text-right" : "text-left"
                      )}
                    >
                      <FormattedInline text={h} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-accent/30 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={cn(
                          "px-3 py-2 text-txt-primary text-xs leading-relaxed",
                          alignments[cIdx] === "center" ? "text-center" : alignments[cIdx] === "right" ? "text-right" : "text-left"
                        )}
                      >
                        <FormattedInline text={cell} />
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
        // Backtrack single line with pipe that isn't a full table
        i = tableStartIdx;
      }
    }

    // 3. Blockquotes & GitHub-style Callouts
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      const quoteStartIdx = i;
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }

      const firstLine = quoteLines[0] || "";
      const alertMatch = firstLine.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|INFO)\]\s*(.*)$/i);

      if (alertMatch) {
        const alertType = alertMatch[1].toUpperCase();
        const alertTitleExtra = alertMatch[2];
        const remainingAlertLines = quoteLines.slice(1);
        if (alertTitleExtra) {
          remainingAlertLines.unshift(alertTitleExtra);
        }

        let alertStyle = {
          border: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
          label: "Note",
          icon: <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />,
        };

        if (alertType === "TIP") {
          alertStyle = {
            border: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            label: "Tip",
            icon: <Lightbulb className="h-3.5 w-3.5 text-emerald-500 shrink-0" />,
          };
        } else if (alertType === "IMPORTANT") {
          alertStyle = {
            border: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
            label: "Important",
            icon: <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0" />,
          };
        } else if (alertType === "WARNING" || alertType === "CAUTION") {
          alertStyle = {
            border: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            label: alertType === "CAUTION" ? "Caution" : "Warning",
            icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />,
          };
        }

        elements.push(
          <div key={`alert-${quoteStartIdx}`} className={cn("my-2 p-3 rounded-xl border text-xs space-y-1", alertStyle.border)}>
            <div className="flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider">
              {alertStyle.icon}
              <span>{alertStyle.label}</span>
            </div>
            {remainingAlertLines.map((ql, qIdx) => (
              <p key={qIdx} className="leading-relaxed text-txt-primary">
                <FormattedInline text={ql} />
              </p>
            ))}
          </div>
        );
        continue;
      }

      elements.push(
        <div key={`quote-${quoteStartIdx}`} className="my-1.5 p-2.5 rounded-r-lg bg-primary/5 border-l-2 border-primary text-xs text-txt-secondary space-y-1">
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx} className="leading-relaxed">
              <FormattedInline text={ql} />
            </p>
          ))}
        </div>
      );
      continue;
    }

    // 4. Empty line
    if (!trimmed) {
      elements.push(<div key={`space-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // 5. Horizontal Rule: --- or *** or ___
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<hr key={`hr-${i}`} className="my-2 border-t border-border/40" />);
      i++;
      continue;
    }

    // 6. Math Block ($$ ... $$)
    if (trimmed.startsWith("$$")) {
      const mathLines: string[] = [];
      const mathStartIdx = i;
      if (trimmed.endsWith("$$") && trimmed.length > 2) {
        mathLines.push(trimmed.slice(2, -2).trim());
        i++;
      } else {
        mathLines.push(trimmed.slice(2));
        i++;
        while (i < lines.length && !lines[i].trim().endsWith("$$")) {
          mathLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          mathLines.push(lines[i].trim().replace(/\$\$$/, ""));
          i++;
        }
      }
      elements.push(
        <div key={`math-${mathStartIdx}`} className="my-2 p-2.5 rounded-lg bg-secondary/60 text-center font-mono text-xs text-primary border border-border/50 overflow-x-auto">
          {mathLines.join("\n")}
        </div>
      );
      continue;
    }

    // 7. Headings (with trailing hash cleanup)
    const cleanHeadingText = (raw: string, hashCount: number) => {
      return raw.slice(hashCount).replace(/\s*#+$/, "").trim();
    };

    if (trimmed.startsWith("# ")) {
      elements.push(
        <div key={`h1-${i}`} className="flex items-center gap-2 pt-2 pb-0.5 border-b border-border/40 text-sm font-bold text-txt-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <FormattedInline text={cleanHeadingText(trimmed, 2)} />
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <div key={`h2-${i}`} className="flex items-center gap-1.5 pt-2 pb-0.5 text-xs font-bold text-primary uppercase tracking-wider">
          <Sparkles className="h-3 w-3 text-primary shrink-0" />
          <FormattedInline text={cleanHeadingText(trimmed, 3)} />
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <div key={`h3-${i}`} className="text-xs font-semibold text-txt-primary pt-1.5 pb-0.5 flex items-center gap-1.5">
          <FormattedInline text={cleanHeadingText(trimmed, 4)} />
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("#### ")) {
      elements.push(
        <div key={`h4-${i}`} className="text-xs font-semibold text-txt-primary pt-1.5 pb-0.5 flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-[1px] bg-primary/70 shrink-0" />
          <FormattedInline text={cleanHeadingText(trimmed, 5)} />
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("##### ") || trimmed.startsWith("###### ")) {
      const content = trimmed.replace(/^#+\s+/, "").replace(/\s*#+$/, "").trim();
      elements.push(
        <div key={`h5-${i}`} className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider pt-1.5 pb-0.5">
          <FormattedInline text={content} />
        </div>
      );
      i++;
      continue;
    }

    // 8. Task list items: - [ ] or - [x] or * [ ] or * [x]
    const taskMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[1].toLowerCase() === "x";
      elements.push(
        <div key={`task-${i}`} className="flex items-start gap-1.5 text-xs leading-relaxed text-txt-primary py-0.5 pl-0.5">
          <span className={cn(
            "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 mt-0.5 text-[10px]",
            isChecked ? "bg-primary border-primary text-primary-foreground" : "border-border bg-background"
          )}>
            {isChecked && "✓"}
          </span>
          <div className={cn("flex-1", isChecked && "line-through opacity-70")}>
            <FormattedInline text={taskMatch[2]} />
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 9. Bullet lists: - item, * item, + item (with nested indentation support)
    const bulletMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
    if (bulletMatch) {
      const indentSpaces = bulletMatch[1].length;
      const paddingLeft = indentSpaces >= 4 ? "pl-5" : indentSpaces >= 2 ? "pl-3" : "pl-0.5";
      elements.push(
        <div key={`bullet-${i}`} className={cn("flex items-start gap-2 text-xs leading-relaxed text-txt-primary py-0.5", paddingLeft)}>
          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
          <div className="flex-1">
            <FormattedInline text={bulletMatch[3]} />
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 10. Numbered lists: 1. item (with nested indentation support)
    const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const indentSpaces = numMatch[1].length;
      const paddingLeft = indentSpaces >= 4 ? "pl-5" : indentSpaces >= 2 ? "pl-3" : "pl-0.5";
      elements.push(
        <div key={`num-${i}`} className={cn("flex items-start gap-2 text-xs leading-relaxed text-txt-primary py-0.5", paddingLeft)}>
          <span className="text-[10px] font-bold text-primary bg-primary/10 h-4 min-w-4 px-1 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            {numMatch[2]}
          </span>
          <div className="flex-1">
            <FormattedInline text={numMatch[3]} />
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 11. Paragraph fallback
    elements.push(
      <p key={`p-${i}`} className="text-xs leading-relaxed text-txt-primary py-0.5">
        <FormattedInline text={trimmed} />
      </p>
    );
    i++;
  }

  return (
    <div className="space-y-0.5 select-text selection:bg-primary/20">
      {elements}
      {isStreaming && (
        <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary animate-pulse align-middle" />
      )}
    </div>
  );
}
