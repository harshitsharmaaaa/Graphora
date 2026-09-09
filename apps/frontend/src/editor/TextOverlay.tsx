/**
 * HTML text-editing surface. Temporary UI only: the document (canvas-rendered
 * text) stays authoritative; this overlay exists while a session is open.
 */
import { useEffect, useRef, useState } from "react";
import { getActivePage, worldToScreen } from "@eraser/editor-core";
import { useEditorSnapshot, useTextEditSession } from "./hooks.js";
import type { EditorApp } from "./engine.js";

function TextEditor({
  app,
  elementId,
  initialText,
}: {
  readonly app: EditorApp;
  readonly elementId: string;
  readonly initialText: string;
}) {
  const [draft, setDraft] = useState(initialText);
  const finishedRef = useRef(false);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const snapshot = useEditorSnapshot(app);

  useEffect(() => {
    areaRef.current?.focus();
  }, []);

  const document = app.editor.getDocument();
  const element = getActivePage(document).elements.find((candidate) => candidate.id === elementId);
  if (element?.type !== "text") return null;

  const viewport = app.tools.getViewport();
  const screen = worldToScreen({ x: element.x, y: element.y }, snapshot.camera, viewport);
  const zoom = snapshot.camera.zoom;

  const commit = (): void => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    app.commitTextEdit(elementId, draft);
  };
  const cancel = (): void => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    app.cancelTextEdit();
  };

  return (
    <textarea
      ref={areaRef}
      className="text-overlay"
      value={draft}
      placeholder="Type something…"
      onChange={(e) => {
        setDraft(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          commit();
        }
      }}
      style={{
        left: `${String(screen.x)}px`,
        top: `${String(screen.y)}px`,
        minWidth: `${String(Math.max(120, element.width * zoom))}px`,
        fontSize: `${String(Math.max(8, element.fontSize * zoom))}px`,
        fontFamily: element.fontFamily,
        fontWeight: element.fontWeight,
        lineHeight: element.lineHeight,
        textAlign: element.textAlign,
        color: element.strokeColor,
      }}
    />
  );
}

export function TextOverlay({ app }: { readonly app: EditorApp }) {
  const session = useTextEditSession(app);
  if (session === undefined) return null;
  const document = app.editor.getDocument();
  const element = getActivePage(document).elements.find(
    (candidate) => candidate.id === session.elementId,
  );
  const initialText = element?.type === "text" ? element.text : "";
  return (
    <TextEditor
      key={session.elementId}
      app={app}
      elementId={session.elementId}
      initialText={initialText}
    />
  );
}
