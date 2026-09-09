/**
 * Bounded undo/redo stack implementing core's `HistoryStore`.
 *
 * Semantics:
 * - `push` records an entry and invalidates the redo stack.
 * - `popUndo`/`popRedo` move entries between stacks; the *caller* (the
 *   `Editor`) executes them so document access stays centralized.
 * - `limit` bounds memory: the oldest entries are dropped first.
 */
import type { HistoryEntry, HistoryStore } from "@eraser/editor-core";

export const DEFAULT_HISTORY_LIMIT = 100;

export interface HistoryOptions {
  /** Max undo entries retained. Defaults to {@link DEFAULT_HISTORY_LIMIT}. */
  readonly limit?: number;
}

export class History implements HistoryStore {
  private readonly limit: number;
  private readonly undoStack: HistoryEntry[] = [];
  private readonly redoStack: HistoryEntry[] = [];
  private readonly listeners = new Set<() => void>();

  constructor(options: HistoryOptions = {}) {
    const limit = options.limit ?? DEFAULT_HISTORY_LIMIT;
    this.limit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_HISTORY_LIMIT;
  }

  push(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    this.redoStack.length = 0;
    while (this.undoStack.length > this.limit) this.undoStack.shift();
    this.notify();
  }

  popUndo(): HistoryEntry | undefined {
    const entry = this.undoStack.pop();
    if (entry === undefined) return undefined;
    this.redoStack.push(entry);
    this.notify();
    return entry;
  }

  popRedo(): HistoryEntry | undefined {
    const entry = this.redoStack.pop();
    if (entry === undefined) return undefined;
    this.undoStack.push(entry);
    this.notify();
    return entry;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undoDepth(): number {
    return this.undoStack.length;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

/** Convenience factory (same as `new History`, reads better at call sites). */
export function createHistory(options: HistoryOptions = {}): History {
  return new History(options);
}
