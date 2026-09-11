/**
 * Shared Formatting Utilities
 */

export function formatRelativeTime(dateInput: string | number): string {
  if (!dateInput && dateInput !== 0) return "Just now";
  // If it's already "Just now" (old hardcoded value), just return it
  if (dateInput === "Just now") return "Just now";

  const date = typeof dateInput === "number" ? new Date(dateInput) : new Date(dateInput);
  if (isNaN(date.getTime())) return "Just now";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return "Yesterday";
  }
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  // Format as MMM DD, YYYY (e.g. Oct 12, 2026)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function stripMarkdown(markdown: string): string {
  if (!markdown) return "";
  return markdown
    .replace(/^---\s*[\s\S]*?---\s*/, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*>\s+/gm, "")
    .replace(/^\s*([-*+]\s+|\[[ xX]\]\s+|\d+\.\s+)/gm, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
