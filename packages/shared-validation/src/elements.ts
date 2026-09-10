/**
 * Element schemas — the runtime mirror of the `Element` discriminated union
 * in `@eraser/editor-elements`.
 *
 * Rules:
 * - Structural only: no imports from editor packages (keeps this package
 *   dependency-free apart from Zod and avoids any import cycle).
 * - A drift test in `@eraser/editor-elements` asserts parsed fixtures are
 *   assignable to the TypeScript element interfaces.
 * - Unknown keys are stripped (Zod default), never rejected, so older clients
 *   tolerate documents saved by newer ones; real upgrades go through
 *   `migrateDocument` in `@eraser/editor-core`.
 */
import { z } from "zod";
import { pointSchema } from "./geometry.js";

const finite = z.number().finite();
const nonEmptyString = z.string().min(1).max(4096);
const colorString = z.string().min(1).max(64);

export const elementTypeSchema = z.enum([
  "rectangle",
  "ellipse",
  "diamond",
  "line",
  "arrow",
  "freehand",
  "text",
  "image",
  "frame",
]);

export const strokeStyleSchema = z.enum(["solid", "dashed", "dotted"]);
export const fillStyleSchema = z.enum(["none", "solid", "hachure", "cross-hatch"]);

export const arrowheadSchema = z.enum(["none", "triangle"]);

export const textAlignSchema = z.enum(["left", "center", "right"]);

export const elementBindingSchema = z.object({
  elementId: nonEmptyString,
  focus: finite.optional(),
  gap: finite.optional(),
});

const baseElementFields = {
  id: nonEmptyString.max(128),
  x: finite,
  y: finite,
  width: finite,
  height: finite,
  rotation: finite,
  opacity: z.number().min(0).max(1),
  strokeColor: colorString,
  backgroundColor: colorString,
  fillStyle: fillStyleSchema.default("none"),
  strokeWidth: z.number().min(0).max(100),
  strokeStyle: strokeStyleSchema,
  roughness: z.number().min(0).max(2),
  roundness: z.number().min(0).max(1),
  locked: z.boolean(),
  zIndex: z.number().int(),
  parentId: nonEmptyString.max(128).optional(),
  groupId: nonEmptyString.max(128).optional(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
};

export const rectangleElementSchema = z.object({
  ...baseElementFields,
  type: z.literal("rectangle"),
});

export const ellipseElementSchema = z.object({
  ...baseElementFields,
  type: z.literal("ellipse"),
});

export const diamondElementSchema = z.object({
  ...baseElementFields,
  type: z.literal("diamond"),
});

const twoPoints = z.tuple([pointSchema, pointSchema]);

export const lineElementSchema = z.object({
  ...baseElementFields,
  type: z.literal("line"),
  points: twoPoints,
});

export const arrowElementSchema = z.object({
  ...baseElementFields,
  type: z.literal("arrow"),
  points: twoPoints,
  startArrowhead: arrowheadSchema,
  endArrowhead: arrowheadSchema,
  startBinding: elementBindingSchema.optional(),
  endBinding: elementBindingSchema.optional(),
});

export const freehandElementSchema = z.object({
  ...baseElementFields,
  type: z.literal("freehand"),
  points: z.array(pointSchema).min(1).max(50_000),
  pressures: z.array(z.number().min(0).max(1)).max(50_000).optional(),
});

export const textElementSchema = z.object({
  ...baseElementFields,
  type: z.literal("text"),
  text: z.string().max(50_000),
  fontSize: z.number().min(1).max(1000),
  fontFamily: z.string().min(1).max(256),
  fontWeight: z.number().int().min(100).max(1000),
  textAlign: textAlignSchema,
  lineHeight: z.number().min(0.5).max(5),
});

export const imageElementSchema = z.object({
  ...baseElementFields,
  type: z.literal("image"),
  assetId: nonEmptyString.max(128),
  naturalWidth: z.number().min(1).max(100_000),
  naturalHeight: z.number().min(1).max(100_000),
});

export const frameElementSchema = z.object({
  ...baseElementFields,
  type: z.literal("frame"),
  name: z.string().max(256),
});

export const elementSchema = z.discriminatedUnion("type", [
  rectangleElementSchema,
  ellipseElementSchema,
  diamondElementSchema,
  lineElementSchema,
  arrowElementSchema,
  freehandElementSchema,
  textElementSchema,
  imageElementSchema,
  frameElementSchema,
]);

export type ElementInput = z.infer<typeof elementSchema>;
export type ElementTypeInput = z.infer<typeof elementTypeSchema>;
