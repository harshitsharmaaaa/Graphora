/**
 * `@eraser/editor-core` — framework-free editor engine.
 *
 * Depends on `@eraser/editor-elements`, `@eraser/editor-geometry`,
 * `@eraser/shared-types`, and `@eraser/shared-validation` only.
 * No React. No DOM.
 */
export type { Document, DocumentMetadata, AssetMetadata, Page } from "./document/types.js";
export {
  createEmptyDocument,
  createPage,
  DEFAULT_DOCUMENT_NAME,
  DEFAULT_PAGE_NAME,
} from "./document/seed.js";
export {
  DocumentInvariantError,
  findElement,
  getActivePage,
  getPage,
  insertElements,
  normalizeZIndexes,
  removeElementsById,
  replaceElement,
  touchElement,
} from "./document/model.js";
export type { LocatedElement } from "./document/model.js";
export {
  DOCUMENT_VERSION,
  DocumentParseError,
  migrateDocument,
  parseDocument,
  serializeDocument,
} from "./document/serialization.js";
export { NaiveSpatialIndex, Scene } from "./scene/index.js";
export type { SpatialIndex } from "./scene/index.js";
export {
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  createCamera,
  fitCameraToBounds,
  panCamera,
  resetCamera,
  screenRectToWorld,
  screenToWorld,
  worldBoundsToScreen,
  worldToScreen,
  zoomCameraAt,
  zoomCameraBy,
} from "./camera/index.js";
export type { CameraState, ViewportSize } from "./camera/index.js";
export { Selection } from "./selection/index.js";
export type { SelectionState } from "./selection/index.js";
export type { CommandContext, EditorCommand } from "./commands/types.js";
export {
  changeStyleCommand,
  createElementsCommand,
  deleteElementsCommand,
  replaceElementsCommand,
  setLockedCommand,
  updateTextCommand,
} from "./commands/element-commands.js";
export {
  moveElement,
  resizeSelectionElements,
  resizeSingleElement,
  rotateElementsAbout,
  selectionPivot,
  setElementFrame,
} from "./commands/transforms.js";
export type { FrameInput, ResizeArgs, SelectionResizeArgs } from "./commands/transforms.js";
export type { HistoryEntry, HistoryStore } from "./history/types.js";
export {
  CLIPBOARD_MIME,
  CLIPBOARD_VERSION,
  cloneElementsForPaste,
  parseClipboardPayload,
  serializeElementsForClipboard,
} from "./clipboard/index.js";
export type { ClipboardPayload } from "./clipboard/index.js";
export type { DocumentPersistence } from "./persistence/types.js";
export { EventEmitter } from "./events/index.js";
export type { EditorEvent, EditorEventType, EditorListener } from "./events/index.js";
export { createId } from "./ids/index.js";
export { Editor, createEditor } from "./editor/index.js";
export type { EditorOptions } from "./editor/index.js";
