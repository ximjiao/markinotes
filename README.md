# Markidown

Local-first, markdown-based notes app for macOS. Notes are real `.md` files
(with YAML frontmatter for grouping/tags) in a folder you choose on disk —
edited through a polished, Notion-like Tiptap editor.

## Stack

- [Tauri 2](https://v2.tauri.app/) — native shell, Rust backend
- [Next.js](https://nextjs.org/) (static export) — UI
- [shadcn/ui](https://ui.shadcn.com/) + Tailwind — components
- [Tiptap](https://tiptap.dev/) — markdown-backed rich text editor
- [zustand](https://zustand.docs.pmnd.rs/) — client state
- [lucide-react](https://lucide.dev/) icons, [morphicons](https://www.morphicons.com/) for icon transitions

## Layout

```
apps/desktop/          Next.js frontend + src-tauri (Rust backend)
packages/shared-types/ TS types shared between the frontend and IPC layer
.claude/agents/         domain-split subagents (tauri-backend, markdown-sync, notion-ui, state-store)
```

## Requirements

- Node 20+, pnpm
- Rust stable toolchain (`rustup`) — required by Tauri

## Getting started

```bash
pnpm install
pnpm dev      # runs `tauri dev` (Next.js dev server + Tauri window)
pnpm build    # production bundle
```

## Architecture notes

- Frontend is a static export (`output: 'export'`) — no Next.js server/API
  routes at runtime. All filesystem, file-watching, and SQLite access happens
  through Tauri Rust commands invoked via `@tauri-apps/api`.
- Note metadata (grouping, tags, timestamps) lives as YAML frontmatter inside
  each `.md` file — that's the master data. A local SQLite database (outside
  the user's workspace folder) is a rebuildable read-cache used only to make
  the sidebar/search feel instant; it is never authoritative.
- Physical OS folders are the primary grouping axis; frontmatter
  `group`/`tags` is a secondary, finer-grained axis layered on top.

See `.claude/agents/*.md` for the fuller constraints each part of the stack
was built against.
