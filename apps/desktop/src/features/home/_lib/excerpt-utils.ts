/**
 * Helper to generate smart excerpts that preserve image previews without
 * corrupting Base64 data URLs or truncating text content.
 */

export function generateSmartExcerpt(content: string, maxTextChars = 3000): string {
  if (!content) return "";

  // 1. Check if there is an image in the document (Markdown or HTML)
  // Match either Markdown ![alt](url) or HTML <img ... src="..." />
  const imgRegex = /(!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+|https?:\/\/[^)]+|\/[^)]+|file:\/\/[^)]+)\)|<img\s+[^>]*src=["']([^"']+)["'][^>]*\/?>)/i;
  
  const imgMatch = content.match(imgRegex);

  let firstImageTag = "";
  if (imgMatch) {
    firstImageTag = imgMatch[0];
  }

  // 2. Strip huge base64 data URLs from the remaining text so text length calculation is accurate
  let textOnly = content
    .replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,[^)]+\)/gi, "")
    .replace(/<img\s+[^>]*src=["']data:image\/[^;]+;base64,[^"']+["'][^>]*\/?>/gi, "")
    .replace(/^---\s*[\s\S]*?---\s*/, ""); // Strip YAML frontmatter

  // Limit normal text
  const trimmedText = textOnly.slice(0, maxTextChars);

  // If we had a first image tag, ensure it is prepended/included cleanly at its relative position or top
  if (firstImageTag) {
    // If the original content started with or had the image early on, prepend or embed it
    if (!trimmedText.includes(firstImageTag)) {
      return `${firstImageTag}\n\n${trimmedText}`;
    }
  }

  return trimmedText;
}
