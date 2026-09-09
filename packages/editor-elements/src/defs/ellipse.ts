import type { Bounds, Point } from "@eraser/shared-types";
import { RESIZE_HANDLE_IDS, pointInEllipse } from "@eraser/editor-geometry";
import type { ResizeHandleId } from "@eraser/editor-geometry";
import { DEFAULT_HIT_TOLERANCE, getDefaultStyle } from "../defaults.js";
import { toLocalPoint } from "../frame.js";
import type { ElementDefinition } from "../registry.js";
import type { EllipseElement } from "../types.js";
import { createEllipse } from "../factories.js";
import { boxBounds, boxDistance } from "./box.js";

export const ellipseDefinition: ElementDefinition<EllipseElement> = {
  type: "ellipse",
  create: (input) => createEllipse(input),
  getBounds: (element): Bounds => boxBounds(element),
  getResizeHandleIds: (_element): readonly ResizeHandleId[] => RESIZE_HANDLE_IDS,
  getDefaultStyle: () => getDefaultStyle(),
  containsPoint: (element, point: Point, tolerance: number = DEFAULT_HIT_TOLERANCE): boolean => {
    const local = toLocalPoint(element, point);
    return pointInEllipse(
      local,
      { x: element.width / 2, y: element.height / 2 },
      element.width / 2,
      element.height / 2,
      tolerance,
    );
  },
  distanceToPoint: (element, point: Point): number => boxDistance(element, point),
};
