/**
 * Viewport culling: which elements intersect the visible world rect.
 * Pure function over element bounds — the `SpatialIndex` in core can back
 * this later without changing the pipeline.
 */
import type { Bounds } from "@eraser/shared-types";
import { screenRectToWorld } from "@eraser/editor-core";
import { boundsIntersect } from "@eraser/editor-geometry";
import { defaultRegistry } from "@eraser/editor-elements";
import type { CameraState } from "@eraser/editor-core";
import type { Element } from "@eraser/editor-elements";
import type { Viewport } from "../renderer/types.js";

/** World-space rect currently visible (plus `margin` screen pixels each side). */
export function visibleWorldBounds(camera: CameraState, viewport: Viewport, margin = 100): Bounds {
  const bounds = screenRectToWorld(
    { x: -margin, y: -margin, w: viewport.width + margin * 2, h: viewport.height + margin * 2 },
    camera,
    viewport,
  );
  return bounds;
}

/** Elements intersecting the viewport (order preserved for z-sorting later). */
export function getVisibleElements(
  elements: readonly Element[],
  camera: CameraState,
  viewport: Viewport,
  margin = 100,
): Element[] {
  const visible = visibleWorldBounds(camera, viewport, margin);
  return elements.filter((element) => boundsIntersect(defaultRegistry.getBounds(element), visible));
}
