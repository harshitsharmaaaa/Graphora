/**
 * Shape-containment predicates used by hit-testing. Each takes an explicit
 * `tolerance` (world units) so strokes stay hittable without fill.
 */
import type { Point, Rect } from "@eraser/shared-types";
import { EPSILON } from "../epsilon.js";
import { distance } from "../primitives/point.js";
import { normalizeRect } from "../primitives/rect.js";
import { distancePointToSegment } from "../primitives/segment.js";

/** True when `p` is inside the rect (edges inclusive), within `tolerance`. */
export function pointInRect(p: Point, rect: Rect, tolerance = 0): boolean {
  const n = normalizeRect(rect);
  return (
    p.x >= n.x - tolerance &&
    p.x <= n.x + n.w + tolerance &&
    p.y >= n.y - tolerance &&
    p.y <= n.y + n.h + tolerance
  );
}

/**
 * True when `p` is inside the ellipse centered at `center` with radii
 * `(rx, ry)`. Degenerate radii collapse to point/line tests instead of
 * dividing by zero.
 */
export function pointInEllipse(
  p: Point,
  center: Point,
  rx: number,
  ry: number,
  tolerance = 0,
): boolean {
  const dx = Math.abs(p.x - center.x);
  const dy = Math.abs(p.y - center.y);
  const ex = Math.max(0, rx) + tolerance;
  const ey = Math.max(0, ry) + tolerance;
  if (ex <= EPSILON && ey <= EPSILON) return distance(p, center) <= tolerance;
  if (ex <= EPSILON) return dx <= tolerance && dy <= ey;
  if (ey <= EPSILON) return dy <= tolerance && dx <= ex;
  const nx = dx / ex;
  const ny = dy / ey;
  return nx * nx + ny * ny <= 1;
}

/**
 * True when `p` is inside the diamond centered at `center` with half-extents
 * `(halfW, halfH)` (`|dx|/hw + |dy|/hh <= 1`). Degenerate extents collapse
 * like the ellipse variant.
 */
export function pointInDiamond(
  p: Point,
  center: Point,
  halfW: number,
  halfH: number,
  tolerance = 0,
): boolean {
  const dx = Math.abs(p.x - center.x);
  const dy = Math.abs(p.y - center.y);
  const hw = Math.max(0, halfW) + tolerance;
  const hh = Math.max(0, halfH) + tolerance;
  if (hw <= EPSILON && hh <= EPSILON) return distance(p, center) <= tolerance;
  if (hw <= EPSILON) return dx <= tolerance && dy <= hh;
  if (hh <= EPSILON) return dy <= tolerance && dx <= hw;
  return dx / hw + dy / hh <= 1;
}

/** True when `p` is within `tolerance` of any segment of the polyline. */
export function pointNearPolyline(p: Point, points: readonly Point[], tolerance: number): boolean {
  if (points.length === 0) return false;
  if (points.length === 1) {
    const only = points[0];
    return only !== undefined && distance(p, only) <= tolerance;
  }
  for (let i = 0; i + 1 < points.length; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a === undefined || b === undefined) continue;
    if (distancePointToSegment(p, { a, b }) <= tolerance) return true;
  }
  return false;
}
