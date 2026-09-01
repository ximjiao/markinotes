# Feature-Based Architecture Guidance

This project follows a **Feature-Driven (Colocated) Architecture** for high modularity, maintainability, and clear separation of concerns.

## Directory Structure

```text
src/
├── features/
│   ├── workspace/          # Feature: Workspace selection, OS folder tree, file picker
│   │   ├── _components/    # Feature-private UI components
│   │   ├── _hooks/         # Feature-private custom React hooks
│   │   ├── _lib/           # Feature-private utilities, IPC handlers, helper functions
│   │   ├── _types/         # Feature-private TypeScript definitions
│   │   └── index.ts        # Public API surface exported by this feature
│   │
│   ├── editor/             # Feature: Tiptap Markdown editor, floating toolbar, slash commands
│   ├── note-list/          # Feature: Note list pane, sorting, filtering
│   └── command-palette/    # Feature: Quick switcher (Cmd+K)
│
├── components/
│   ├── ui/                 # Atomic shadcn UI primitives (button, card, dialog, etc.)
│   └── shared/             # Domain-agnostic reusable components (EmptyState, ThemeToggle, etc.)
│
├── hooks/                  # Global app-wide utility hooks (e.g. useDebounce, useMediaQuery)
├── lib/                    # Global utilities & Zustand stores
└── types/                  # Global / shared TypeScript interfaces
```

## Conventions & Best Practices

1. **Private Folders (`_components`, `_hooks`, `_lib`, `_types`)**:
   - Folders prefixed with `_` are **private** to that specific feature.
   - Do NOT import directly from another feature's private folder (e.g. avoid `import ... from '@features/workspace/_components/internal'`).

2. **Public API (`index.ts`)**:
   - Each feature should export only its public-facing components, hooks, or utilities via `features/<feature-name>/index.ts`.

3. **Shared Components (`components/shared/`)**:
   - Components used across multiple features belong in `src/components/shared/`.
