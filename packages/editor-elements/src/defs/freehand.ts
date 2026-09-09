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
import type { FreehandElement } from "../types.js";
import { createFreehand } from "../factories.js";
import { boxBounds } from "./box.js";

export const freehandDefinition: ElementDefinition<FreehandElement> = {
  type: "freehand",
  create: (input) => createFreehand(input),
  getBounds: (element): Bounds => boxBounds(element),
  getResizeHandleIds: (_element): readonly ResizeHandleId[] => RESIZE_HANDLE_IDS,
  getDefaultStyle: () => getDefaultStyle(),
  containsPoint: (element, point: Point, tolerance: number = DEFAULT_HIT_TOLERANCE): boolean =>
    pointNearPolyline(toLocalPoint(element, point), element.points, tolerance),
  distanceToPoint: (element, point: Point): number => {
    const local = toLocalPoint(element, point);
    if (element.points.length === 0) return Number.POSITIVE_INFINITY;
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i + 1 < element.points.length; i += 1) {
      const a = element.points[i];
      const b = element.points[i + 1];
      if (a === undefined || b === undefined) continue;
      best = Math.min(best, distancePointToSegment(local, { a, b }));
    }
    if (element.points.length === 1) {
      const only = element.points[0];
      if (only !== undefined) {
        const dx = local.x - only.x;
        const dy = local.y - only.y;
        best = Math.sqrt(dx * dx + dy * dy);
      }
    }
    return best;
  },
};
