/**
 * Command contracts. Every document mutation flows through an
 * `EditorCommand` so it is undoable, replayable, and (later) syncable.
 * Commands are data + behavior pairs: tools build them, the `Editor`
 * executes them inside transactions.
 */
import type { Element } from "@eraser/editor-elements";
import type { Document, Page } from "../document/types.js";

/** Services a command may use. The editor implements this per dispatch. */
export interface CommandContext {
  readonly document: Document;
  getActivePage(): Page;
  getElement(id: string): Element | undefined;
  insertElements(elements: readonly Element[], index?: number): void;
  removeElements(ids: readonly string[]): Element[];
  replaceElement(element: Element): boolean;
  /** Re-sync derived mirrors (z-index order) after structural edits. */
  normalize(): void;
}

/**
 * Deterministic, reversible mutation. `execute`/`undo` must be pure with
 * respect to the context (no clock/network reads except stamping
 * `updatedAt`, which itself is excluded from equality checks).
 */
export interface EditorCommand {
  /** Stable id for coalescing/debugging (not persisted). */
  readonly id: string;
  /** Human label for history UI ("Move", "Create rectangle", …). */
  readonly label: string;
  execute(context: CommandContext): void;
  undo(context: CommandContext): void;
}
