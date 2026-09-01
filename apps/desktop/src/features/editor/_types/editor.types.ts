export interface NoteFrontmatter {
  title?: string;
  tags?: string[];
  group?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NoteDocument {
  frontmatter: NoteFrontmatter;
  content: string;
}
