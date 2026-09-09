/**
 * Drag-to-create tools for box shapes, lines, arrows, and frames.
 * One drag gesture = one history entry (create on pointer-down inside a
 * transaction, replace while dragging, commit on release). A plain click
 * yields a sensible default-sized shape.
 */
import { createElementsCommand, getActivePage, replaceElementsCommand } from "@eraser/editor-core";
import type { Point } from "@eraser/shared-types";
import {
  createArrow,
  createDiamond,
  createEllipse,
  createFrame,
  createLine,
  createRectangle,
} from "@eraser/editor-elements";
import type { Element } from "@eraser/editor-elements";
import type {
  CursorType,
  PointerEventData,
  Tool,
  ToolContext,
  ToolId,
} from "../tool-system/types.js";
import { isClickGesture } from "../tool-system/gestures.js";

export interface BoxToolOptions {
  readonly id: Extract<ToolId, "rectangle" | "ellipse" | "diamond" | "line" | "arrow" | "frame">;
  readonly label: string;
  /** Default size for click (no drag) creation, in world units. */
  readonly defaultWidth: number;
  readonly defaultHeight: number;
  readonly frameName?: string;
}

function buildElement(
  options: BoxToolOptions,
  x: number,
  y: number,
  w: number,
  h: number,
): Element {
  switch (options.id) {
    case "rectangle":
      return createRectangle({ x, y, width: w, height: h });
    case "ellipse":
      return createEllipse({ x, y, width: w, height: h });
    case "diamond":
      return createDiamond({ x, y, width: w, height: h });
    case "line":
      return createLine({ x, y, width: w, height: h });
    case "arrow":
      return createArrow({ x, y, width: w, height: h });
    case "frame":
      return createFrame({ x, y, width: w, height: h, name: options.frameName ?? "Frame" });
  }
}

export class BoxCreateTool implements Tool {
  readonly id: BoxToolOptions["id"];
  readonly label: string;
  readonly cursor: CursorType = "crosshair";
  private readonly options: BoxToolOptions;
  private startWorld: Point | undefined;
  private createdId: string | undefined;
  private downScreen: Point | undefined;

  constructor(options: BoxToolOptions) {
    this.options = options;
    this.id = options.id;
    this.label = options.label;
  }

  onPointerDown(context: ToolContext, event: PointerEventData): void {
    if (event.button !== 0) return;
    const { editor } = context;
    editor.beginTransaction(`Create ${this.label.toLowerCase()}`);
    const element = buildElement(this.options, event.world.x, event.world.y, 0, 0);
    editor.dispatch(createElementsCommand([element], `Create ${this.label.toLowerCase()}`));
    editor.setSelection([element.id]);
    this.startWorld = event.world;
    this.createdId = element.id;
    this.downScreen = event.point;
  }

  onPointerMove(context: ToolContext, event: PointerEventData): void {
    if (this.startWorld === undefined || this.createdId === undefined) return;
    const { editor } = context;
    const page = getActivePage(editor.getDocument());
    const current = page.elements.find((element) => element.id === this.createdId);
    if (current === undefined) return;
    const modifiers = { shiftKey: event.shiftKey, altKey: event.altKey };
    let next: Element;
    if (current.type === "line" || current.type === "arrow") {
      const [a, b] = lineEndpoints(this.startWorld, event.world, modifiers);
      const origin: Point = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) };
      const points: readonly [Point, Point] = [
        { x: a.x - origin.x, y: a.y - origin.y },
        { x: b.x - origin.x, y: b.y - origin.y },
      ];
      next = {
        ...current,
        x: origin.x,
        y: origin.y,
        width: Math.abs(b.x - a.x),
        height: Math.abs(b.y - a.y),
        points,
        updatedAt: Date.now(),
      };
    } else {
      next = {
        ...current,
        ...resizeToPointer(this.startWorld, event.world, modifiers),
        updatedAt: Date.now(),
      };
    }
    editor.dispatch(replaceElementsCommand([next], `Create ${this.label.toLowerCase()}`));
  }

  onPointerUp(context: ToolContext, event: PointerEventData): void {
    const { editor } = context;
    const start = this.startWorld;
    const id = this.createdId;
    const downScreen = this.downScreen;
    this.startWorld = undefined;
    this.createdId = undefined;
    this.downScreen = undefined;
    if (start === undefined || id === undefined || downScreen === undefined) {
      editor.commitTransaction();
      return;
    }
    if (isClickGesture(downScreen, event.point)) {
      // Plain click: default-sized shape centered on the click point.
      const page = getActivePage(editor.getDocument());
      const current = page.elements.find((element) => element.id === id);
      if (current !== undefined) {
        const w = this.options.defaultWidth;
        const h = this.options.defaultHeight;
        let next: Element = {
          ...current,
          x: start.x - w / 2,
          y: start.y - h / 2,
          width: w,
          height: h,
          updatedAt: Date.now(),
        };
        if (next.type === "line" || next.type === "arrow") {
          const points: readonly [Point, Point] = [
            { x: 0, y: h / 2 },
            { x: w, y: h / 2 },
          ];
          next = { ...next, points };
        }
        editor.dispatch(replaceElementsCommand([next], `Create ${this.label.toLowerCase()}`));
      }
    }
    editor.commitTransaction();
  }

  onPointerCancel(context: ToolContext): void {
    this.cancelGesture(context);
  }

  cancelGesture(context: ToolContext): void {
    const { editor } = context;
    // Roll back the in-progress creation, then drop the stale selection that
    // pointed at the now-removed element.
    if (
      this.createdId !== undefined &&
      editor.getSelection().selectedIds.includes(this.createdId)
    ) {
      editor.clearSelection();
    }
    this.startWorld = undefined;
    this.createdId = undefined;
    this.downScreen = undefined;
    editor.cancelTransaction();
  }
}

function resizeToPointer(
  start: Point,
  current: Point,
  modifiers: { readonly shiftKey: boolean; readonly altKey: boolean },
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  let x2 = current.x;
  let y2 = current.y;
  const x1 = start.x;
  const y1 = start.y;
  if (modifiers.shiftKey) {
    // Lock to a square, preserving drag direction.
    const size = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    x2 = x1 + Math.sign(x2 - x1 || 1) * size;
    y2 = y1 + Math.sign(y2 - y1 || 1) * size;
  }
  if (modifiers.altKey) {
    // Draw from the center: mirror the drag.
    const hw = Math.abs(x2 - x1);
    const hh = Math.abs(y2 - y1);
    return { x: x1 - hw, y: y1 - hh, width: hw * 2, height: hh * 2 };
  }
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

export function createRectangleTool(): Tool {
  return new BoxCreateTool({
    id: "rectangle",
    label: "Rectangle",
    defaultWidth: 160,
    defaultHeight: 110,
  });
}

export function createEllipseTool(): Tool {
  return new BoxCreateTool({
    id: "ellipse",
    label: "Ellipse",
    defaultWidth: 160,
    defaultHeight: 110,
  });
}

export function createDiamondTool(): Tool {
  return new BoxCreateTool({
    id: "diamond",
    label: "Diamond",
    defaultWidth: 160,
    defaultHeight: 110,
  });
}

export function createLineTool(): Tool {
  return new BoxCreateTool({ id: "line", label: "Line", defaultWidth: 140, defaultHeight: 0 });
}

export function createArrowTool(): Tool {
  return new BoxCreateTool({ id: "arrow", label: "Arrow", defaultWidth: 140, defaultHeight: 0 });
}

export function createFrameTool(): Tool {
  return new BoxCreateTool({ id: "frame", label: "Frame", defaultWidth: 480, defaultHeight: 270 });
}

interface DragModifiers {
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

/** World-space endpoints for line/arrow drags (axis lock + symmetry). */
function lineEndpoints(start: Point, current: Point, modifiers: DragModifiers): [Point, Point] {
  let end: Point = { x: current.x, y: current.y };
  if (modifiers.shiftKey) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    end = Math.abs(dx) >= Math.abs(dy) ? { x: end.x, y: start.y } : { x: start.x, y: end.y };
  }
  if (modifiers.altKey) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return [
      { x: start.x - dx, y: start.y - dy },
      { x: start.x + dx, y: start.y + dy },
    ];
  }
  return [start, end];
}
