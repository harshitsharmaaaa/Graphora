/**
 * Axis-aligned `Rect`/`Bounds` conversions and set operations.
 * All functions are pure and return fresh objects.
 */
import type { Bounds, Point, Rect, Size } from "@eraser/shared-types";
import { EPSILON } from "../epsilon.js";
import { boundsOfPoints } from "./polygon.js";

/** Normalize a rect so `w >= 0` and `h >= 0` (adjusts `x`/`y`). */
export function normalizeRect(rect: Rect): Rect {
  const x = rect.w < 0 ? rect.x + rect.w : rect.x;
  const y = rect.h < 0 ? rect.y + rect.h : rect.y;
  return { x, y, w: Math.abs(rect.w), h: Math.abs(rect.h) };
}

/** Convert `x/y/w/h` form to min/max form. */
export function rectToBounds(rect: Rect): Bounds {
  const n = normalizeRect(rect);
  return { minX: n.x, minY: n.y, maxX: n.x + n.w, maxY: n.y + n.h };
}

/** Convert min/max form to `x/y/w/h` form (normalizes inverted bounds). */
export function boundsToRect(bounds: Bounds): Rect {
  const minX = Math.min(bounds.minX, bounds.maxX);
  const minY = Math.min(bounds.minY, bounds.maxY);
  return {
    x: minX,
    y: minY,
    w: Math.abs(bounds.maxX - bounds.minX),
    h: Math.abs(bounds.maxY - bounds.minY),
  };
}

/** Smallest bounds containing both inputs. */
export function unionBounds(a: Bounds, b: Bounds): Bounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/** Smallest bounds containing every input, or `undefined` when empty. */
export function unionAllBounds(bounds: readonly Bounds[]): Bounds | undefined {
  let acc: Bounds | undefined;
  for (const b of bounds) {
    acc = acc === undefined ? b : unionBounds(acc, b);
  }
  return acc;
}

/** Center point of bounds. */
export function boundsCenter(bounds: Bounds): Point {
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
}

/** Size of bounds (never negative). */
export function boundsSize(bounds: Bounds): Size {
  return {
    w: Math.max(0, bounds.maxX - bounds.minX),
    h: Math.max(0, bounds.maxY - bounds.minY),
  };
}

/** Translate bounds by `(dx, dy)`. */
export function translateBounds(bounds: Bounds, dx: number, dy: number): Bounds {
  return {
    minX: bounds.minX + dx,
    minY: bounds.minY + dy,
    maxX: bounds.maxX + dx,
    maxY: bounds.maxY + dy,
  };
}

/** Expand (positive `amount`) or shrink (negative) bounds on all sides. */
export function inflateBounds(bounds: Bounds, amount: number): Bounds {
  return {
    minX: bounds.minX - amount,
    minY: bounds.minY - amount,
    maxX: bounds.maxX + amount,
    maxY: bounds.maxY + amount,
  };
}

/** True when `p` lies inside (or on the edge of) bounds, within `tolerance`. */
export function pointInBounds(p: Point, bounds: Bounds, tolerance = 0): boolean {
  return (
    p.x >= bounds.minX - tolerance &&
    p.x <= bounds.maxX + tolerance &&
    p.y >= bounds.minY - tolerance &&
    p.y <= bounds.maxY + tolerance
  );
}

/**
 * True when two bounds overlap. Edge-touching counts as intersecting
 * (a zero-area touch is still "visible" for culling purposes).
 */
export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/** Bounds of a rect's four corners (convenience for the render pipeline). */
export function boundsOfRect(rect: Rect): Bounds {
  return rectToBounds(rect);
}

/** Bounds of a point cloud with optional padding, or `undefined` if empty. */
export function boundsOfPointCloud(points: readonly Point[], padding = 0): Bounds | undefined {
  const raw = boundsOfPoints(points);
  if (raw === undefined) return undefined;
  return padding <= EPSILON ? raw : inflateBounds(raw, padding);
}
