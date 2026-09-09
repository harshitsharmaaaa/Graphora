/**
 * Infinite-line operations. Lines are used for intersection math; bounded
 * tests live in `segment.ts` and `intersections/`.
 */
import type { Point, Vector } from "@eraser/shared-types";
import { EPSILON } from "../epsilon.js";
import { lengthSquared, subtract } from "./point.js";

/** An infinite line through `point` along `direction`. */
export interface Line {
  readonly point: Point;
  readonly direction: Vector;
}

/**
 * Line through `a` and `b`, or `undefined` when the points coincide
 * (no unique line exists).
 */
export function lineFromPoints(a: Point, b: Point): Line | undefined {
  const direction = subtract(b, a);
  if (lengthSquared(direction) <= EPSILON * EPSILON) return undefined;
  return { point: { ...a }, direction };
}

/**
 * Intersection of two infinite lines, or `undefined` when parallel
 * (including coincident lines — treated as "no single point").
 */
export function lineIntersection(l1: Line, l2: Line): Point | undefined {
  const denom = l1.direction.x * l2.direction.y - l1.direction.y * l2.direction.x;
  if (Math.abs(denom) <= EPSILON) return undefined;
  const dx = l2.point.x - l1.point.x;
  const dy = l2.point.y - l1.point.y;
  const t = (dx * l2.direction.y - dy * l2.direction.x) / denom;
  return {
    x: l1.point.x + l1.direction.x * t,
    y: l1.point.y + l1.direction.y * t,
  };
}
