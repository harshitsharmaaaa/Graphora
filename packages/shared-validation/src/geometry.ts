/**
 * Geometry primitive schemas. Mirror `@eraser/shared-types` geometry types.
 */
import { z } from "zod";

const finite = z.number().finite();

export const pointSchema = z.object({
  x: finite,
  y: finite,
});

export const sizeSchema = z.object({
  w: finite,
  h: finite,
});

export const rectSchema = z.object({
  x: finite,
  y: finite,
  w: finite,
  h: finite,
});

export const boundsSchema = z.object({
  minX: finite,
  minY: finite,
  maxX: finite,
  maxY: finite,
});

export type PointInput = z.infer<typeof pointSchema>;
export type BoundsInput = z.infer<typeof boundsSchema>;
