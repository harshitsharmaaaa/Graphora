/**
 * Selection — ordered id set plus derived geometry. Selection is
 * *ephemeral UI state*: it is never persisted and never enters history.
 * Locked elements are excluded from transforms (but may stay selected so
 * the inspector can unlock them).
 */
import type { Bounds } from "@eraser/shared-types";
import { unionAllBounds } from "@eraser/editor-geometry";
import { defaultRegistry } from "@eraser/editor-elements";
import type { Element, ElementRegistry } from "@eraser/editor-elements";
import type { Page } from "../document/types.js";

export interface SelectionState {
  readonly selectedIds: readonly string[];
}

export class Selection {
  private ids: string[] = [];

  getIds(): readonly string[] {
    return [...this.ids];
  }

  snapshot(): SelectionState {
    return { selectedIds: this.getIds() };
  }

  isEmpty(): boolean {
    return this.ids.length === 0;
  }

  size(): number {
    return this.ids.length;
  }

  has(id: string): boolean {
    return this.ids.includes(id);
  }

  /** Replace the selection. Returns true when anything changed. */
  set(ids: readonly string[]): boolean {
    const next = [...new Set(ids)];
    if (arraysEqual(this.ids, next)) return false;
    this.ids = next;
    return true;
  }

  /** Add ids, preserving existing order. Returns true when changed. */
  add(ids: readonly string[]): boolean {
    return this.set([...this.ids, ...ids]);
  }

  /** Remove ids. Returns true when changed. */
  remove(ids: readonly string[]): boolean {
    const drop = new Set(ids);
    return this.set(this.ids.filter((id) => !drop.has(id)));
  }

  /** Toggle membership (shift-click semantics). Returns true when changed. */
  toggle(id: string): boolean {
    return this.has(id) ? this.remove([id]) : this.add([id]);
  }

  clear(): boolean {
    return this.set([]);
  }

  /** Selected elements in page order (skips stale ids). */
  getSelectedElements(page: Page): Element[] {
    const wanted = new Set(this.ids);
    return page.elements.filter((element) => wanted.has(element.id));
  }

  /** Union hull of the selected elements, or `undefined` when empty. */
  getBounds(page: Page, registry: ElementRegistry = defaultRegistry): Bounds | undefined {
    const selected = this.getSelectedElements(page);
    if (selected.length === 0) return undefined;
    return unionAllBounds(selected.map((element) => registry.getBounds(element)));
  }

  /** Selected elements that may be transformed (excludes locked). */
  getTransformableElements(page: Page): Element[] {
    return this.getSelectedElements(page).filter((element) => !element.locked);
  }
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
