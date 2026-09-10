import type { RectangleElement } from "@eraser/editor-elements";
import { fillAndStroke, inElementFrame, roughStyleFor } from "./common.js";
import type { DrawContext } from "./common.js";

export function drawRectangle(context: DrawContext, element: RectangleElement): void {
  inElementFrame(context, element, () => {
    const { ctx, roughCanvas, generator } = context;
    const { width: w, height: h, roughness, roundness } = element;
    if (roughness > 0) {
      const { stroke, strokeWidth, fill, fillStyle, seed, strokeLineDash } = roughStyleFor(element);
      roughCanvas.draw(
        generator.rectangle(0, 0, Math.max(0, w), Math.max(0, h), {
          stroke,
          strokeWidth,
          ...(fill === undefined ? {} : { fill, ...(fillStyle === undefined ? {} : { fillStyle }) }),
          roughness,
          seed,
          ...(strokeLineDash === undefined ? {} : { strokeLineDash: [...strokeLineDash] }),
        }),
      );
      return;
    }
    const radius = Math.min(roundness * Math.min(w, h), Math.min(w, h) / 2);
    fillAndStroke(ctx, element, () => {
      if (radius > 0 && typeof ctx.roundRect === "function") {
        ctx.roundRect(0, 0, w, h, radius);
      } else {
        ctx.rect(0, 0, w, h);
      }
    });
  });
}
