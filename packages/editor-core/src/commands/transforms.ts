/**
 * Pure element transforms. Each function takes elements and returns new
 * element objects (never mutates); commands snapshot before/after for
 * history. Rotation-aware by construction: single-element resize runs in the
 * element's local frame, rotation re-derives point geometry in world space.
 */
import type { Point, Vector } from "@eraser/shared-types";
import {
  EPSILON,
  boundsCenter,
  boundsOfPoints,
  degToRad,
  normalizeAngleDeg,
  resizeRect,
  rotatePoint,
} from "@eraser/editor-geometry";
import type { Bounds, Rect } from "@eraser/shared-types";
import type { ResizeHandleId } from "@eraser/editor-geometry";
import { scaleArrowPoints, scaleFreehandPoints, scaleLinePoints } from "@eraser/editor-elements";
import type { Element } from "@eraser/editor-elements";

/** Translate an element by (`dx`, `dy`). Point geometry stays untouched. */
export function moveElement(element: Element, dx: number, dy: number): Element {
  return { ...element, x: element.x + dx, y: element.y + dy, updatedAt: Date.now() };
}

export interface ResizeArgs {
  readonly handle: ResizeHandleId;
  /** Drag delta in *world* units (tools convert from screen first). */
  readonly deltaWorld: Vector;
  readonly preserveAspect?: boolean;
  readonly fromCenter?: boolean;
}

/**
 * Resize a single element exactly: the world delta is pulled into the
 * element's local frame, `resizeRect` runs axis-aligned there, and
 * point-based kinds scale their local geometry about the same anchor
 * (opposite edge, or center). Rotation is preserved.
 */
export function resizeSingleElement(element: Element, args: ResizeArgs): Element {
  const now = Date.now();
  const inverse = degToRad(-element.rotation);
  const cos = Math.cos(inverse);
  const sin = Math.sin(inverse);
  const localDelta: Vector = {
    x: args.deltaWorld.x * cos - args.deltaWorld.y * sin,
    y: args.deltaWorld.x * sin + args.deltaWorld.y * cos,
  };
  const frame: Rect = { x: element.x, y: element.y, w: element.width, h: element.height };
  const resized = resizeRect(frame, args.handle, localDelta, {
    preserveAspect: args.preserveAspect,
    fromCenter: args.fromCenter,
  });
  const sx = element.width > EPSILON ? resized.w / element.width : 1;
  const sy = element.height > EPSILON ? resized.h / element.height : 1;
  const anchor = localResizeAnchor(element, args.handle, args.fromCenter ?? false);

  switch (element.type) {
    case "line": {
      const scaled = scaleLinePoints(element, sx, sy, anchor);
      return { ...scaled, updatedAt: now };
    }
    case "arrow": {
      const scaled = scaleArrowPoints(element, sx, sy, anchor);
      return { ...scaled, updatedAt: now };
    }
    case "freehand": {
      const scaled = scaleFreehandPoints(element, sx, sy, anchor);
      return { ...scaled, updatedAt: now };
    }
    case "rectangle":
    case "ellipse":
    case "diamond":
    case "text":
    case "image":
    case "frame":
      return {
        ...element,
        x: resized.x,
        y: resized.y,
        width: resized.w,
        height: resized.h,
        updatedAt: now,
      };
  }
}

/**
 * Local anchor mirroring `resizeRect`'s fixed edge: the corner/edge opposite
 * the drag, or the center for `fromCenter` and untouched axes.
 */
function localResizeAnchor(element: Element, handle: ResizeHandleId, fromCenter: boolean): Point {
  const hasHorizontal = handle.includes("left") || handle.includes("right");
  const hasVertical = handle.includes("top") || handle.includes("bottom");
  return {
    x:
      fromCenter || !hasHorizontal
        ? element.width / 2
        : handle.includes("left")
          ? element.width
          : 0,
    y:
      fromCenter || !hasVertical ? element.height / 2 : handle.includes("top") ? element.height : 0,
  };
}

export interface SelectionResizeArgs extends ResizeArgs {
  /** Axis-aligned selection hull the handle drag applies to. */
  readonly selectionBounds: Bounds;
}

/**
 * Resize every element about the selection anchor. Exact for unrotated
 * members; rotated members keep their angle while their frame scales about
 * the anchor (documented approximation — validity is always preserved).
 */
export function resizeSelectionElements(
  elements: readonly Element[],
  args: SelectionResizeArgs,
): Element[] {
  const now = Date.now();
  const sel: Rect = {
    x: args.selectionBounds.minX,
    y: args.selectionBounds.minY,
    w: Math.max(0, args.selectionBounds.maxX - args.selectionBounds.minX),
    h: Math.max(0, args.selectionBounds.maxY - args.selectionBounds.minY),
  };
  const resizedSel = resizeRect(sel, args.handle, args.deltaWorld, {
    preserveAspect: args.preserveAspect,
    fromCenter: args.fromCenter,
  });
  const sx = sel.w > EPSILON ? resizedSel.w / sel.w : 1;
  const sy = sel.h > EPSILON ? resizedSel.h / sel.h : 1;
  const anchor = selectionAnchor(sel, args.handle, args.fromCenter ?? false);

  return elements.map((element) => {
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    const newW = Math.max(EPSILON, element.width * sx);
    const newH = Math.max(EPSILON, element.height * sy);
    const framePatch = {
      x: anchor.x + (cx - anchor.x) * sx - newW / 2,
      y: anchor.y + (cy - anchor.y) * sy - newH / 2,
      width: newW,
      height: newH,
    };
    // Point kinds scale about the selection anchor mapped into the local
    // frame (exact for unrotated members); the synced frame is authoritative.
    const anchorLocal: Point = { x: anchor.x - element.x, y: anchor.y - element.y };
    if (element.type === "line") {
      const scaled = scaleLinePoints(element, sx, sy, anchorLocal);
      return { ...scaled, updatedAt: now };
    }
    if (element.type === "arrow") {
      const scaled = scaleArrowPoints(element, sx, sy, anchorLocal);
      return { ...scaled, updatedAt: now };
    }
    if (element.type === "freehand") {
      const scaled = scaleFreehandPoints(element, sx, sy, anchorLocal);
      return { ...scaled, updatedAt: now };
    }
    return { ...element, ...framePatch, updatedAt: now };
  });
}

function selectionAnchor(sel: Rect, handle: ResizeHandleId, fromCenter: boolean): Point {
  if (fromCenter) return { x: sel.x + sel.w / 2, y: sel.y + sel.h / 2 };
  return {
    x: handle.includes("left") ? sel.x + sel.w : sel.x,
    y: handle.includes("top") ? sel.y + sel.h : sel.y,
  };
}

/**
 * Rotate elements about `center` by `deltaDeg`. Positions orbit the center;
 * angles accumulate (normalized). Exact for every kind: point geometry is
 * re-derived in world space, so nothing drifts.
 */
export function rotateElementsAbout(
  elements: readonly Element[],
  center: Point,
  deltaDeg: number,
): Element[] {
  const now = Date.now();
  if (Math.abs(deltaDeg) <= EPSILON) return [...elements];
  return elements.map((element) => {
    const oldCenter: Point = {
      x: element.x + element.width / 2,
      y: element.y + element.height / 2,
    };
    const newCenter = rotatePoint(oldCenter, degToRad(deltaDeg), center);
    const positioned = {
      x: newCenter.x - element.width / 2,
      y: newCenter.y - element.height / 2,
      rotation: normalizeAngleDeg(element.rotation + deltaDeg),
    };
    if (element.type === "freehand") {
      const spun = spinWorldPoints(element, center, deltaDeg);
      const framed = frameSpunPoints(spun);
      if (framed === undefined) return { ...element, ...positioned, updatedAt: now };
      return {
        ...element,
        x: framed.origin.x,
        y: framed.origin.y,
        width: framed.width,
        height: framed.height,
        rotation: positioned.rotation,
        points: framed.points,
        updatedAt: now,
      };
    }
    if (element.type === "line" || element.type === "arrow") {
      const spun = spinWorldPoints(element, center, deltaDeg);
      const framed = frameSpunPoints(spun);
      if (framed === undefined) return { ...element, ...positioned, updatedAt: now };
      const first = framed.points[0];
      const second = framed.points[1];
      if (first === undefined || second === undefined) {
        return { ...element, ...positioned, updatedAt: now };
      }
      return {
        ...element,
        x: framed.origin.x,
        y: framed.origin.y,
        width: framed.width,
        height: framed.height,
        rotation: positioned.rotation,
        points: [first, second] as const,
        updatedAt: now,
      };
    }
    return { ...element, ...positioned, updatedAt: now };
  });
}

interface PointCarrier {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
  readonly points: readonly Point[];
}

/** Local points → world points under the element's current frame+rotation. */
function spinWorldPoints(element: PointCarrier, center: Point, deltaDeg: number): Point[] {
  const oldCenter: Point = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
  const baseRad = degToRad(element.rotation);
  const cos = Math.cos(baseRad);
  const sin = Math.sin(baseRad);
  return element.points.map((local) => {
    const unrotated: Point = { x: element.x + local.x, y: element.y + local.y };
    const world: Point = {
      x: oldCenter.x + (unrotated.x - oldCenter.x) * cos - (unrotated.y - oldCenter.y) * sin,
      y: oldCenter.y + (unrotated.x - oldCenter.x) * sin + (unrotated.y - oldCenter.y) * cos,
    };
    return rotatePoint(world, degToRad(deltaDeg), center);
  });
}

/**
 * Re-derive the local frame from rotated world points so the
 * min-corner/extents invariant holds after every rotation.
 */
function frameSpunPoints(spun: readonly Point[]):
  | {
      readonly origin: Point;
      readonly width: number;
      readonly height: number;
      readonly points: Point[];
    }
  | undefined {
  const bounds = boundsOfPoints(spun);
  if (bounds === undefined) return undefined;
  const origin: Point = { x: bounds.minX, y: bounds.minY };
  return {
    origin,
    width: Math.max(0, bounds.maxX - bounds.minX),
    height: Math.max(0, bounds.maxY - bounds.minY),
    points: spun.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y })),
  };
}

/** Center of a bounds (the standard rotate pivot). */
export function selectionPivot(bounds: Bounds): Point {
  return boundsCenter(bounds);
}

export interface FrameInput {
  readonly x?: number | undefined;
  readonly y?: number | undefined;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
  readonly rotation?: number | undefined;
}

/**
 * Set frame fields directly (inspector-style edits). Point-based kinds
 * scale about the local origin and are re-synced, so the frame invariant
 * holds; `rotation` applies on top and never rewrites points.
 */
export function setElementFrame(element: Element, frame: FrameInput): Element {
  const now = Date.now();
  const next = {
    x: frame.x ?? element.x,
    y: frame.y ?? element.y,
    width: Math.max(0, frame.width ?? element.width),
    height: Math.max(0, frame.height ?? element.height),
    rotation: frame.rotation ?? element.rotation,
  };
  if (element.type === "line" || element.type === "arrow" || element.type === "freehand") {
    const sx = element.width > EPSILON ? next.width / element.width : 1;
    const sy = element.height > EPSILON ? next.height / element.height : 1;
    const origin = { x: 0, y: 0 };
    if (element.type === "line") {
      const scaled = scaleLinePoints(element, sx, sy, origin);
      const shifted = shiftBy(scaled.points, next.x - scaled.x, next.y - scaled.y);
      const first = shifted[0];
      const second = shifted[1];
      if (first === undefined || second === undefined) {
        return { ...scaled, x: next.x, y: next.y, rotation: next.rotation, updatedAt: now };
      }
      return {
        ...scaled,
        x: next.x,
        y: next.y,
        rotation: next.rotation,
        points: [first, second] as const,
        updatedAt: now,
      };
    }
    if (element.type === "arrow") {
      const scaled = scaleArrowPoints(element, sx, sy, origin);
      const shifted = shiftBy(scaled.points, next.x - scaled.x, next.y - scaled.y);
      const first = shifted[0];
      const second = shifted[1];
      if (first === undefined || second === undefined) {
        return { ...scaled, x: next.x, y: next.y, rotation: next.rotation, updatedAt: now };
      }
      return {
        ...scaled,
        x: next.x,
        y: next.y,
        rotation: next.rotation,
        points: [first, second] as const,
        updatedAt: now,
      };
    }
    const scaled = scaleFreehandPoints(element, sx, sy, origin);
    return {
      ...scaled,
      x: next.x,
      y: next.y,
      rotation: next.rotation,
      points: shiftBy(scaled.points, next.x - scaled.x, next.y - scaled.y),
      updatedAt: now,
    };
  }
  return { ...element, ...next, updatedAt: now };
}

function shiftBy(points: readonly Point[], dx: number, dy: number): Point[] {
  return points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}
