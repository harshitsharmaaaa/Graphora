/**
 * Shared gesture thresholds. One definition so every tool agrees on what a
 * "click" (vs a drag) is, in screen pixels.
 */
import type { Point } from "@eraser/shared-types";

/** Maximum pointer travel that still counts as a click. */
export const CLICK_SLOP_PX = 4;

/** True when the pointer barely moved between down and up. */
export function isClickGesture(
  downScreen: Point,
  upScreen: Point,
  slopPx: number = CLICK_SLOP_PX,
): boolean {
  return Math.hypot(upScreen.x - downScreen.x, upScreen.y - downScreen.y) <= slopPx;
}
