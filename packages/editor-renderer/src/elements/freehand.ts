import type { FreehandElement } from "@eraser/editor-elements";
import { asPath, dashForStrokeStyle, inElementFrame, roughStyleFor } from "./common.js";
import type { DrawContext } from "./common.js";

/** Smooth polyline through midpoints (quadratic chain). */
function smoothStroke(
  ctx: CanvasRenderingContext2D,
  points: readonly { x: number; y: number }[],
): void {
  const first = points[0];
  if (first === undefined) return;
  if (points.length === 1) {
    ctx.moveTo(first.x, first.y);
    ctx.lineTo(first.x + 0.01, first.y + 0.01);
    return;
  }
  if (points.length === 2) {
    asPath(ctx, points, false);
    return;
  }
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i + 1 < points.length; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    if (current === undefined || next === undefined) continue;
    ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
  }
  const last = points[points.length - 1];
  if (last !== undefined) ctx.lineTo(last.x, last.y);
}

export function drawFreehand(context: DrawContext, element: FreehandElement): void {
  inElementFrame(context, element, () => {
    const { ctx, roughCanvas, generator } = context;
    const points = element.points;
    if (points.length === 0) return;
    if (points.length === 1) {
      // Single-click dot.
      const only = points[0];
      if (only === undefined) return;
      const radius = Math.max(1.5, element.strokeWidth / 2);
      ctx.beginPath();
      ctx.arc(only.x, only.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = element.strokeColor;
      ctx.fill();
      return;
    }
    if (element.roughness > 0) {
      const { stroke, strokeWidth, seed, strokeLineDash } = roughStyleFor(element);
      roughCanvas.draw(
        generator.curve(
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
    smoothStroke(ctx, points);
    ctx.strokeStyle = element.strokeColor;
    ctx.lineWidth = Math.max(0.5, element.strokeWidth);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash(dashForStrokeStyle(element.strokeStyle, element.strokeWidth));
    ctx.stroke();
    ctx.setLineDash([]);
  });
}
