/**
 * Bottom status bar: document stats and truthful collaboration state.
 */
import { describeDocument } from "./actions.js";
import type { EditorApp } from "./engine.js";
import { useEffect, useState } from "react";
import { useEditorSnapshot } from "./hooks.js";

export function StatusBar({ app }: { readonly app: EditorApp }) {
  const snapshot = useEditorSnapshot(app);
  const [state, setState] = useState(app.collaboration.state);
  useEffect(() => app.collaboration.onState(setState), [app]);
  const viewport = app.tools.getViewport();
  const stateLabel =
    state === "connected"
      ? "Collaborating"
      : state === "connecting"
        ? "Connecting"
        : state === "reconnecting"
          ? "Reconnecting"
          : "Offline";

  return (
    <footer className="statusbar" data-version={snapshot.version}>
      <div className="statusbar-group statusbar-document">
        <span className={`health-dot ${state}`} aria-hidden="true" />
        <span className="statusbar-stats">{describeDocument(app)}</span>
      </div>
      <span className="statusbar-spacer" />
      <div className="statusbar-group connection-state">
        <span>{stateLabel}</span>
        {app.collaboration.role !== undefined && (
          <span className="status-role">{app.collaboration.role}</span>
        )}
      </div>
      <span className="statusbar-viewport">{`${String(Math.round(viewport.width))}×${String(Math.round(viewport.height))}`}</span>
    </footer>
  );
}
