/**
 * `@eraser/editor-history` — bounded undo/redo stack for the editor.
 * Depends on `@eraser/editor-core` for contract types only.
 */
export { History, createHistory, DEFAULT_HISTORY_LIMIT } from "./history.js";
export type { HistoryOptions } from "./history.js";
