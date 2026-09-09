import type { Bounds, Point } from "@eraser/shared-types";
import { RESIZE_HANDLE_IDS } from "@eraser/editor-geometry";
import type { ResizeHandleId } from "@eraser/editor-geometry";
import { DEFAULT_HIT_TOLERANCE, getDefaultStyle } from "../defaults.js";
import type { ElementDefinition } from "../registry.js";
import type { ImageElement } from "../types.js";
import { createImage } from "../factories.js";
import { boxBounds, boxContains, boxDistance } from "./box.js";

export const imageDefinition: ElementDefinition<ImageElement> = {
  type: "image",
  create: (input) => createImage(input),
  getBounds: (element): Bounds => boxBounds(element),
  getResizeHandleIds: (_element): readonly ResizeHandleId[] => RESIZE_HANDLE_IDS,
  getDefaultStyle: () => getDefaultStyle(),
  containsPoint: (element, point: Point, tolerance: number = DEFAULT_HIT_TOLERANCE): boolean =>
    boxContains(element, point, tolerance),
  distanceToPoint: (element, point: Point): number => boxDistance(element, point),
};
