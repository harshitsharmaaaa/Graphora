/**
 * Axis-aligned resize math. Operates on normalized rects in the element's
 * *local* (unrotated) frame — callers convert pointer deltas into that frame
 * first, which is what keeps resize correct for rotated elements.
 */
import type { Rect, Vector } from "@eraser/shared-types";
import { EPSILON } from "../epsilon.js";
import { normalizeRect } from "../primitives/rect.js";
import type { ResizeHandleId } from "../handles.js";

/** Minimum width/height produced by a resize (prevents inversion/collapse). */
export const MIN_RESIZE_SIZE = 1;

export interface ResizeOptions {
  /** Shift: keep the original aspect ratio. */
  readonly preserveAspect?: boolean | undefined;
  /** Alt/Option: resize symmetrically about the center. */
  readonly fromCenter?: boolean | undefined;
  /** Lower bound for width/height. Defaults to {@link MIN_RESIZE_SIZE}. */
  readonly minSize?: number | undefined;
}

/**
 * Resize `rect` by dragging `handle` with local-frame `delta`.
 * Never returns negative sizes; aspect locking re-anchors to the edge (or
 * center) opposite the drag.
 */
export function resizeRect(
  rect: Rect,
  handle: ResizeHandleId,
  delta: Vector,
  options: ResizeOptions = {},
): Rect {
  const minSize = Math.max(EPSILON, options.minSize ?? MIN_RESIZE_SIZE);
  const base = normalizeRect(rect);
  const fromCenter = options.fromCenter === true;

  const movesLeft = handle.includes("left");
  const movesRight = handle.includes("right");
  const movesTop = handle.includes("top");
  const movesBottom = handle.includes("bottom");

  let { x, y } = base;
  let w = base.w;
  let h = base.h;

  const dx = fromCenter ? delta.x * 2 : delta.x;
  const dy = fromCenter ? delta.y * 2 : delta.y;

  if (movesLeft) {
    x += dx;
    w -= dx;
  }
  if (movesRight) w += dx;
  if (movesTop) {
    y += dy;
    h -= dy;
  }
  if (movesBottom) h += dy;

  if (fromCenter) {
    if (movesLeft || movesRight) x = base.x + base.w / 2 - w / 2;
    if (movesTop || movesBottom) y = base.y + base.h / 2 - h / 2;
  }

  // Clamp to the minimum size, pushing position back for left/top edges.
  if (w < minSize) {
    if (movesLeft && !movesRight) x -= minSize - w;
    if (fromCenter) x = base.x + base.w / 2 - minSize / 2;
    w = minSize;
  }
  if (h < minSize) {
    if (movesTop && !movesBottom) y -= minSize - h;
    if (fromCenter) y = base.y + base.h / 2 - minSize / 2;
    h = minSize;
  }

  if (options.preserveAspect === true && base.w > EPSILON && base.h > EPSILON) {
    const ratio = base.w / base.h;
    const scale = Math.max(w / base.w, h / base.h);
    const lockedW = Math.max(minSize, base.w * scale);
    const lockedH = Math.max(minSize, lockedW / ratio);
    const hasHorizontal = movesLeft || movesRight;
    const hasVertical = movesTop || movesBottom;
    const centerX = base.x + base.w / 2;
    const centerY = base.y + base.h / 2;
    // The edge opposite the drag stays fixed; pure edge drags and
    // center-resizes stay centered on the untouched axis.
    if (fromCenter || !hasHorizontal) {
      x = centerX - lockedW / 2;
    } else if (movesLeft && !movesRight) {
      x = base.x + base.w - lockedW;
    } else {
      x = base.x;
    }
    if (fromCenter || !hasVertical) {
      y = centerY - lockedH / 2;
    } else if (movesTop && !movesBottom) {
      y = base.y + base.h - lockedH;
    } else {
      y = base.y;
    }
    w = lockedW;
    h = lockedH;
  }

  return { x, y, w, h };
}
