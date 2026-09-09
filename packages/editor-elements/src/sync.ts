/**
 * Derived-bounds sync for point-based elements. Enforces the invariant:
 * (`x`, `y`) is the local-frame min corner and (`width`, `height`) are the
 * extents, with `points` shifted so the min corner sits at (0, 0).
 * Pure — returns new elements. Concrete overloads (no generics) keep the
 * discriminated union exact at every call site.
 */
import type { Point } from "@eraser/shared-types";
import { boundsOfPoints } from "@eraser/editor-geometry";
import type { ArrowElement, FreehandElement, LineElement } from "./types.js";

interface LineFrame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly points: readonly [Point, Point];
}

function safePoint(points: readonly Point[], index: number): Point {
  return points[index] ?? { x: 0, y: 0 };
}

function lineFrameFor(
  points: readonly [Point, Point],
  originX: number,
  originY: number,
): LineFrame {
  const bounds = boundsOfPoints(points);
  if (bounds === undefined) {
    return { x: originX, y: originY, width: 0, height: 0, points };
  }
  const [p0, p1] = [safePoint(points, 0), safePoint(points, 1)];
  return {
    x: originX + bounds.minX,
    y: originY + bounds.minY,
    width: Math.max(0, bounds.maxX - bounds.minX),
    height: Math.max(0, bounds.maxY - bounds.minY),
    points: [
      { x: p0.x - bounds.minX, y: p0.y - bounds.minY },
      { x: p1.x - bounds.minX, y: p1.y - bounds.minY },
    ],
  };
}

/** Normalize a line so its frame wraps the endpoints. */
export function syncLineBounds(element: LineElement): LineElement {
  return { ...element, ...lineFrameFor(element.points, element.x, element.y) };
}

/** Normalize an arrow so its frame wraps the endpoints. */
export function syncArrowBounds(element: ArrowElement): ArrowElement {
  return { ...element, ...lineFrameFor(element.points, element.x, element.y) };
}

/** Normalize a freehand stroke so its frame wraps the points. */
export function syncFreehandBounds(element: FreehandElement): FreehandElement {
  const bounds = boundsOfPoints(element.points);
  if (bounds === undefined) return { ...element, width: 0, height: 0 };
  return {
    ...element,
    x: element.x + bounds.minX,
    y: element.y + bounds.minY,
    width: Math.max(0, bounds.maxX - bounds.minX),
    height: Math.max(0, bounds.maxY - bounds.minY),
    points: element.points.map((p) => ({ x: p.x - bounds.minX, y: p.y - bounds.minY })),
  };
}

function scaleTuple(
  points: readonly [Point, Point],
  sx: number,
  sy: number,
  anchor: Point,
): readonly [Point, Point] {
  const kx = Number.isFinite(sx) ? sx : 1;
  const ky = Number.isFinite(sy) ? sy : 1;
  const [p0, p1] = [safePoint(points, 0), safePoint(points, 1)];
  const map = (p: Point): Point => ({
    x: anchor.x + (p.x - anchor.x) * kx,
    y: anchor.y + (p.y - anchor.y) * ky,
  });
  return [map(p0), map(p1)];
}

/**
 * Scale local points about the local origin (used by resize; near-zero
 * extents are the caller's concern — see `resizeElementPoints` in core).
 */
export function scaleLinePoints(
  element: LineElement,
  sx: number,
  sy: number,
  anchor: Point = { x: 0, y: 0 },
): LineElement {
  return syncLineBounds({ ...element, points: scaleTuple(element.points, sx, sy, anchor) });
}

/** Scale an arrow's local points about an anchor. */
export function scaleArrowPoints(
  element: ArrowElement,
  sx: number,
  sy: number,
  anchor: Point = { x: 0, y: 0 },
): ArrowElement {
  return syncArrowBounds({ ...element, points: scaleTuple(element.points, sx, sy, anchor) });
}

/** Scale a freehand stroke's local points about an anchor. */
export function scaleFreehandPoints(
  element: FreehandElement,
  sx: number,
  sy: number,
  anchor: Point = { x: 0, y: 0 },
): FreehandElement {
  const kx = Number.isFinite(sx) ? sx : 1;
  const ky = Number.isFinite(sy) ? sy : 1;
  return syncFreehandBounds({
    ...element,
    points: element.points.map((p) => ({
      x: anchor.x + (p.x - anchor.x) * kx,
      y: anchor.y + (p.y - anchor.y) * ky,
    })),
  });
}
