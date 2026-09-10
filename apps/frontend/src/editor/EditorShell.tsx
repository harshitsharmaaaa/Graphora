/**
 * Editor shell: top bar, viewport (canvas + floating toolbar + overlays),
 * inspector, status bar. Pure layout over editor state.
 */
import { useEffect, useState } from "react";
import { serializeDocument, setLockedCommand } from "@eraser/editor-core";
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
  const [menu, setMenu] = useState<{ readonly x: number; readonly y: number } | undefined>();
  const document = app.editor.getDocument();
  const selectedCount = snapshot.selectedIds.length;
  const selectedElement = selectedCount === 1
    ? document.pages.flatMap((page) => page.elements).find((element) => element.id === snapshot.selectedIds[0])
    : undefined;

  useEffect(() => {
    const close = (): void => {
      setMenu(undefined);
    };
    window.addEventListener("pointerdown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
    };
  }, []);

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
          <EditorToolbar app={app} />
          <div className="canvas-stage">
            <EditorCanvas
              app={app}
              onContextMenu={(event) => {
                setMenu({ x: event.clientX, y: event.clientY });
              }}
            />
          </div>
          <TextOverlay app={app} />
          {menu !== undefined && (
            <div
              className="context-menu"
              style={{ left: menu.x, top: menu.y }}
              role="menu"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
            >
              {selectedCount === 0 && (
                <button type="button" onClick={() => { void app.pasteFromSystemClipboard(); setMenu(undefined); }}>
                  Paste
                </button>
              )}
              {selectedCount > 0 && (
                <>
                  <button type="button" onClick={() => { app.copySelected(); setMenu(undefined); }}>Copy</button>
                  <button type="button" onClick={() => { app.duplicateSelected(); setMenu(undefined); }}>Duplicate</button>
                  <button type="button" onClick={() => { app.deleteSelected(); setMenu(undefined); }}>Delete</button>
                  {selectedElement !== undefined && (
                    <button
                      type="button"
                      onClick={() => {
                        app.editor.dispatch(setLockedCommand([selectedElement.id], !selectedElement.locked));
                        setMenu(undefined);
                      }}
                    >
                      {selectedElement.locked ? "Unlock" : "Lock"}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <PropertyInspector app={app} />
      </div>
      <StatusBar app={app} />
    </div>
  );
}
