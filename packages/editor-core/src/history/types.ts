/**
 * History contracts. The stack implementation lives in
 * `@eraser/editor-history`; core only defines the shape so the dependency
 * arrow points `history → core`, never the reverse.
 */

/** One undoable unit (a single command or a committed transaction). */
export interface HistoryEntry {
  readonly label: string;
  redo(): void;
  undo(): void;
}

/** Minimal stack the `Editor` drives. Implemented by `editor-history`. */
export interface HistoryStore {
  /** Push a committed entry (invalidates the redo stack). */
  push(entry: HistoryEntry): void;
  /** Pop the newest undo entry (caller executes it). */
  popUndo(): HistoryEntry | undefined;
  /** Pop the newest redo entry (caller executes it). */
  popRedo(): HistoryEntry | undefined;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
  subscribe(listener: () => void): () => void;
}
