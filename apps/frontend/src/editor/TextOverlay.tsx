/**
 * HTML text-editing surface. Temporary UI only: the document (canvas-rendered
 * text) stays authoritative; this overlay exists while a session is open.
 * New text has no element yet — it anchors to the session's world point.
 */
import { useEffect, useRef, useState } from "react";
import { getActivePage, worldToScreen } from "@eraser/editor-core";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_WEIGHT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_STROKE_COLOR,
  DEFAULT_TEXT_ALIGN,
} from "@eraser/editor-elements";
import type { Point } from "@eraser/shared-types";
import { useEditorSnapshot, useTextEditSession } from "./hooks.js";
import type { EditorApp } from "./engine.js";

interface OverlayStyle {
  readonly origin: Point;
  readonly width: number;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly fontWeight: number;
  readonly lineHeight: number;
  readonly textAlign: "left" | "center" | "right";
  readonly color: string;
}

function TextEditor({
  app,
  elementId,
  initialText,
  style,
}: {
  readonly app: EditorApp;
  readonly elementId: string;
  readonly initialText: string;
  readonly style: OverlayStyle;
}) {
  const [draft, setDraft] = useState(initialText);
  const finishedRef = useRef(false);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const snapshot = useEditorSnapshot(app);

  useEffect(() => {
    areaRef.current?.focus();
  }, []);

  const viewport = app.tools.getViewport();
  const screen = worldToScreen(style.origin, snapshot.camera, viewport);
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
        minWidth: `${String(Math.max(120, style.width * zoom))}px`,
        fontSize: `${String(Math.max(8, style.fontSize * zoom))}px`,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        textAlign: style.textAlign,
        color: style.color,
      }}
    />
  );
}

export function TextOverlay({ app }: { readonly app: EditorApp }) {
  const session = useTextEditSession(app);
  useEditorSnapshot(app);
  if (session === undefined) return null;
  const document = app.editor.getDocument();
  const element = getActivePage(document).elements.find(
    (candidate) => candidate.id === session.elementId,
  );
  const style: OverlayStyle =
    element?.type === "text"
      ? {
          origin: { x: element.x, y: element.y },
          width: element.width,
          fontSize: element.fontSize,
          fontFamily: element.fontFamily,
          fontWeight: element.fontWeight,
          lineHeight: element.lineHeight,
          textAlign: element.textAlign,
          color: element.strokeColor,
        }
      : {
          origin: session.anchor ?? { x: 0, y: 0 },
          width: 0,
          fontSize: DEFAULT_FONT_SIZE,
          fontFamily: DEFAULT_FONT_FAMILY,
          fontWeight: DEFAULT_FONT_WEIGHT,
          lineHeight: DEFAULT_LINE_HEIGHT,
          textAlign: DEFAULT_TEXT_ALIGN,
          color: DEFAULT_STROKE_COLOR,
        };
  const initialText = element?.type === "text" ? element.text : "";
  return (
    <TextEditor
      key={session.elementId}
      app={app}
      elementId={session.elementId}
      initialText={initialText}
      style={style}
    />
  );
}
