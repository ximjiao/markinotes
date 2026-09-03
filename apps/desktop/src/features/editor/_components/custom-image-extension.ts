"use client";

import { Image as BaseImage } from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageBlockNodeView } from "./image-block-node-view";

export const CustomImageExtension = BaseImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: (element) => element.getAttribute("width") || element.style.width || "100%",
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return {
            width: attributes.width,
            style: `width: ${attributes.width}`,
          };
        },
      },
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") || "center",
        renderHTML: (attributes) => ({
          "data-align": attributes.align || "center",
        }),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockNodeView);
  },
});
