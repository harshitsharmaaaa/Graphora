/**
 * Bounded segment operations. Degenerate (zero-length) segments are treated
 * as points rather than rejected, so callers never branch on validity.
 */
import type { Point } from "@eraser/shared-types";
import { EPSILON } from "../epsilon.js";
import { distance, lerp, lengthSquared, subtract } from "./point.js";

/** A bounded segment between two endpoints. */
export interface Segment {
  readonly a: Point;
  readonly b: Point;
}

/** True when both endpoints coincide (within epsilon). */
export function isDegenerateSegment(segment: Segment): boolean {
  return distance(segment.a, segment.b) <= EPSILON;
}

/**
 * Closest point on the segment to `p`. For degenerate segments this is the
 * shared endpoint (no `NaN`, no branching at call sites).
 */
export function closestPointOnSegment(p: Point, segment: Segment): Point {
  const ab = subtract(segment.b, segment.a);
  const denom = lengthSquared(ab);
  if (denom <= EPSILON * EPSILON) return { ...segment.a };
  const t = ((p.x - segment.a.x) * ab.x + (p.y - segment.a.y) * ab.y) / denom;
  const clamped = Math.min(1, Math.max(0, t));
  return lerp(segment.a, segment.b, clamped);
}

/** Shortest distance from `p` to the segment. */
export function distancePointToSegment(p: Point, segment: Segment): number {
  return distance(p, closestPointOnSegment(p, segment));
}
