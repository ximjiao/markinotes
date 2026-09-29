"use client";

import React from "react";
import { isTauri, convertFileSrc } from "@tauri-apps/api/core";

/**
 * Resolves local file paths to Tauri asset URLs, or preserves web URLs and Data URLs.
 */
export function resolveImageSrc(src: string): string {
  if (!src) return "";
  const trimmed = src.trim();

  // Already a web URL, base64 data URL, blob, or tauri asset
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("asset://")
  ) {
    return trimmed;
  }

  // Local file path in Tauri
  try {
    if (typeof window !== "undefined" && isTauri()) {
      let cleanPath = trimmed;
      if (cleanPath.startsWith("file://")) {
        cleanPath = cleanPath.replace(/^file:\/\//, "");
      }
      return convertFileSrc(cleanPath);
    }
  } catch {
    // fallback if not in Tauri
  }

  return trimmed;
}

/**
 * Extracts image information from a string containing Markdown or HTML img tags.
 */
export function extractImageInfo(text: string): { src: string; alt?: string } | null {
  if (!text) return null;
  const trimmed = text.trim();

  // 1. Markdown syntax: ![alt](url)
  const mdMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  if (mdMatch) {
    return {
      alt: mdMatch[1] || "Image preview",
      src: resolveImageSrc(mdMatch[2].trim()),
    };
  }

  // 2. HTML syntax: <img ... src="..." ... />
  const htmlMatch = trimmed.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (htmlMatch) {
    const altMatch = trimmed.match(/alt=["']([^"']*)["']/i);
    return {
      alt: altMatch ? altMatch[1] : "Image preview",
      src: resolveImageSrc(htmlMatch[1].trim()),
    };
  }

  return null;
}

// Inline Markdown Parser for bold, italic, code, strikethrough, links, and images in note card preview
export function MiniFormattedInline({ text }: { text: string }) {
  if (!text) return null;

  // 1. Extract and preserve HTML img tags or markdown images before stripping other HTML
  const clean = text
    .replace(/\\+$/, "")
    .trim()
    .replace(/\\([\[\]\(\)\-\*\_\\`#|])/g, "$1")
    .replace(/(["'(\[]|^|\s)#{1,6}\s+/g, "$1");

  // 2. Regex tokens: ![alt](url), <img ... />, **bold**, *italic*, `code`, ~~strike~~, [text](url)
  const regex = /(!\[[^\]]*\]\([^)]+\)|<img\s+[^>]*src=["'][^"']+["'][^>]*\/?>|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|`[^`]+`|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/gi;
  const parts = clean.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;

        // Image check (Markdown or HTML)
        const imgInfo = extractImageInfo(part);
        if (imgInfo && imgInfo.src) {
          return (
            <span key={index} className="block my-1 w-full overflow-hidden rounded-md border border-border/50 bg-secondary/20 shadow-2xs">
              <img
                src={imgInfo.src}
                alt={imgInfo.alt || "Image preview"}
                className="w-full h-24 object-cover rounded-md"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget.parentElement as HTMLElement)?.style.setProperty("display", "none");
                }}
              />
            </span>
          );
        }

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
              <MiniFormattedInline text={linkMatch[1]} />
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
