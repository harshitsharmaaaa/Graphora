import { useEffect, useState } from "react";
import { EditorCanvas } from "../editor/EditorCanvas.js";
import { createEditorApp } from "../editor/engine.js";
import { useEditorSnapshot } from "../editor/hooks.js";
import { createSharedDocumentPersistence } from "../lib/sharing.js";

export function PublicViewer({ token }: { readonly token: string }) {
  const [app] = useState(() =>
    createEditorApp({
      documentId: `shared-${token}`,
      persistence: createSharedDocumentPersistence(token),
    }),
  );
  const snapshot = useEditorSnapshot(app);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    app.load().catch(() => {
      setFailed(true);
    });
    return () => {
      app.dispose();
    };
  }, [app]);

  if (failed || snapshot.elementCount === 0 && app.editor.getDocument().name === "Untitled board") {
    return <main className="public-viewer-error">This share link is unavailable.</main>;
  }

  const document = app.editor.getDocument();
  return (
    <main className="public-viewer">
      <header className="public-viewer-header">
        <strong>Graphora</strong>
        <span>{document.name}</span>
        <span className="topbar-spacer" />
        <span>Read-only view</span>
      </header>
      <div className="public-viewer-canvas">
        <EditorCanvas app={app} readOnly />
      </div>
    </main>
  );
}
