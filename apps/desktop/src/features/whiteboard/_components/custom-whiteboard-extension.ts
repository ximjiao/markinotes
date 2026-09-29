"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { WhiteboardBlockNodeView } from "./whiteboard-block-node-view";
import { createDefaultWhiteboard, serializeWhiteboardToMarkdown } from "../_lib/whiteboard-serializer";
import type { WhiteboardBoardData } from "../_types/whiteboard.types";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    whiteboardBlock: {
      insertWhiteboardBlock: (options?: {
        title?: string;
        data?: WhiteboardBoardData;
      }) => ReturnType;
    };
  }
}

export const CustomWhiteboardExtension = Node.create({
  name: "whiteboardBlock",
  group: "block",
  atom: true,
  draggable: false,
  selectable: false,

  addAttributes() {
    return {
      title: {
        default: "UX Board",
        parseHTML: (element) => element.getAttribute("data-title") || "UX Board",
        renderHTML: (attributes) => ({
          "data-title": attributes.title || "UX Board",
        }),
      },
      data: {
        default: JSON.stringify(createDefaultWhiteboard("UX Board")),
        parseHTML: (element) =>
          element.getAttribute("data-whiteboard-data") ||
          JSON.stringify(createDefaultWhiteboard("UX Board")),
        renderHTML: (attributes) => ({
          "data-whiteboard-data":
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
        tag: 'div[data-type="whiteboard-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-type": "whiteboard-block" }, HTMLAttributes),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WhiteboardBlockNodeView, {
      stopEvent: () => true,
    });
  },

  addCommands() {
    return {
      insertWhiteboardBlock:
        (options?: { title?: string; data?: WhiteboardBoardData }) =>
        ({ commands }: any) => {
          const defaultBoard = options?.data || createDefaultWhiteboard(options?.title || "UX Board");
          return commands.insertContent({
            type: this.name,
            attrs: {
              title: defaultBoard.title || "UX Board",
              data: JSON.stringify(defaultBoard),
            },
          });
        },
    };
  },
});
