/**
 * Pure document helpers. Mutating helpers operate in place on the editor's
 * live document (commands own the before/after snapshots); pure lookups
 * never mutate.
 */
import type { Element } from "@eraser/editor-elements";
import type { Document, Page } from "./types.js";

export class DocumentInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentInvariantError";
  }
}

/** Active page, falling back to the first page when the id is stale. */
export function getActivePage(document: Document): Page {
  const active = document.pages.find((page) => page.id === document.activePageId);
  if (active !== undefined) return active;
  const first = document.pages[0];
  if (first === undefined) throw new DocumentInvariantError("Document has no pages");
  return first;
}

export function getPage(document: Document, pageId: string): Page | undefined {
  return document.pages.find((page) => page.id === pageId);
}

export interface LocatedElement {
  readonly page: Page;
  readonly element: Element;
  readonly index: number;
}

/** Find an element by id across all pages. */
export function findElement(document: Document, id: string): LocatedElement | undefined {
  for (const page of document.pages) {
    const index = page.elements.findIndex((element) => element.id === id);
    const element = index >= 0 ? page.elements[index] : undefined;
    if (element !== undefined) return { page, element, index };
  }
  return undefined;
}

/** Insert elements at `index` (default: append), stamping array order. */
export function insertElements(page: Page, elements: readonly Element[], index?: number): void {
  const at =
    index === undefined ? page.elements.length : Math.min(Math.max(0, index), page.elements.length);
  page.elements.splice(at, 0, ...elements);
  normalizeZIndexes(page);
}

/** Remove elements by id; returns the removed elements in page order. */
export function removeElementsById(
  page: Page,
  ids: ReadonlySet<string> | readonly string[],
): Element[] {
  const lookup: ReadonlySet<string> = ids instanceof Set ? ids : new Set(ids);
  const removed: Element[] = [];
  const kept: Element[] = [];
  for (const element of page.elements) {
    if (lookup.has(element.id)) removed.push(element);
    else kept.push(element);
  }
  page.elements.length = 0;
  page.elements.push(...kept);
  normalizeZIndexes(page);
  return removed;
}

/** Replace the element with the same id (no-op when absent). */
export function replaceElement(page: Page, element: Element): boolean {
  const index = page.elements.findIndex((candidate) => candidate.id === element.id);
  if (index < 0) return false;
  page.elements[index] = element;
  return true;
}

/** Keep `zIndex` mirrors in sync with array order (the order is canonical). */
export function normalizeZIndexes(page: Page): void {
  page.elements.forEach((element, index) => {
    if (element.zIndex !== index) {
      page.elements[index] = { ...element, zIndex: index };
    }
  });
}

/** Copy an element with a fresh `updatedAt` timestamp. */
export function touchElement(element: Element): Element {
  return { ...element, updatedAt: Date.now() };
}
