/**
 * Keyboard-action dispatch. The canvas bridge resolves key events to
 * `EditorActionId` (via the centralized shortcut map) and executes them
 * here — no component owns shortcut behavior.
 */
import { fitCameraToBounds, getActivePage, zoomCameraBy } from "@eraser/editor-core";
import type { EditorActionId, ToolId } from "@eraser/editor-tools";
import type { EditorApp } from "./engine.js";

const ZOOM_STEP = 1.25;

function isToolId(action: EditorActionId): action is ToolId {
  return (
    action === "select" ||
    action === "hand" ||
    action === "rectangle" ||
    action === "ellipse" ||
    action === "diamond" ||
    action === "line" ||
    action === "arrow" ||
    action === "freehand" ||
    action === "text" ||
    action === "image" ||
    action === "frame"
  );
}

/** Execute a shortcut action. Returns true when handled. */
export function handleEditorAction(app: EditorApp, action: EditorActionId): boolean {
  const { editor, tools } = app;
  if (isToolId(action)) {
    tools.setActiveTool(action);
    return true;
  }
  switch (action) {
    case "delete":
      return app.deleteSelected();
    case "undo":
      editor.undo();
      return true;
    case "redo":
      editor.redo();
      return true;
    case "copy":
      return app.copySelected();
    case "paste":
      if (app.paste()) return true;
      void app.pasteFromSystemClipboard();
      return true;
    case "duplicate":
      return app.duplicateSelected();
    case "cancel":
      if (tools.cancelActiveGesture()) return true;
      editor.clearSelection();
      return true;
    case "zoom-in":
      zoomAboutCenter(app, ZOOM_STEP);
      return true;
    case "zoom-out":
      zoomAboutCenter(app, 1 / ZOOM_STEP);
      return true;
    case "reset-zoom":
      editor.setCamera({ zoom: 1 });
      return true;
    case "fit":
      fitToContent(app);
      return true;
  }
}

function viewportCenter(app: EditorApp): { x: number; y: number } {
  const viewport = app.tools.getViewport();
  return { x: viewport.width / 2, y: viewport.height / 2 };
}

function zoomAboutCenter(app: EditorApp, factor: number): void {
  const { editor, tools } = app;
  const viewport = tools.getViewport();
  editor.setCamera(zoomCameraBy(editor.getCamera(), viewport, viewportCenter(app), factor));
}

/** Frame all content (used by Fit and the status bar). */
export function fitToContent(app: EditorApp): void {
  const { editor, tools } = app;
  const bounds = editor.getScene().contentBounds(editor.getDocument(), editor.getVersion());
  if (bounds === undefined) {
    editor.setCamera({ x: 0, y: 0, zoom: 1 });
    return;
  }
  editor.setCamera(fitCameraToBounds(editor.getCamera(), tools.getViewport(), bounds));
}

/** Element count line for the status bar. */
export function describeDocument(app: EditorApp): string {
  const page = getActivePage(app.editor.getDocument());
  const total = page.elements.length;
  const selected = app.editor.getSelection().selectedIds.length;
  return selected > 0
    ? `${String(selected)} selected · ${String(total)} objects`
    : `${String(total)} objects`;
}
