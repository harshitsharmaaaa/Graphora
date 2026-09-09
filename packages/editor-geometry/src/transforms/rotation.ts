/**
 * Angle helpers. Documents use **degrees** (authoring-friendly); radians are
 * used internally by trig routines. Conversions are explicit at boundaries.
 */
import type { Point } from "@eraser/shared-types";
import { rotatePoint } from "../primitives/point.js";

export const DEGREES_PER_RADIAN = 180 / Math.PI;
export const RADIANS_PER_DEGREE = Math.PI / 180;

/** Default snap increment (degrees) while a modifier is held. */
export const DEFAULT_SNAP_INCREMENT_DEG = 15;

export function degToRad(degrees: number): number {
  return degrees * RADIANS_PER_DEGREE;
}

export function radToDeg(radians: number): number {
  return radians * DEGREES_PER_RADIAN;
}

/** Normalize to `[0, 360)`. */
export function normalizeAngleDeg(degrees: number): number {
  const wrapped = degrees % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/** Snap `degrees` to the nearest multiple of `incrementDeg` (normalizes `-0`). */
export function snapAngleDeg(
  degrees: number,
  incrementDeg: number = DEFAULT_SNAP_INCREMENT_DEG,
): number {
  if (incrementDeg <= 0) return degrees;
  const snapped = Math.round(degrees / incrementDeg) * incrementDeg;
  return snapped === 0 ? 0 : snapped;
}

/** Rotate `point` around `center` by `angleDeg` degrees. */
export function rotatePointDeg(point: Point, center: Point, angleDeg: number): Point {
  return rotatePoint(point, degToRad(angleDeg), center);
}
