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
import { ChromeIcon } from "../components/icons.js";
import { fitToContent } from "./actions.js";
import type { ToolId } from "@eraser/editor-tools";

interface PaletteAction {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly run: () => void;
}

function CanvasControls({ app }: { readonly app: EditorApp }) {
  const snapshot = useEditorSnapshot(app);
  const percent = Math.round(snapshot.camera.zoom * 100);
  return (
    <div className="canvas-controls" aria-label="Canvas controls">
      <button
        type="button"
        className="canvas-control"
        aria-label="Zoom out"
        title="Zoom out (Ctrl+-)"
        onClick={() => {
          app.editor.setCamera({ zoom: Math.max(0.1, snapshot.camera.zoom / 1.25) });
        }}
      >
        −
      </button>
      <button
        type="button"
        className="canvas-control canvas-zoom"
        aria-label="Reset zoom to 100%"
        title="Reset zoom (Ctrl+0)"
        onClick={() => {
          app.editor.setCamera({ zoom: 1 });
        }}
      >
        {percent}%
      </button>
      <button
        type="button"
        className="canvas-control"
        aria-label="Zoom in"
        title="Zoom in (Ctrl+=)"
        onClick={() => {
          app.editor.setCamera({ zoom: Math.min(8, snapshot.camera.zoom * 1.25) });
        }}
      >
        +
      </button>
      <span className="canvas-control-separator" aria-hidden="true" />
      <button
        type="button"
        className="canvas-control canvas-fit"
        title="Fit canvas to content (Ctrl+1)"
        onClick={() => {
          fitToContent(app);
        }}
      >
        Fit
      </button>
    </div>
  );
}

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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [collaborationState, setCollaborationState] = useState(app.collaboration.state);
  const document = app.editor.getDocument();
  const selectedCount = snapshot.selectedIds.length;
  const selectedElement =
    selectedCount === 1
      ? document.pages
          .flatMap((page) => page.elements)
          .find((element) => element.id === snapshot.selectedIds[0])
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

  useEffect(() => app.collaboration.onState(setCollaborationState), [app]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
        setPaletteQuery("");
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
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
    systemClipboard()
      ?.writeText(shareUrl)
      .then(() => {
        setShareNote("Link copied");
      })
      .catch(() => {
        setShareNote("Copy failed");
      });
  };

  const runTool = (id: ToolId): void => {
    app.tools.setActiveTool(id);
    setPaletteOpen(false);
  };
  const paletteActions: readonly PaletteAction[] = [
    {
      id: "select",
      label: "Select tool",
      hint: "V",
      run: () => {
        runTool("select");
      },
    },
    {
      id: "shapes",
      label: "Rectangle tool",
      hint: "R",
      run: () => {
        runTool("rectangle");
      },
    },
    {
      id: "text",
      label: "Text tool",
      hint: "T",
      run: () => {
        runTool("text");
      },
    },
    {
      id: "undo",
      label: "Undo last change",
      hint: "Ctrl Z",
      run: () => {
        app.editor.undo();
        setPaletteOpen(false);
      },
    },
    {
      id: "redo",
      label: "Redo last change",
      hint: "Ctrl Shift Z",
      run: () => {
        app.editor.redo();
        setPaletteOpen(false);
      },
    },
    {
      id: "copy",
      label: "Copy selection",
      hint: "Ctrl C",
      run: () => {
        app.copySelected();
        setPaletteOpen(false);
      },
    },
    {
      id: "duplicate",
      label: "Duplicate selection",
      hint: "Ctrl D",
      run: () => {
        app.duplicateSelected();
        setPaletteOpen(false);
      },
    },
    {
      id: "delete",
      label: "Delete selection",
      hint: "Del",
      run: () => {
        app.deleteSelected();
        setPaletteOpen(false);
      },
    },
    {
      id: "fit",
      label: "Fit canvas to content",
      hint: "Ctrl 1",
      run: () => {
        fitToContent(app);
        setPaletteOpen(false);
      },
    },
    {
      id: "assist",
      label: "Open Assist",
      run: () => {
        setAiOpen(true);
        setPaletteOpen(false);
      },
    },
    {
      id: "share",
      label: "Share document",
      run: () => {
        share();
        setPaletteOpen(false);
      },
    },
  ];
  const visibleActions = paletteActions.filter((action) =>
    action.label.toLowerCase().includes(paletteQuery.trim().toLowerCase()),
  );

  return (
    <div className="editor-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            G
          </span>
          <span className="brand">Graphora</span>
        </div>
        <span className="topbar-divider" aria-hidden="true" />
        <div className="document-nav" aria-label="Document navigation">
          <span className="doc-name" title={document.name}>
            {document.name}
          </span>
          <span className="document-badge">Canvas</span>
          <span className="page-name">
            {document.pages.find((page) => page.id === document.activePageId)?.name}
          </span>
          <span className="page-indicator">
            {document.pages.findIndex((page) => page.id === document.activePageId) + 1}/
            {document.pages.length}
          </span>
        </div>
        <span className="topbar-spacer" />
        <button
          type="button"
          className="command-trigger"
          onClick={() => {
            setPaletteOpen(true);
          }}
          aria-label="Open command palette"
        >
          <ChromeIcon name="search" size={14} />
          <span>Search commands</span>
          <kbd>Ctrl/Cmd K</kbd>
        </button>
        <div className="save-state" aria-label={`Collaboration ${collaborationState}`}>
          <span className={`state-dot ${collaborationState}`} aria-hidden="true" />
          <span>{collaborationState === "connected" ? "Live" : collaborationState}</span>
        </div>
        <div className="topbar-divider" aria-hidden="true" />
        <button
          type="button"
          className="chrome-button icon-button"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          disabled={!snapshot.canUndo}
          onClick={() => {
            app.editor.undo();
          }}
        >
          <ChromeIcon name="undo" />
        </button>
        <button
          type="button"
          className="chrome-button icon-button"
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
          disabled={!snapshot.canRedo}
          onClick={() => {
            app.editor.redo();
          }}
        >
          <ChromeIcon name="redo" />
        </button>
        <button
          type="button"
          className="chrome-button chrome-button-primary"
          onClick={share}
          title="Create read-only share link"
        >
          <ChromeIcon name="share" />
          <span>{sharing ? "Creating…" : "Share"}</span>
        </button>
        <button
          type="button"
          className="chrome-button chrome-button-ai"
          onClick={() => {
            setAiOpen(true);
          }}
        >
          <ChromeIcon name="spark" />
          <span>Assist</span>
        </button>
      </header>
      {paletteOpen && (
        <div
          className="palette-backdrop"
          role="presentation"
          onPointerDown={() => {
            setPaletteOpen(false);
          }}
        >
          <section
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="palette-search">
              <ChromeIcon name="search" size={16} />
              <input
                autoFocus
                value={paletteQuery}
                onChange={(event) => {
                  setPaletteQuery(event.target.value);
                }}
                placeholder="Search commands"
                aria-label="Search commands"
              />
              <kbd>Esc</kbd>
            </div>
            <div className="palette-results" role="menu">
              {visibleActions.length === 0 && (
                <p className="palette-empty">No matching commands.</p>
              )}
              {visibleActions.map((action) => (
                <button type="button" key={action.id} role="menuitem" onClick={action.run}>
                  <span>{action.label}</span>
                  {action.hint !== undefined && <kbd>{action.hint}</kbd>}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {aiOpen && (
        <div className="ai-popover" role="dialog" aria-label="Generate diagram">
          <div className="popover-heading">
            <span className="popover-kicker">
              <ChromeIcon name="spark" size={13} /> Canvas assist
            </span>
            <button
              type="button"
              className="popover-close"
              aria-label="Close assistant"
              onClick={() => {
                setAiOpen(false);
              }}
            >
              <ChromeIcon name="close" size={14} />
            </button>
          </div>
          <strong>Generate a diagram</strong>
          <p>Describe the architecture or flow you want to create.</p>
          <textarea
            value={aiPrompt}
            onChange={(event) => {
              setAiPrompt(event.target.value);
            }}
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
                app
                  .generateDiagram(aiPrompt.trim())
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
            <button
              type="button"
              className="mini-button"
              onClick={() => {
                setAiOpen(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {shareUrl !== undefined && (
        <div className="share-popover" role="dialog" aria-label="Share document">
          <div className="popover-heading">
            <span className="popover-kicker">
              <ChromeIcon name="share" size={13} /> Share surface
            </span>
            <button
              type="button"
              className="popover-close"
              aria-label="Close share dialog"
              onClick={() => {
                setShareUrl(undefined);
              }}
            >
              <ChromeIcon name="close" size={14} />
            </button>
          </div>
          <strong>Share document</strong>
          <p>Anyone with the link can view this board.</p>
          <input readOnly value={shareUrl} aria-label="Share link" />
          {shareNote !== "" && <p className="share-note">{shareNote}</p>}
          <div className="button-row">
            <button type="button" className="mini-button accent" onClick={copyShareUrl}>
              Copy link
            </button>
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
                  .catch(() => {
                    setShareNote("Could not revoke link");
                  });
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
          <CanvasControls app={app} />
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
                <button
                  type="button"
                  onClick={() => {
                    void app.pasteFromSystemClipboard();
                    setMenu(undefined);
                  }}
                >
                  Paste
                </button>
              )}
              {selectedCount > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      app.copySelected();
                      setMenu(undefined);
                    }}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      app.duplicateSelected();
                      setMenu(undefined);
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      app.deleteSelected();
                      setMenu(undefined);
                    }}
                  >
                    Delete
                  </button>
                  {selectedElement !== undefined && (
                    <button
                      type="button"
                      onClick={() => {
                        app.editor.dispatch(
                          setLockedCommand([selectedElement.id], !selectedElement.locked),
                        );
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
