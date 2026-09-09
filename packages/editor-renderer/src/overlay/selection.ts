/**
 * Selection + marquee overlays drawn in screen space (after the world pass).
 * Handle layout comes from `@eraser/editor-geometry` so tools hit-test
 * exactly what is drawn here.
 */
import type { Rect } from "@eraser/shared-types";
import {
  DEFAULT_HANDLE_SIZE,
  ROTATION_HANDLE_GAP,
  getResizeHandlePosition,
  getRotationHandlePosition,
} from "@eraser/editor-geometry";
import type { ResizeHandleId } from "@eraser/editor-geometry";
import { RESIZE_HANDLE_IDS } from "@eraser/editor-geometry";
import { MARQUEE_FILL, SELECTION_COLOR } from "../theme.js";

export { SELECTION_COLOR };

export interface OverlayTheme {
  readonly selectionColor: string;
  readonly handleSize: number;
}

/** Draw the selection box, eight handles, and the rotation handle. */
export function drawSelectionOverlay(
  ctx: CanvasRenderingContext2D,
  screenBounds: Rect,
  theme: OverlayTheme = { selectionColor: SELECTION_COLOR, handleSize: DEFAULT_HANDLE_SIZE },
): void {
  const { selectionColor, handleSize } = theme;
  const half = handleSize / 2;
  ctx.save();
  ctx.strokeStyle = selectionColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(screenBounds.x, screenBounds.y, screenBounds.w, screenBounds.h);

  // Connector + rotation handle.
  const rotation = getRotationHandlePosition(screenBounds, ROTATION_HANDLE_GAP);
  ctx.beginPath();
  ctx.moveTo(screenBounds.x + screenBounds.w / 2, screenBounds.y);
  ctx.lineTo(rotation.x, rotation.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rotation.x, rotation.y, half, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.stroke();

  // Resize handles.
  const corners: readonly ResizeHandleId[] = [
    "top-left",
    "top-right",
    "bottom-right",
    "bottom-left",
  ];
  const drawHandle = (id: ResizeHandleId): void => {
    const center = getResizeHandlePosition(screenBounds, id);
    ctx.beginPath();
    ctx.rect(center.x - half, center.y - half, handleSize, handleSize);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.stroke();
  };
  for (const id of corners) drawHandle(id);
  for (const id of RESIZE_HANDLE_IDS) {
    if (!corners.includes(id)) drawHandle(id);
  }
  ctx.restore();
}

/** Draw the drag marquee (screen-space rect). */
export function drawMarqueeOverlay(ctx: CanvasRenderingContext2D, screenRect: Rect): void {
  ctx.save();
  ctx.fillStyle = MARQUEE_FILL;
  ctx.fillRect(screenRect.x, screenRect.y, screenRect.w, screenRect.h);
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = 1;
  ctx.strokeRect(screenRect.x, screenRect.y, screenRect.w, screenRect.h);
  ctx.restore();
}
