import type { FrameElement, ImageElement } from "@eraser/editor-elements";
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
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#94a3b8";
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
    ctx.fillStyle = element.backgroundColor === "transparent" ? "#ffffff" : element.backgroundColor;
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;
    ctx.setLineDash(dashForStrokeStyle("dashed", 1.5));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "600 12px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(element.name, 10, 8);
  });
}
