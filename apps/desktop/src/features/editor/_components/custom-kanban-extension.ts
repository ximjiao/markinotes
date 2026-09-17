"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { KanbanBlockNodeView } from "./kanban-block-node-view";

export interface KanbanBlockCard {
  id: string;
  title: string;
  description?: string;
  priority?: "urgent" | "high" | "medium" | "low" | "none";
  dueDate?: string;
  tags?: string[];
}

export interface KanbanBlockColumn {
  id: string;
  title: string;
  color?: string;
  cards: KanbanBlockCard[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    kanbanBoard: {
      insertKanbanBoard: (options?: {
        title?: string;
        columns?: KanbanBlockColumn[];
      }) => ReturnType;
    };
  }
}

export const CustomKanbanExtension = Node.create({
  name: "kanbanBoard",
  group: "block",
  atom: true,
  draggable: false,
  selectable: false,

  addAttributes() {
    return {
      title: {
        default: "Kanban Board",
        parseHTML: (element) => element.getAttribute("data-title") || "Kanban Board",
        renderHTML: (attributes) => ({
          "data-title": attributes.title || "Kanban Board",
        }),
      },
      data: {
        default: JSON.stringify([
          {
            id: "todo",
            title: "To Do",
            cards: [
              { id: "c1", title: "Research requirements", tags: ["plan"] },
              { id: "c2", title: "Draft specifications", tags: ["spec"] },
            ],
          },
          {
            id: "in-progress",
            title: "In Progress",
            cards: [{ id: "c3", title: "Implement feature logic", tags: ["dev"] }],
          },
          {
            id: "done",
            title: "Done",
            cards: [{ id: "c4", title: "Setup project outline", tags: ["done"] }],
          },
        ]),
        parseHTML: (element) => element.getAttribute("data-kanban-data") || "[]",
        renderHTML: (attributes) => ({
          "data-kanban-data":
            typeof attributes.data === "string"
              ? attributes.data
              : JSON.stringify(attributes.data),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="kanban-board"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-type": "kanban-board" }, HTMLAttributes),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(KanbanBlockNodeView, {
      stopEvent: () => true,
    });
  },

  addCommands() {
    return {
      insertKanbanBoard:
        (options?: { title?: string; columns?: KanbanBlockColumn[] }) =>
        ({ commands }: any) => {
          const defaultCols: KanbanBlockColumn[] = [
            {
              id: "todo",
              title: "To Do",
              cards: [
                { id: "c1", title: "Draft specifications", tags: ["plan"] },
              ],
            },
            {
              id: "in-progress",
              title: "In Progress",
              cards: [
                { id: "c2", title: "Implement components", tags: ["dev"] },
              ],
            },
            {
              id: "done",
              title: "Done",
              cards: [{ id: "c3", title: "Initial setup", tags: ["done"] }],
            },
          ];

          return commands.insertContent({
            type: this.name,
            attrs: {
              title: options?.title || "Kanban Board",
              data: JSON.stringify(options?.columns || defaultCols),
            },
          });
        },
    };
  },
});
