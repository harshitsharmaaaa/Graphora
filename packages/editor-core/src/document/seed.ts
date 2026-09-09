/** Document/page seeds for new and empty states. */
import { createElementId } from "@eraser/editor-elements";
import type { Document, Page } from "./types.js";

export const DEFAULT_PAGE_NAME = "Page 1";
export const DEFAULT_DOCUMENT_NAME = "Untitled board";

export function createPage(name: string = DEFAULT_PAGE_NAME): Page {
  return { id: createElementId(), name, elements: [] };
}

export function createEmptyDocument(name: string = DEFAULT_DOCUMENT_NAME): Document {
  const now = Date.now();
  const page = createPage();
  return {
    id: createElementId(),
    version: 1,
    name,
    pages: [page],
    activePageId: page.id,
    assets: {},
    metadata: { createdAt: now, updatedAt: now },
  };
}
