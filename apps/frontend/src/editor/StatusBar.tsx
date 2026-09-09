/**
 * Bottom status bar: zoom controls, Fit, document stats, backend health.
 */
import { useEffect, useState } from "react";
import { env } from "@/lib/env";
import { describeDocument, fitToContent } from "./actions.js";
import { useEditorSnapshot } from "./hooks.js";
import type { EditorApp } from "./engine.js";

function useBackendHealth(): "unknown" | "ok" | "offline" {
  const [health, setHealth] = useState<"unknown" | "ok" | "offline">("unknown");
  useEffect(() => {
    let cancelled = false;
    const mark = (status: "ok" | "offline"): void => {
      if (!cancelled) setHealth(status);
    };
    fetch(`${env.apiUrl}/health`)
      .then((res) => {
        mark(res.ok ? "ok" : "offline");
      })
      .catch(() => {
        mark("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return health;
}

export function StatusBar({ app }: { readonly app: EditorApp }) {
  const snapshot = useEditorSnapshot(app);
  const health = useBackendHealth();
  const percent = Math.round(snapshot.camera.zoom * 100);
  const viewport = app.tools.getViewport();

  return (
    <footer className="statusbar">
      <span className="statusbar-stats">{describeDocument(app)}</span>
      <span className="statusbar-spacer" />
      <span
        className={
          health === "ok" ? "health-dot ok" : health === "offline" ? "health-dot bad" : "health-dot"
        }
        title={
          health === "ok"
            ? "Backend connected"
            : health === "offline"
              ? "Backend offline"
              : "Checking backend…"
        }
      />
      <button
        type="button"
        className="mini-button"
        title="Zoom out (Ctrl+-)"
        onClick={() => {
          const { editor } = app;
          editor.setCamera({ zoom: Math.max(0.1, snapshot.camera.zoom / 1.25) });
        }}
      >
        −
      </button>
      <button
        type="button"
        className="mini-button zoom-label"
        title="Reset zoom to 100% (Ctrl+0)"
        onClick={() => {
          app.editor.setCamera({ zoom: 1 });
        }}
      >
        {`${String(percent)}%`}
      </button>
      <button
        type="button"
        className="mini-button"
        title="Zoom in (Ctrl+=)"
        onClick={() => {
          const { editor } = app;
          editor.setCamera({ zoom: Math.min(8, snapshot.camera.zoom * 1.25) });
        }}
      >
        +
      </button>
      <button
        type="button"
        className="mini-button"
        title="Fit content to view (Ctrl+1)"
        onClick={() => {
          fitToContent(app);
        }}
      >
        Fit
      </button>
      <span className="statusbar-viewport">{`${String(Math.round(viewport.width))}×${String(Math.round(viewport.height))}`}</span>
    </footer>
  );
}
