/**
 * Selection-handle layout in **screen space**. Pure rect math shared by the
 * renderer (drawing) and the tools (hit-testing) so both always agree.
 */
import type { Point, Rect } from "@eraser/shared-types";

/** The eight resize handles. */
export type ResizeHandleId =
  "top-left" | "top" | "top-right" | "right" | "bottom-right" | "bottom" | "bottom-left" | "left";

export const RESIZE_HANDLE_IDS: readonly ResizeHandleId[] = [
  "top-left",
  "top",
  "top-right",
  "right",
  "bottom-right",
  "bottom",
  "bottom-left",
  "left",
];

/** Default on-screen handle size (CSS pixels). */
export const DEFAULT_HANDLE_SIZE = 10;
/** Gap between the selection box and the rotation handle (CSS pixels). */
export const ROTATION_HANDLE_GAP = 28;

/** Center of a handle in screen space for an axis-aligned screen rect. */
export function getResizeHandlePosition(bounds: Rect, handle: ResizeHandleId): Point {
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const left = bounds.x;
  const right = bounds.x + bounds.w;
  const top = bounds.y;
  const bottom = bounds.y + bounds.h;
  switch (handle) {
    case "top-left":
      return { x: left, y: top };
    case "top":
      return { x: cx, y: top };
    case "top-right":
      return { x: right, y: top };
    case "right":
      return { x: right, y: cy };
    case "bottom-right":
      return { x: right, y: bottom };
    case "bottom":
      return { x: cx, y: bottom };
    case "bottom-left":
      return { x: left, y: bottom };
    case "left":
      return { x: left, y: cy };
  }
}

/** Position of the rotation handle (above top-center). */
export function getRotationHandlePosition(bounds: Rect, gap: number = ROTATION_HANDLE_GAP): Point {
  return { x: bounds.x + bounds.w / 2, y: bounds.y - gap };
}

/**
 * Hit-test resize handles. Corners win over edges when they overlap
 * (tiny selections), matching what the renderer draws on top.
 */
export function hitResizeHandle(
  point: Point,
  bounds: Rect,
  handleSize: number = DEFAULT_HANDLE_SIZE,
): ResizeHandleId | undefined {
  const half = handleSize / 2;
  const corners: readonly ResizeHandleId[] = [
    "top-left",
    "top-right",
    "bottom-right",
    "bottom-left",
  ];
  const edges: readonly ResizeHandleId[] = ["top", "right", "bottom", "left"];
  for (const group of [corners, edges]) {
    for (const id of group) {
      const center = getResizeHandlePosition(bounds, id);
      if (Math.abs(point.x - center.x) <= half && Math.abs(point.y - center.y) <= half) {
        return id;
      }
    }
  }
  return undefined;
}

/** True when `point` hits the rotation handle. */
export function hitRotationHandle(
  point: Point,
  bounds: Rect,
  handleSize: number = DEFAULT_HANDLE_SIZE,
  gap: number = ROTATION_HANDLE_GAP,
): boolean {
  const center = getRotationHandlePosition(bounds, gap);
  const half = handleSize / 2;
  return Math.abs(point.x - center.x) <= half && Math.abs(point.y - center.y) <= half;
}
