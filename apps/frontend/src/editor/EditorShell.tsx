/**
 * Editor shell: top bar, viewport (canvas + floating toolbar + overlays),
 * inspector, status bar. Pure layout over editor state.
 */
import { useState } from "react";
import { serializeDocument } from "@eraser/editor-core";
import { systemClipboard } from "../lib/clipboard.js";
import { EditorCanvas } from "./EditorCanvas.js";
import { EditorToolbar } from "./EditorToolbar.js";
import { PropertyInspector } from "./PropertyInspector.js";
import { StatusBar } from "./StatusBar.js";
import { TextOverlay } from "./TextOverlay.js";
import { useEditorSnapshot } from "./hooks.js";
import type { EditorApp } from "./engine.js";

export function EditorShell({ app }: { readonly app: EditorApp }) {
  const snapshot = useEditorSnapshot(app);
  const [shareNote, setShareNote] = useState("");
  const document = app.editor.getDocument();

  const share = (): void => {
    const clipboard = systemClipboard();
    if (clipboard === undefined) {
      setShareNote("Clipboard unavailable");
      return;
    }
    clipboard
      .writeText(serializeDocument(document))
      .then(() => {
        setShareNote("Copied JSON");
      })
      .catch(() => {
        setShareNote("Copy failed");
      });
  };

  return (
    <div className="editor-shell">
      <header className="topbar">
        <span className="brand">Graphora</span>
        <span className="doc-name">{document.name}</span>
        <span className="topbar-spacer" />
        <span className="save-state" title="Autosaves to this browser">
          {`v${String(snapshot.version)} · saved locally`}
        </span>
        <button
          type="button"
          className="mini-button"
          title="Undo (Ctrl+Z)"
          disabled={!snapshot.canUndo}
          onClick={() => {
            app.editor.undo();
          }}
        >
          Undo
        </button>
        <button
          type="button"
          className="mini-button"
          title="Redo (Ctrl+Shift+Z)"
          disabled={!snapshot.canRedo}
          onClick={() => {
            app.editor.redo();
          }}
        >
          Redo
        </button>
        <button
          type="button"
          className="mini-button accent"
          onClick={share}
          title="Copy document JSON"
        >
          Share
        </button>
        {shareNote !== "" && <span className="share-note">{shareNote}</span>}
      </header>
      <div className="editor-main">
        <div className="canvas-wrap">
          <EditorCanvas app={app} />
          <EditorToolbar app={app} />
          <TextOverlay app={app} />
        </div>
        <PropertyInspector app={app} />
      </div>
      <StatusBar app={app} />
    </div>
  );
}
