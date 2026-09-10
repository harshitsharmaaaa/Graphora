/**
 * Editor shell: top bar, viewport (canvas + floating toolbar + overlays),
 * inspector, status bar. Pure layout over editor state.
 */
import { useEffect, useState } from "react";
import { setLockedCommand } from "@eraser/editor-core";
import { systemClipboard } from "../lib/clipboard.js";
import { EditorCanvas } from "./EditorCanvas.js";
import { EditorToolbar } from "./EditorToolbar.js";
import { PropertyInspector } from "./PropertyInspector.js";
import { StatusBar } from "./StatusBar.js";
import { TextOverlay } from "./TextOverlay.js";
import { useEditorSnapshot } from "./hooks.js";
import type { EditorApp } from "./engine.js";
import { createShareLink, revokeShareLink } from "../lib/sharing.js";

export function EditorShell({ app }: { readonly app: EditorApp }) {
  const snapshot = useEditorSnapshot(app);
  const [shareNote, setShareNote] = useState("");
  const [shareUrl, setShareUrl] = useState<string | undefined>();
  const [sharing, setSharing] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
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
    setSharing(true);
    setShareNote("");
    createShareLink(document)
      .then((url) => {
        setShareUrl(url);
        setSharing(false);
      })
      .catch(() => {
        setShareNote("Could not create share link");
        setSharing(false);
      });
  };

  const copyShareUrl = (): void => {
    if (shareUrl === undefined) return;
    systemClipboard()?.writeText(shareUrl).then(() => setShareNote("Link copied")).catch(() => setShareNote("Copy failed"));
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
          title="Create read-only share link"
        >
          {sharing ? "Creating…" : "Share"}
        </button>
        <button type="button" className="mini-button" onClick={() => setAiOpen(true)}>
          Ask AI
        </button>
        {shareNote !== "" && <span className="share-note">{shareNote}</span>}
      </header>
      {aiOpen && (
        <div className="ai-popover" role="dialog" aria-label="Generate diagram">
          <strong>Generate a diagram</strong>
          <p>Describe the architecture or flow you want to create.</p>
          <textarea
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            placeholder="Create a web app with a frontend, API, Redis, and PostgreSQL"
            rows={5}
          />
          {aiError !== "" && <p className="share-note">{aiError}</p>}
          <div className="button-row">
            <button
              type="button"
              className="mini-button accent"
              disabled={aiBusy || aiPrompt.trim() === ""}
              onClick={() => {
                setAiBusy(true);
                setAiError("");
                app.generateDiagram(aiPrompt.trim())
                  .then(() => {
                    setAiBusy(false);
                    setAiOpen(false);
                  })
                  .catch(() => {
                    setAiBusy(false);
                    setAiError("Could not generate diagram. Try again.");
                  });
              }}
            >
              {aiBusy ? "Generating…" : "Generate"}
            </button>
            <button type="button" className="mini-button" onClick={() => setAiOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      {shareUrl !== undefined && (
        <div className="share-popover" role="dialog" aria-label="Share document">
          <strong>Share document</strong>
          <p>Anyone with the link can view this board.</p>
          <input readOnly value={shareUrl} aria-label="Share link" />
          <div className="button-row">
            <button type="button" className="mini-button accent" onClick={copyShareUrl}>Copy link</button>
            <button
              type="button"
              className="mini-button danger"
              onClick={() => {
                const token = shareUrl.split("/").pop();
                if (token === undefined) return;
                revokeShareLink(decodeURIComponent(token))
                  .then(() => {
                    setShareUrl(undefined);
                    setShareNote("Share link revoked");
                  })
                  .catch(() => setShareNote("Could not revoke link"));
              }}
            >
              Revoke
            </button>
          </div>
        </div>
      )}
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
