/**
 * Scene — the runtime view of the document for rendering and queries.
 *
 * The document is the source of truth; the scene caches the z-ordered
 * element list of the active page plus a spatial index. The index behind
 * `SpatialIndex` is deliberately naive today; swapping in an R-tree later
 * touches only this module.
 */
import type { Bounds } from "@eraser/shared-types";
import { boundsIntersect, unionAllBounds } from "@eraser/editor-geometry";
import { defaultRegistry } from "@eraser/editor-elements";
import type { Element, ElementRegistry } from "@eraser/editor-elements";
import type { Document, Page } from "../document/types.js";
import { getActivePage } from "../document/model.js";

/** Extension point for a future spatial index (R-tree, grid, …). */
export interface SpatialIndex {
  rebuild(elements: readonly Element[]): void;
  queryRange(bounds: Bounds): Element[];
}

/** Linear-scan index. Correct for any element count; replace when measured. */
export class NaiveSpatialIndex implements SpatialIndex {
  private elements: readonly Element[] = [];
  private readonly registry: ElementRegistry;

  constructor(registry: ElementRegistry = defaultRegistry) {
    this.registry = registry;
  }

  rebuild(elements: readonly Element[]): void {
    this.elements = elements;
  }

  queryRange(bounds: Bounds): Element[] {
    const hits: Element[] = [];
    for (const element of this.elements) {
      if (boundsIntersect(this.registry.getBounds(element), bounds)) hits.push(element);
    }
    return hits;
  }
}

export class Scene {
  private readonly registry: ElementRegistry;
  private readonly index: SpatialIndex;
  private cachedVersion = -1;
  private cachedElements: Element[] = [];

  constructor(registry: ElementRegistry = defaultRegistry, index?: SpatialIndex) {
    this.registry = registry;
    this.index = index ?? new NaiveSpatialIndex(registry);
  }

  /** Z-ordered elements of the active page (stable for equal `zIndex`). */
  getElements(document: Document, version: number): Element[] {
    this.sync(document, version);
    return [...this.cachedElements];
  }

  getElement(document: Document, version: number, id: string): Element | undefined {
    this.sync(document, version);
    return this.cachedElements.find((element) => element.id === id);
  }

  /** Elements intersecting `bounds` (marquee, culling). */
  queryRange(document: Document, version: number, bounds: Bounds): Element[] {
    this.sync(document, version);
    return this.index.queryRange(bounds);
  }

  /** Union hull of every element, or `undefined` for an empty page. */
  contentBounds(document: Document, version: number): Bounds | undefined {
    this.sync(document, version);
    return unionAllBounds(this.cachedElements.map((element) => this.registry.getBounds(element)));
  }

  activePage(document: Document): Page {
    return getActivePage(document);
  }

  private sync(document: Document, version: number): void {
    if (version === this.cachedVersion) return;
    const page = getActivePage(document);
    this.cachedElements = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);
    this.index.rebuild(this.cachedElements);
    this.cachedVersion = version;
  }
}
