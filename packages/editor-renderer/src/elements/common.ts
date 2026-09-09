/**
 * Shared drawing primitives: element-frame transforms, Rough.js style
 * mapping, dash patterns, and deterministic seeds (stable wobble per id so
 * shapes never shimmer between frames).
 */
import rough from "roughjs";
import type { Point } from "@eraser/shared-types";
import { degToRad } from "@eraser/editor-geometry";
import type { BaseElement, StrokeStyle } from "@eraser/editor-elements";
import type { ImageResolver } from "../renderer/types.js";

export type RoughCanvasInstance = ReturnType<typeof rough.canvas>;
export type RoughGeneratorInstance = ReturnType<typeof rough.generator>;

export function createRoughGenerator(): RoughGeneratorInstance {
  return rough.generator();
}

export interface DrawContext {
  readonly ctx: CanvasRenderingContext2D;
  readonly roughCanvas: RoughCanvasInstance;
  readonly generator: RoughGeneratorInstance;
  readonly imageResolver?: ImageResolver | undefined;
}

/** FNV-1a hash → stable Rough.js seed per element id. */
export function seedFromId(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Dash pattern for a stroke style at a given width (screen/world units). */
export function dashForStrokeStyle(style: StrokeStyle, width: number): number[] {
  const w = Math.max(1, width);
  switch (style) {
    case "solid":
      return [];
    case "dashed":
      return [w * 4, w * 2.5];
    case "dotted":
      return [w, w * 2];
  }
}

export interface RoughStyle {
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly fill?: string | undefined;
  readonly roughness: number;
  readonly seed: number;
  readonly strokeLineDash?: readonly number[] | undefined;
}

/** Map element style to a Rough.js options object (omits fill when transparent). */
export function roughStyleFor(element: BaseElement): RoughStyle {
  const dash = dashForStrokeStyle(element.strokeStyle, element.strokeWidth);
  return {
    stroke: element.strokeColor,
    strokeWidth: Math.max(0.5, element.strokeWidth),
    fill: element.backgroundColor === "transparent" ? undefined : element.backgroundColor,
    roughness: element.roughness,
    seed: seedFromId(element.id),
    ...(dash.length === 0 ? {} : { strokeLineDash: dash }),
  };
}

/**
 * Run `draw` inside the element's local frame: origin at (`x`, `y`),
 * rotation applied about the center. Restores the context afterwards and
 * applies `globalAlpha` from opacity.
 */
export function inElementFrame(context: DrawContext, element: BaseElement, draw: () => void): void {
  const { ctx } = context;
  ctx.save();
  ctx.globalAlpha = element.opacity;
  ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
  ctx.rotate(degToRad(element.rotation));
  ctx.translate(-element.width / 2, -element.height / 2);
  try {
    draw();
  } finally {
    ctx.restore();
  }
}

/** Fill + stroke a freshly built path (clean-style rendering). */
export function fillAndStroke(
  ctx: CanvasRenderingContext2D,
  element: BaseElement,
  fillPath: () => void,
): void {
  ctx.beginPath();
  fillPath();
  if (element.backgroundColor !== "transparent") {
    ctx.fillStyle = element.backgroundColor;
    ctx.fill();
  }
  if (element.strokeWidth > 0) {
    ctx.strokeStyle = element.strokeColor;
    ctx.lineWidth = element.strokeWidth;
    ctx.setLineDash(dashForStrokeStyle(element.strokeStyle, element.strokeWidth));
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** Local-frame polygon points helper. */
export function asPath(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  close: boolean,
): void {
  const first = points[0];
  if (first === undefined) return;
  ctx.moveTo(first.x, first.y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  if (close) ctx.closePath();
}
