/**
 * React bindings. The editor stays the source of truth; these hooks only
 * mirror snapshots into React state. The canvas itself reads imperatively
 * inside its render path (no per-frame React renders).
 */
import { useEffect, useState } from "react";
import type { CameraState } from "@eraser/editor-core";
import type { ToolId } from "@eraser/editor-tools";
import type { EditorApp, TextEditSession } from "./engine.js";
import { createEditorApp } from "./engine.js";

export interface EditorSnapshot {
  readonly version: number;
  readonly selectedIds: readonly string[];
  readonly camera: CameraState;
  readonly activeToolId: ToolId;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly elementCount: number;
}

/** Create the app once, load persisted state, dispose on unmount. */
export function useEditorApp(): EditorApp {
  const [app] = useState(() => createEditorApp());
  useEffect(() => {
    void app.load();
    return () => {
      app.dispose();
    };
  }, [app]);
  return app;
}

function readSnapshot(app: EditorApp): EditorSnapshot {
  const { editor, tools } = app;
  const document = editor.getDocument();
  return {
    version: editor.getVersion(),
    selectedIds: editor.getSelection().selectedIds,
    camera: editor.getCamera(),
    activeToolId: tools.getActiveToolId(),
    canUndo: editor.canUndo(),
    canRedo: editor.canRedo(),
    elementCount: document.pages.reduce((total, page) => total + page.elements.length, 0),
  };
}

/** Re-render when anything the UI chrome depends on changes. */
export function useEditorSnapshot(app: EditorApp): EditorSnapshot {
  const [snapshot, setSnapshot] = useState(() => readSnapshot(app));
  useEffect(() => {
    const refresh = (): void => {
      setSnapshot(readSnapshot(app));
    };
    const unsubscribeEditor = app.editor.subscribe(refresh);
    const unsubscribeTools = app.tools.subscribe(refresh);
    refresh();
    return () => {
      unsubscribeEditor();
      unsubscribeTools();
    };
  }, [app]);
  return snapshot;
}

/** Current text-edit session (drives the overlay textarea). */
export function useTextEditSession(app: EditorApp): TextEditSession | undefined {
  const [session, setSession] = useState(() => app.getTextEditSession());
  useEffect(() => {
    return app.onTextEditSession(() => {
      setSession(app.getTextEditSession());
    });
  }, [app]);
  return session;
}
