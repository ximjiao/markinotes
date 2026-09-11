"use client";

import React from "react";

// Inline Markdown Parser for bold, italic, code, strikethrough, links in note card preview
export function MiniFormattedInline({ text }: { text: string }) {
  if (!text) return null;

  // 1. Clean trailing backslashes used for hard breaks in markdown
  const clean = text.replace(/\\+$/, "").trim().replace(/\\([\[\]\(\)\-\*\_\\`#|])/g, "$1");

  // 2. Regex tokens: **bold**, *italic*, `code`, ~~strike~~, [text](url)
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

export function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .map((c) => c.trim().replace(/\\+$/, ""))
    .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);
}

export function isTableSeparatorRow(line: string): boolean {
  return /^\|?\s*:?-+:?\s*(\|:?-+:?\s*)*\|?$/.test(line.trim());
}
