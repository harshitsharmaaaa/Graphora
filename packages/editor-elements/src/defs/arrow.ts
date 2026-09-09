import type { Bounds, Point } from "@eraser/shared-types";
import {
  RESIZE_HANDLE_IDS,
  distancePointToSegment,
  normalize,
  pointInPolygon,
  subtract,
} from "@eraser/editor-geometry";
import type { ResizeHandleId } from "@eraser/editor-geometry";
import { DEFAULT_HIT_TOLERANCE, getDefaultStyle } from "../defaults.js";
import { toLocalPoint } from "../frame.js";
import type { ElementDefinition } from "../registry.js";
import type { ArrowElement, ArrowheadKind } from "../types.js";
import { createArrow } from "../factories.js";
import { boxBounds } from "./box.js";
import { distanceToLineBody } from "./line.js";

/** Local-frame triangles for rendered arrowheads (shared by hit + render). */
export interface ArrowheadTriangles {
  readonly start?: readonly [Point, Point, Point] | undefined;
  readonly end?: readonly [Point, Point, Point] | undefined;
}

function headTriangle(tip: Point, direction: Point, size: number): [Point, Point, Point] {
  const dir = normalize(direction);
  const baseX = tip.x - dir.x * size;
  const baseY = tip.y - dir.y * size;
  const half = size * 0.5;
  return [
    { ...tip },
    { x: baseX - dir.y * half, y: baseY + dir.x * half },
    { x: baseX + dir.y * half, y: baseY - dir.x * half },
  ];
}

/**
 * Arrowhead triangles in the element's local frame. Size scales with stroke
 * width so hit areas match what the renderer draws.
 */
export function getArrowheadTriangles(element: ArrowElement): ArrowheadTriangles {
  const [p0, p1] = element.points;
  const size = Math.max(10, element.strokeWidth * 4);
  const result: { start?: [Point, Point, Point]; end?: [Point, Point, Point] } = {};
  const wantStart: ArrowheadKind = element.startArrowhead;
  const wantEnd: ArrowheadKind = element.endArrowhead;
  if (wantStart === "triangle") result.start = headTriangle(p0, subtract(p0, p1), size);
  if (wantEnd === "triangle") result.end = headTriangle(p1, subtract(p1, p0), size);
  return result;
}

function headContains(triangles: ArrowheadTriangles, local: Point): boolean {
  if (triangles.start !== undefined && pointInPolygon(local, triangles.start)) return true;
  if (triangles.end !== undefined && pointInPolygon(local, triangles.end)) return true;
  return false;
}

export const arrowDefinition: ElementDefinition<ArrowElement> = {
  type: "arrow",
  create: (input) => createArrow(input),
  getBounds: (element): Bounds => boxBounds(element),
  getResizeHandleIds: (_element): readonly ResizeHandleId[] => RESIZE_HANDLE_IDS,
  getDefaultStyle: () => getDefaultStyle(),
  containsPoint: (element, point: Point, tolerance: number = DEFAULT_HIT_TOLERANCE): boolean => {
    const local = toLocalPoint(element, point);
    if (distanceToLineBody(element.points, local) <= tolerance) return true;
    return headContains(getArrowheadTriangles(element), local);
  },
  distanceToPoint: (element, point: Point): number => {
    const local = toLocalPoint(element, point);
    const body = distanceToLineBody(element.points, local);
    const triangles = getArrowheadTriangles(element);
    let head = Number.POSITIVE_INFINITY;
    const corners: readonly (readonly Point[] | undefined)[] = [triangles.start, triangles.end];
    for (const tri of corners) {
      if (tri === undefined) continue;
      for (let i = 0; i < tri.length; i += 1) {
        const a = tri[i];
        const b = tri[(i + 1) % tri.length];
        if (a === undefined || b === undefined) continue;
        head = Math.min(head, distancePointToSegment(local, { a, b }));
      }
    }
    return Math.min(body, head);
  },
};
