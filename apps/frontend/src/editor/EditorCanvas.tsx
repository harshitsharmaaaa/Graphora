/**
 * `EditorCanvas` — canvas host + input bridge + render driver.
 *
 * - Owns the `<canvas>`, the `Renderer`, resize observation, and the rAF
 *   render trigger (event-driven; no per-frame React renders).
 * - Translates Pointer/Wheel/Keyboard events into tool-system calls.
 * - Space+drag pans regardless of the active tool.
 */
import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import { panCamera, zoomCameraBy } from "@eraser/editor-core";
import { isTextEntryTarget, matchShortcutAction } from "@eraser/editor-tools";
import { createRenderer, DARK_CANVAS_BACKGROUND } from "@eraser/editor-renderer";
import type { Renderer, Viewport } from "@eraser/editor-renderer";
import type { RawPointerData } from "@eraser/editor-tools";
import type { Point } from "@eraser/shared-types";
import { handleEditorAction } from "./actions.js";
import type { EditorApp } from "./engine.js";

export function EditorCanvas({
  app,
  onContextMenu,
  readOnly = false,
}: {
  readonly app: EditorApp;
  readonly onContextMenu?: (event: MouseEvent<HTMLCanvasElement>) => void;
  readonly readOnly?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const viewportRef = useRef<Viewport>({ width: 800, height: 600, dpr: 1 });
  const spaceHeldRef = useRef(false);
  const spacePanRef = useRef<{ readonly last: Point } | undefined>(undefined);
  const cursorRef = useRef<string>("");

  const render = useCallback(() => {
    const renderer = rendererRef.current;
    if (renderer === null) return;
    const { editor, tools } = app;
    const document = editor.getDocument();
    const version = editor.getVersion();
    renderer.requestRender({
      elements: editor.getScene().getElements(document, version),
      camera: editor.getCamera(),
      viewport: { ...viewportRef.current },
      selectedIds: editor.getSelection().selectedIds,
      marqueeWorld: tools.getOverlay()?.marqueeWorld,
      options: { background: DARK_CANVAS_BACKGROUND, showGrid: false },
    });
  }, [app]);

  // Setup: renderer, resize observation, wheel, subscriptions.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas === null || container === null) return;
    const renderer = createRenderer();
    renderer.attach(canvas);
    renderer.setImageResolver(app.assets.resolve);
    rendererRef.current = renderer;

    const resize = (): void => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
      viewportRef.current = { width, height, dpr };
      canvas.style.width = `${String(width)}px`;
      canvas.style.height = `${String(height)}px`;
      app.tools.setViewport({ width, height });
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const screen: Point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const { editor } = app;
      const viewport = viewportRef.current;
      if (event.ctrlKey || event.metaKey) {
        editor.setCamera(
          zoomCameraBy(editor.getCamera(), viewport, screen, Math.exp(-event.deltaY * 0.002)),
        );
      } else {
        editor.setCamera(panCamera(editor.getCamera(), -event.deltaX, -event.deltaY));
      }
      render();
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const unsubscribeEditor = app.editor.subscribe(render);
    const unsubscribeTools = app.tools.subscribe(render);
    render();
    return () => {
      observer.disconnect();
      canvas.removeEventListener("wheel", onWheel);
      unsubscribeEditor();
      unsubscribeTools();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [app, render]);

  // Keyboard shortcuts (window-level so the canvas needs no tabIndex hacks).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (readOnly) return;
      if (app.getTextEditSession() !== undefined) {
        if (event.key === "Escape") app.cancelTextEdit();
        return;
      }
      if (isTextEntryTarget(event.target)) return;
      if (event.key === " ") {
        spaceHeldRef.current = true;
        event.preventDefault();
        return;
      }
      const action = matchShortcutAction(event);
      if (action === undefined) return;
      event.preventDefault();
      handleEditorAction(app, action);
      render();
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.key === " ") {
        spaceHeldRef.current = false;
        spacePanRef.current = undefined;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [app, render, readOnly]);

  const toLocal = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (canvas === null) return { x: clientX, y: clientY };
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const toRaw = (e: React.PointerEvent | React.MouseEvent, point: Point): RawPointerData => ({
    pointerId: "pointerId" in e ? e.pointerId : 1,
    button: e.button,
    point,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
  });

  const updateCursor = (point: Point): void => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const cursor = spacePanRef.current !== undefined ? "grabbing" : app.tools.getCursor(point);
    if (cursor !== cursorRef.current) {
      cursorRef.current = cursor;
      canvas.style.cursor = cursor;
    }
  };

  return (
    <div ref={containerRef} className="editor-canvas-container">
      <canvas
        ref={canvasRef}
        className="editor-canvas"
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu?.(e);
        }}
        onPointerDown={(e) => {
          e.currentTarget.focus();
          const point = toLocal(e.clientX, e.clientY);
          if (spaceHeldRef.current) {
            spacePanRef.current = { last: point };
            e.currentTarget.setPointerCapture(e.pointerId);
            updateCursor(point);
            return;
          }
          e.currentTarget.setPointerCapture(e.pointerId);
          if (readOnly) return;
          app.tools.handlePointerDown(toRaw(e, point));
          render();
        }}
        onPointerMove={(e) => {
          const point = toLocal(e.clientX, e.clientY);
          const pan = spacePanRef.current;
          if (pan !== undefined) {
            const dx = point.x - pan.last.x;
            const dy = point.y - pan.last.y;
            spacePanRef.current = { last: point };
            if (dx !== 0 || dy !== 0) {
              const { editor } = app;
              editor.setCamera(panCamera(editor.getCamera(), dx, dy));
              render();
            }
            updateCursor(point);
            return;
          }
          if (!readOnly) app.tools.handlePointerMove(toRaw(e, point));
          if (e.buttons !== 0) render();
          else updateCursor(point);
        }}
        onPointerUp={(e) => {
          if (spacePanRef.current !== undefined) {
            spacePanRef.current = undefined;
            updateCursor(toLocal(e.clientX, e.clientY));
            return;
          }
          if (!readOnly) app.tools.handlePointerUp(toRaw(e, toLocal(e.clientX, e.clientY)));
          render();
        }}
        onPointerCancel={(e) => {
          spacePanRef.current = undefined;
          if (!readOnly) app.tools.handlePointerCancel(toRaw(e, toLocal(e.clientX, e.clientY)));
          render();
        }}
        onDoubleClick={(e) => {
          if (!readOnly) app.tools.handleDoubleClick(toRaw(e, toLocal(e.clientX, e.clientY)));
          render();
        }}
      />
    </div>
  );
}
