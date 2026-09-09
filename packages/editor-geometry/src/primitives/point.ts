/**
 * Pure 2D point/vector arithmetic. All functions are side-effect free and
 * allocate fresh objects (no mutation of inputs).
 */
import type { Point, Vector } from "@eraser/shared-types";
import { approxEquals, EPSILON } from "../epsilon.js";

/** Create a point. Defaults to the origin. */
export function createPoint(x = 0, y = 0): Point {
  return { x, y };
}

/** Component-wise addition. */
export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Component-wise subtraction (`a - b`). */
export function subtract(a: Point, b: Point): Vector {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Scale a vector by a scalar. */
export function scale(v: Vector, s: number): Vector {
  return { x: v.x * s, y: v.y * s };
}

/** Translate a point by `(dx, dy)`. */
export function translatePoint(p: Point, dx: number, dy: number): Point {
  return { x: p.x + dx, y: p.y + dy };
}

/** Dot product. */
export function dot(a: Vector, b: Vector): number {
  return a.x * b.x + a.y * b.y;
}

/** 2D cross product (scalar `a.x * b.y - a.y * b.x`). */
export function cross(a: Vector, b: Vector): number {
  return a.x * b.y - a.y * b.x;
}

/** Squared length (cheaper than {@link length} when only comparing). */
export function lengthSquared(v: Vector): number {
  return v.x * v.x + v.y * v.y;
}

/** Euclidean length. */
export function length(v: Vector): number {
  return Math.sqrt(lengthSquared(v));
}

/** Euclidean distance between two points. */
export function distance(a: Point, b: Point): number {
  return length(subtract(a, b));
}

/** Squared distance (cheaper than {@link distance} when only comparing). */
export function distanceSquared(a: Point, b: Point): number {
  return lengthSquared(subtract(a, b));
}

/**
 * Unit vector in the direction of `v`.
 * The zero vector normalizes to itself (avoids `NaN` on degenerate input).
 */
export function normalize(v: Vector): Vector {
  const len = length(v);
  if (len <= EPSILON) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/** Linear interpolation between `a` and `b` (`t = 0` → `a`, `t = 1` → `b`). */
export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Midpoint of `a` and `b`. */
export function midpoint(a: Point, b: Point): Point {
  return lerp(a, b, 0.5);
}

/**
 * Rotate `p` around `origin` by `angleRad` radians (counter-clockwise in a
 * standard math frame; on screen — y down — this appears clockwise).
 */
export function rotatePoint(p: Point, angleRad: number, origin: Point = createPoint()): Point {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

/** Component-wise approximate equality. */
export function pointsEqual(a: Point, b: Point, epsilon: number = EPSILON): boolean {
  return approxEquals(a.x, b.x, epsilon) && approxEquals(a.y, b.y, epsilon);
}

/** Angle of a vector in radians (`atan2`), `0` for the zero vector. */
export function angleOf(v: Vector): number {
  if (lengthSquared(v) <= EPSILON * EPSILON) return 0;
  return Math.atan2(v.y, v.x);
}

/** Vector of `vecLength` pointing at `angleRad`. */
export function vectorFromAngle(angleRad: number, vecLength = 1): Vector {
  return { x: Math.cos(angleRad) * vecLength, y: Math.sin(angleRad) * vecLength };
}
