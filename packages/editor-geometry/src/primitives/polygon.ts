/**
 * Polygon helpers (ray-cast containment, bounds). Polygons are open point
 * rings — the closing edge (last → first) is implied.
 */
import type { Bounds, Point } from "@eraser/shared-types";
import { EPSILON } from "../epsilon.js";
import { distancePointToSegment } from "./segment.js";

/** Bounds of a point ring, or `undefined` when the ring is empty. */
export function boundsOfPoints(points: readonly Point[]): Bounds | undefined {
  let acc: Bounds | undefined;
  for (const p of points) {
    acc =
      acc === undefined
        ? { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y }
        : {
            minX: Math.min(acc.minX, p.x),
            minY: Math.min(acc.minY, p.y),
            maxX: Math.max(acc.maxX, p.x),
            maxY: Math.max(acc.maxY, p.y),
          };
  }
  return acc;
}

/**
 * Ray-cast point-in-polygon test. Points lying on an edge (within epsilon)
 * count as inside so strokes with zero fill remain hittable.
 */
export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  const n = polygon.length;
  if (n < 3) return false;
  // On-edge fast path (also covers degenerate rings gracefully).
  for (let i = 0; i < n; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    if (a === undefined || b === undefined) continue;
    if (distancePointToSegment(point, { a, b }) <= EPSILON) return true;
  }
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
    const pi = polygon[i];
    const pj = polygon[j];
    if (pi === undefined || pj === undefined) continue;
    const crosses =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Alias kept for the hit-testing vocabulary (`polygonBounds`). */
export function polygonBounds(polygon: readonly Point[]): Bounds | undefined {
  return boundsOfPoints(polygon);
}
