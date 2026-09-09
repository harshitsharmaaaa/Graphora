/**
 * Shared box-geometry helpers for frame-based element definitions.
 * "Frame-based" = hit area is the (possibly rotated) `x/y/width/height`
 * frame: rectangle, text, image, frame.
 */
import type { Bounds, Point } from "@eraser/shared-types";
import { getRotatedBounds, pointInRect } from "@eraser/editor-geometry";
import { toLocalPoint } from "../frame.js";
import type { BaseElement } from "../types.js";

/** Axis-aligned hull of the rotated frame. */
export function boxBounds(element: BaseElement): Bounds {
  return getRotatedBounds(
    { x: element.x, y: element.y, w: element.width, h: element.height },
    element.rotation,
  );
}

/** True when the world point lands in the rotated frame. */
export function boxContains(element: BaseElement, point: Point, tolerance = 0): boolean {
  const local = toLocalPoint(element, point);
  return pointInRect(local, { x: 0, y: 0, w: element.width, h: element.height }, tolerance);
}

/** Distance from the world point to the rotated frame (0 when inside). */
export function boxDistance(element: BaseElement, point: Point): number {
  if (boxContains(element, point, 0)) return 0;
  const hull = boxBounds(element);
  const dx = Math.max(hull.minX - point.x, 0, point.x - hull.maxX);
  const dy = Math.max(hull.minY - point.y, 0, point.y - hull.maxY);
  return Math.sqrt(dx * dx + dy * dy);
}
