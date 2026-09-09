/**
 * Segment/rect intersection predicates. Collinear overlaps are treated as
 * "no single point" (`undefined`) — callers needing overlap ranges use
 * bounds math instead.
 */
import type { Bounds, Point } from "@eraser/shared-types";
import { EPSILON } from "../epsilon.js";
import { cross, subtract } from "../primitives/point.js";

/** Sign of the cross product of `oa × ob` with epsilon dead-zone. */
function orientation(o: Point, a: Point, b: Point): number {
  const value = cross(subtract(a, o), subtract(b, o));
  if (Math.abs(value) <= EPSILON) return 0;
  return value > 0 ? 1 : -1;
}

function onSegment(p: Point, a: Point, b: Point): boolean {
  return (
    p.x >= Math.min(a.x, b.x) - EPSILON &&
    p.x <= Math.max(a.x, b.x) + EPSILON &&
    p.y >= Math.min(a.y, b.y) - EPSILON &&
    p.y <= Math.max(a.y, b.y) + EPSILON
  );
}

/**
 * Intersection point of segments `p1–p2` and `p3–p4`, or `undefined` when
 * they do not cross (parallel, collinear, or disjoint). Endpoint touches
 * count as intersections.
 */
export function segmentIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | undefined {
  const d1 = orientation(p3, p4, p1);
  const d2 = orientation(p3, p4, p2);
  const d3 = orientation(p1, p2, p3);
  const d4 = orientation(p1, p2, p4);

  if (d1 * d2 < 0 && d3 * d4 < 0) {
    const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (Math.abs(denom) <= EPSILON) return undefined;
    const pre = p1.x * p2.y - p1.y * p2.x;
    const post = p3.x * p4.y - p3.y * p4.x;
    return {
      x: (pre * (p3.x - p4.x) - (p1.x - p2.x) * post) / denom,
      y: (pre * (p3.y - p4.y) - (p1.y - p2.y) * post) / denom,
    };
  }

  // Collinear touching-endpoint cases.
  if (d1 === 0 && onSegment(p1, p3, p4)) return { ...p1 };
  if (d2 === 0 && onSegment(p2, p3, p4)) return { ...p2 };
  if (d3 === 0 && onSegment(p3, p1, p2)) return { ...p3 };
  if (d4 === 0 && onSegment(p4, p1, p2)) return { ...p4 };
  return undefined;
}

/**
 * Overlap of two bounds, or `undefined` when disjoint. Edge-touching counts
 * as intersecting (may produce a zero-area result, which is intentional for
 * culling).
 */
export function rectIntersection(a: Bounds, b: Bounds): Bounds | undefined {
  const minX = Math.max(a.minX, b.minX);
  const minY = Math.max(a.minY, b.minY);
  const maxX = Math.min(a.maxX, b.maxX);
  const maxY = Math.min(a.maxY, b.maxY);
  if (minX > maxX + EPSILON || minY > maxY + EPSILON) return undefined;
  return { minX, minY, maxX, maxY };
}

/** Alias kept for the intersection vocabulary (`lineIntersection`). */
export { lineIntersection } from "../primitives/line.js";
