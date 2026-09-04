"use client";

import React, { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/core";
import { Link as LinkIcon, ExternalLink, Copy, Check, Pencil, Unlink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface NotionLinkHoverCardProps {
  editor: Editor | null;
}

interface ActiveLinkData {
  href: string;
  element: HTMLElement;
  rect: DOMRect;
}

export function NotionLinkHoverCard({ editor }: NotionLinkHoverCardProps) {
  const [activeLink, setActiveLink] = useState<ActiveLinkData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isEditingRef = useRef(false);
  isEditingRef.current = isEditing;

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const scheduleHide = (delay = 250) => {
    clearHideTimeout();
    if (isEditingRef.current) return; // Do not hide while editing URL

    hideTimeoutRef.current = setTimeout(() => {
      setActiveLink(null);
      setIsEditing(false);
    }, delay);
  };

  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.view?.dom) return;

    const editorDom = editor.view.dom;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const linkElem = target.closest("a[href]") as HTMLElement | null;

      if (linkElem && editorDom.contains(linkElem)) {
        clearHideTimeout();
        const href = linkElem.getAttribute("href") || "";
        const rect = linkElem.getBoundingClientRect();
        setActiveLink({
          href,
          element: linkElem,
          rect,
        });
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const linkElem = target.closest("a[href]") as HTMLElement | null;

      if (linkElem) {
        scheduleHide(250);
      }
    };

    editorDom.addEventListener("mouseover", handleMouseOver);
    editorDom.addEventListener("mouseout", handleMouseOut);

    return () => {
      editorDom.removeEventListener("mouseover", handleMouseOver);
      editorDom.removeEventListener("mouseout", handleMouseOut);
      clearHideTimeout();
    };
  }, [editor]);

  if (!editor || editor.isDestroyed || !activeLink) return null;

  const handleOpen = () => {
    let url = activeLink.href;
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("mailto:")) {
      url = "https://" + url;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeLink.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Safe fallback
    }
  };

  const handleStartEdit = () => {
    setEditUrl(activeLink.href);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editor) return;
    try {
      const pos = editor.view.posAtDOM(activeLink.element, 0);
      const newUrl = editUrl.trim();
      if (!newUrl) {
        editor.chain().focus().setTextSelection(pos).extendMarkRange("link").unsetLink().run();
        setActiveLink(null);
      } else {
        editor.chain().focus().setTextSelection(pos).extendMarkRange("link").setLink({ href: newUrl }).run();
        setActiveLink((prev) => (prev ? { ...prev, href: newUrl } : null));
      }
    } catch {
      // Safe fallback
    }
    setIsEditing(false);
  };

  const handleUnlink = () => {
    if (!editor) return;
    try {
      const pos = editor.view.posAtDOM(activeLink.element, 0);
      editor.chain().focus().setTextSelection(pos).extendMarkRange("link").unsetLink().run();
      setActiveLink(null);
      setIsEditing(false);
    } catch {
      // Safe fallback
    }
  };

  // Compute position: center horizontally, place above link if enough space, else below
  const { rect } = activeLink;
  const placeBelow = rect.top < 60;
  const top = placeBelow ? rect.bottom + 8 : rect.top - 42;
  const left = Math.max(16, rect.left + rect.width / 2);

  return (
    <div
      onMouseEnter={() => {
        clearHideTimeout();
      }}
      onMouseLeave={() => {
        scheduleHide(200);
      }}
      className={cn(
        "fixed z-50 flex items-center gap-1 px-2 py-1 rounded-xl border border-border bg-popover/95 text-txt-primary shadow-2xl backdrop-blur-md -translate-x-1/2 transition-all duration-150 text-xs animate-in fade-in-50 zoom-in-95",
        isEditing && "w-[320px]"
      )}
      style={{ top: `${top}px`, left: `${left}px` }}
    >
      {isEditing ? (
        <div className="flex items-center gap-1.5 w-full">
          <input
            type="text"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit();
              if (e.key === "Escape") setIsEditing(false);
            }}
            placeholder="https://..."
            className="flex-1 bg-accent/40 text-txt-primary text-xs px-2.5 py-1 rounded-lg border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/60"
            autoFocus
          />
          <Button size="sm" onClick={handleSaveEdit} className="h-6 px-2 text-[11px]">
            Save
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsEditing(false)}
            className="h-6 w-6 rounded-md text-txt-muted hover:text-txt-primary"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <>
          {/* Link URL (Clickable to open) */}
          <button
            type="button"
            onClick={handleOpen}
            className="flex items-center gap-1.5 max-w-[180px] hover:underline text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium truncate py-0.5 px-1 rounded transition-colors group cursor-pointer"
            title={`Open: ${activeLink.href}`}
          >
            <LinkIcon className="h-3 w-3 shrink-0 text-txt-muted group-hover:text-blue-500" />
            <span className="truncate text-xs">{activeLink.href}</span>
          </button>

          <Separator orientation="vertical" className="h-4 mx-0.5" />

          {/* Quick Action: Open Link */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpen}
            className="h-6 w-6 rounded-md text-txt-muted hover:text-txt-primary hover:bg-accent cursor-pointer"
            title="Open link in browser"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>

          {/* Quick Action: Copy Link */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-6 w-6 rounded-md text-txt-muted hover:text-txt-primary hover:bg-accent cursor-pointer"
            title={copied ? "Copied!" : "Copy link to clipboard"}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>

          {/* Quick Action: Edit Link */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStartEdit}
            className="h-6 w-6 rounded-md text-txt-muted hover:text-txt-primary hover:bg-accent cursor-pointer"
            title="Edit link URL"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          {/* Quick Action: Remove Link */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUnlink}
            className="h-6 w-6 rounded-md text-red-500/80 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
            title="Remove hyperlink"
          >
            <Unlink className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
