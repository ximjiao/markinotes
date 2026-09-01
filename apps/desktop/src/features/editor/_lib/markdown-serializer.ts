import type { NoteDocument, NoteFrontmatter } from "../_types/editor.types";

/**
 * Parses raw .md file content into YAML frontmatter and markdown body.
 */
export function parseNoteMarkdown(rawContent: string): NoteDocument {
  if (!rawContent) {
    return {
      frontmatter: { title: "Untitled Note" },
      content: "",
    };
  }

  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  const match = rawContent.match(frontmatterRegex);

  if (!match) {
    // Extract first H1 heading as title if available
    const titleMatch = rawContent.match(/^#\s+(.+)$/m);
    return {
      frontmatter: {
        title: titleMatch ? titleMatch[1].trim() : "Untitled Note",
      },
      content: rawContent,
    };
  }

  const yamlBlock = match[1];
  const body = rawContent.slice(match[0].length);
  const frontmatter: NoteFrontmatter = {};

  yamlBlock.split("\n").forEach((line) => {
    const colonIndex = line.indexOf(":");
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      const val = line.slice(colonIndex + 1).trim();

      if (key === "title") frontmatter.title = val.replace(/^["']|["']$/g, "");
      else if (key === "group") frontmatter.group = val.replace(/^["']|["']$/g, "");
      else if (key === "tags") {
        try {
          frontmatter.tags = JSON.parse(val);
        } catch {
          frontmatter.tags = val.split(",").map((t) => t.trim().replace(/^\[|\]$/g, ""));
        }
      } else if (key === "createdAt") frontmatter.createdAt = val;
      else if (key === "updatedAt") frontmatter.updatedAt = val;
    }
  });

  return {
    frontmatter,
    content: body,
  };
}

/**
 * Serializes frontmatter object and markdown string back into .md format.
 */
export function serializeNoteMarkdown(doc: NoteDocument): string {
  const { frontmatter, content } = doc;
  const yamlLines: string[] = ["---"];

  if (frontmatter.title) yamlLines.push(`title: "${frontmatter.title}"`);
  if (frontmatter.group) yamlLines.push(`group: "${frontmatter.group}"`);
  if (frontmatter.tags && frontmatter.tags.length > 0) {
    yamlLines.push(`tags: ${JSON.stringify(frontmatter.tags)}`);
  }
  if (frontmatter.createdAt) yamlLines.push(`createdAt: "${frontmatter.createdAt}"`);
  yamlLines.push(`updatedAt: "${new Date().toISOString()}"`);
  yamlLines.push("---");

  return `${yamlLines.join("\n")}\n\n${content.trim()}`;
}
