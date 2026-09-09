/**
 * Floating-point tolerance used across all geometry routines.
 *
 * World coordinates are doubles; exact `===` comparisons on computed values
 * (rotations, intersections) are meaningless. Every geometric predicate in
 * this package funnels through {@link approxEquals} or an explicit epsilon.
 */
export const EPSILON = 1e-9;

/** True when `a` and `b` differ by at most `epsilon`. */
export function approxEquals(a: number, b: number, epsilon: number = EPSILON): boolean {
  return Math.abs(a - b) <= epsilon;
}

/** Clamp `value` into `[min, max]`. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** True for finite numbers (guards against `NaN`/`Infinity` inputs). */
export function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}
