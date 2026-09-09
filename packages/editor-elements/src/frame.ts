/**
 * Local-frame conversions. Point-based elements store geometry relative to
 * (`x`, `y`); `rotation` applies rigidly about the frame center. These
 * helpers are the only place that mapping lives.
 */
import type { Point } from "@eraser/shared-types";
import { rotatePointDeg } from "@eraser/editor-geometry";
import type { BaseElement } from "./types.js";

/** Center of the element's local frame (world units, unrotated). */
export function elementCenter(element: BaseElement): Point {
  return { x: element.x + element.width / 2, y: element.y + element.height / 2 };
}

/** World point → element-local point (unrotated, relative to `x`/`y`). */
export function toLocalPoint(element: BaseElement, world: Point): Point {
  const unrotated = rotatePointDeg(world, elementCenter(element), -element.rotation);
  return { x: unrotated.x - element.x, y: unrotated.y - element.y };
}

/** Element-local point → world point (rotation applied). */
export function toWorldPoint(element: BaseElement, local: Point): Point {
  const unrotated: Point = { x: element.x + local.x, y: element.y + local.y };
  return rotatePointDeg(unrotated, elementCenter(element), element.rotation);
}
