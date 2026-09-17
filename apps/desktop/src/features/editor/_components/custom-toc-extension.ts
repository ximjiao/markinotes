"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TocBlockNodeView } from "./toc-block-node-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableOfContents: {
      insertTableOfContents: () => ReturnType;
    };
  }
}

export const CustomTocExtension = Node.create({
  name: "tableOfContents",
  group: "block",
  atom: true,
  draggable: false,
  selectable: false,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="table-of-contents"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-type": "table-of-contents" }, HTMLAttributes),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TocBlockNodeView, {
      stopEvent: () => true,
    });
  },

  addCommands() {
    return {
      insertTableOfContents:
        () =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
          });
        },
    };
  },
});
