import type { DiamondElement, EllipseElement } from "@eraser/editor-elements";
import { asPath, fillAndStroke, inElementFrame, roughStyleFor } from "./common.js";
import type { DrawContext } from "./common.js";

export function drawEllipse(context: DrawContext, element: EllipseElement): void {
  inElementFrame(context, element, () => {
    const { ctx, roughCanvas, generator } = context;
    const { width: w, height: h, roughness } = element;
    if (roughness > 0) {
      const { stroke, strokeWidth, fill, seed, strokeLineDash } = roughStyleFor(element);
      roughCanvas.draw(
        generator.ellipse(w / 2, h / 2, Math.max(0, w), Math.max(0, h), {
          stroke,
          strokeWidth,
          ...(fill === undefined ? {} : { fill, fillStyle: "solid" as const }),
          roughness,
          seed,
          ...(strokeLineDash === undefined ? {} : { strokeLineDash: [...strokeLineDash] }),
        }),
      );
      return;
    }
    fillAndStroke(ctx, element, () => {
      ctx.ellipse(w / 2, h / 2, Math.max(0, w / 2), Math.max(0, h / 2), 0, 0, Math.PI * 2);
    });
  });
}

export function drawDiamond(context: DrawContext, element: DiamondElement): void {
  inElementFrame(context, element, () => {
    const { ctx, roughCanvas, generator } = context;
    const { width: w, height: h, roughness } = element;
    const points = [
      { x: w / 2, y: 0 },
      { x: w, y: h / 2 },
      { x: w / 2, y: h },
      { x: 0, y: h / 2 },
    ];
    if (roughness > 0) {
      const { stroke, strokeWidth, fill, seed, strokeLineDash } = roughStyleFor(element);
      roughCanvas.draw(
        generator.polygon(
          points.map((p) => [p.x, p.y]),
          {
            stroke,
            strokeWidth,
            ...(fill === undefined ? {} : { fill, fillStyle: "solid" as const }),
            roughness,
            seed,
            ...(strokeLineDash === undefined ? {} : { strokeLineDash: [...strokeLineDash] }),
          },
        ),
      );
      return;
    }
    fillAndStroke(ctx, element, () => {
      asPath(ctx, points, true);
    });
  });
}
