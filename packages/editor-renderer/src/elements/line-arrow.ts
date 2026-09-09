import type { ArrowElement, LineElement } from "@eraser/editor-elements";
import { getArrowheadTriangles } from "@eraser/editor-elements";
import { asPath, dashForStrokeStyle, inElementFrame, roughStyleFor } from "./common.js";
import type { DrawContext } from "./common.js";

function strokeBody(
  context: DrawContext,
  points: readonly { x: number; y: number }[],
  element: LineElement | ArrowElement,
): void {
  const { ctx, roughCanvas, generator } = context;
  if (element.roughness > 0) {
    const { stroke, strokeWidth, seed, strokeLineDash } = roughStyleFor(element);
    roughCanvas.draw(
      generator.linearPath(
        points.map((p) => [p.x, p.y]),
        {
          stroke,
          strokeWidth,
          roughness: element.roughness,
          seed,
          ...(strokeLineDash === undefined ? {} : { strokeLineDash: [...strokeLineDash] }),
        },
      ),
    );
    return;
  }
  ctx.beginPath();
  asPath(ctx, points, false);
  ctx.strokeStyle = element.strokeColor;
  ctx.lineWidth = Math.max(0.5, element.strokeWidth);
  ctx.lineCap = "round";
  ctx.setLineDash(dashForStrokeStyle(element.strokeStyle, element.strokeWidth));
  ctx.stroke();
  ctx.setLineDash([]);
}

function fillHead(
  context: DrawContext,
  triangle: readonly { x: number; y: number }[],
  element: ArrowElement,
): void {
  const { ctx, roughCanvas, generator } = context;
  if (element.roughness > 0) {
    const { seed } = roughStyleFor(element);
    roughCanvas.draw(
      generator.polygon(
        triangle.map((p) => [p.x, p.y]),
        {
          stroke: element.strokeColor,
          fill: element.strokeColor,
          fillStyle: "solid",
          roughness: element.roughness,
          seed: seed + 1,
        },
      ),
    );
    return;
  }
  ctx.beginPath();
  asPath(ctx, triangle, true);
  ctx.fillStyle = element.strokeColor;
  ctx.fill();
}

export function drawLine(context: DrawContext, element: LineElement): void {
  inElementFrame(context, element, () => {
    strokeBody(context, element.points, element);
  });
}

export function drawArrow(context: DrawContext, element: ArrowElement): void {
  inElementFrame(context, element, () => {
    strokeBody(context, element.points, element);
    const heads = getArrowheadTriangles(element);
    if (heads.start !== undefined) fillHead(context, heads.start, element);
    if (heads.end !== undefined) fillHead(context, heads.end, element);
  });
}
