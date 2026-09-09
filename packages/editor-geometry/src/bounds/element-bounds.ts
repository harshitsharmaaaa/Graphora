/**
 * Rotated-bounds math: corners of transformed rects and their axis-aligned
 * hulls. Used by selection bounds, culling, and resize anchoring.
 */
import type { Bounds, Point, Rect } from "@eraser/shared-types";
import { degToRad } from "../transforms/rotation.js";
import { rotatePoint } from "../primitives/point.js";
import { boundsOfPoints } from "../primitives/polygon.js";
import { rectToBounds } from "../primitives/rect.js";

/** Center of a rect. */
export function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

/** Four corners of an axis-aligned rect (clockwise from top-left). */
export function getRectCorners(rect: Rect): [Point, Point, Point, Point] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x + rect.w, y: rect.y + rect.h },
    { x: rect.x, y: rect.y + rect.h },
  ];
}

/** Corners of a rect rotated `rotationDeg` about its center. */
export function getRotatedCorners(rect: Rect, rotationDeg: number): [Point, Point, Point, Point] {
  const center = rectCenter(rect);
  const angle = degToRad(rotationDeg);
  const [a, b, c, d] = getRectCorners(rect);
  return [
    rotatePoint(a, angle, center),
    rotatePoint(b, angle, center),
    rotatePoint(c, angle, center),
    rotatePoint(d, angle, center),
  ];
}

/**
 * Axis-aligned hull of a (possibly rotated) rect. Falls back to the plain
 * rect bounds for empty input — never `undefined` for a valid rect.
 */
export function getRotatedBounds(rect: Rect, rotationDeg: number): Bounds {
  const corners = getRotatedCorners(rect, rotationDeg);
  return boundsOfPoints(corners) ?? rectToBounds(rect);
}
