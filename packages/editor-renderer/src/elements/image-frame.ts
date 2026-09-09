import type { FrameElement, ImageElement } from "@eraser/editor-elements";
import {
  FRAME_BORDER,
  FRAME_FILL,
  FRAME_LABEL,
  PLACEHOLDER_BORDER,
  PLACEHOLDER_TEXT,
} from "../theme.js";
import { dashForStrokeStyle, inElementFrame } from "./common.js";
import type { DrawContext } from "./common.js";

export function drawImage(context: DrawContext, element: ImageElement): void {
  inElementFrame(context, element, () => {
    const { ctx, imageResolver } = context;
    const bitmap = imageResolver?.(element.assetId);
    if (bitmap !== undefined) {
      ctx.drawImage(bitmap, 0, 0, Math.max(0, element.width), Math.max(0, element.height));
      return;
    }
    // Unresolved asset: dashed placeholder (never blank confusion).
    ctx.beginPath();
    ctx.rect(0, 0, element.width, element.height);
    ctx.strokeStyle = PLACEHOLDER_BORDER;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillStyle = PLACEHOLDER_TEXT;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText("Image", element.width / 2, element.height / 2);
  });
}

export function drawFrame(context: DrawContext, element: FrameElement): void {
  inElementFrame(context, element, () => {
    const { ctx } = context;
    ctx.beginPath();
    ctx.rect(0, 0, element.width, element.height);
    ctx.fillStyle =
      element.backgroundColor === "transparent" ? FRAME_FILL : element.backgroundColor;
    ctx.fill();
    ctx.strokeStyle = FRAME_BORDER;
    ctx.lineWidth = 1.5;
    ctx.setLineDash(dashForStrokeStyle("dashed", 1.5));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "600 12px Inter, system-ui, sans-serif";
    ctx.fillStyle = FRAME_LABEL;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(element.name, 10, 8);
  });
}
