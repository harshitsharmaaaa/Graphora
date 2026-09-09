import type { Bounds, Point } from "@eraser/shared-types";
import { RESIZE_HANDLE_IDS } from "@eraser/editor-geometry";
import type { ResizeHandleId } from "@eraser/editor-geometry";
import { DEFAULT_HIT_TOLERANCE, getDefaultStyle } from "../defaults.js";
import type { ElementDefinition } from "../registry.js";
import type { RectangleElement } from "../types.js";
import { createRectangle } from "../factories.js";
import { boxBounds, boxContains, boxDistance } from "./box.js";

export const rectangleDefinition: ElementDefinition<RectangleElement> = {
  type: "rectangle",
  create: (input) => createRectangle(input),
  getBounds: (element): Bounds => boxBounds(element),
  getResizeHandleIds: (_element): readonly ResizeHandleId[] => RESIZE_HANDLE_IDS,
  getDefaultStyle: () => getDefaultStyle(),
  containsPoint: (element, point: Point, tolerance: number = DEFAULT_HIT_TOLERANCE): boolean =>
    boxContains(element, point, tolerance),
  distanceToPoint: (element, point: Point): number => boxDistance(element, point),
};
