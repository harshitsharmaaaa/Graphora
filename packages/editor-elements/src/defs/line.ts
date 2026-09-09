import type { Bounds, Point } from "@eraser/shared-types";
import {
  RESIZE_HANDLE_IDS,
  distancePointToSegment,
  pointNearPolyline,
} from "@eraser/editor-geometry";
import type { ResizeHandleId } from "@eraser/editor-geometry";
import { DEFAULT_HIT_TOLERANCE, getDefaultStyle } from "../defaults.js";
import { toLocalPoint } from "../frame.js";
import type { ElementDefinition } from "../registry.js";
import type { LineElement } from "../types.js";
import { createLine } from "../factories.js";
import { boxBounds } from "./box.js";

/** Minimum distance from a local-frame point to a two-point body. */
export function distanceToLineBody(points: readonly [Point, Point], local: Point): number {
  const [a, b] = points;
  return distancePointToSegment(local, { a, b });
}

export const lineDefinition: ElementDefinition<LineElement> = {
  type: "line",
  create: (input) => createLine(input),
  getBounds: (element): Bounds => boxBounds(element),
  getResizeHandleIds: (_element): readonly ResizeHandleId[] => RESIZE_HANDLE_IDS,
  getDefaultStyle: () => getDefaultStyle(),
  containsPoint: (element, point: Point, tolerance: number = DEFAULT_HIT_TOLERANCE): boolean =>
    pointNearPolyline(toLocalPoint(element, point), element.points, tolerance),
  distanceToPoint: (element, point: Point): number =>
    distanceToLineBody(element.points, toLocalPoint(element, point)),
};
