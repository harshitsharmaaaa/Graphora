/**
 * Element model — discriminated union plus per-type shapes.
 *
 * Coordinate model (applies to every element kind):
 * - `x`/`y`/`width`/`height` describe the **axis-aligned local frame** in
 *   world units. For point-based elements (`line`, `arrow`, `freehand`) the
 *   local frame is the bounding box of `points`, and `points` are stored
 *   **relative to (`x`, `y`)** (never screen pixels).
 * - `rotation` (degrees) is a rigid transform applied about the frame center,
 *   on top of the local geometry. Rotating never rewrites `points`.
 * - `getBounds()` therefore returns the rotated hull for every kind, and
 *   hit-testing converts the world point into the local frame first.
 *
 * The persisted document holds plain data only (no class instances).
 */
import type { Point } from "@eraser/shared-types";

export type ElementType =
  "rectangle" | "ellipse" | "diamond" | "line" | "arrow" | "freehand" | "text" | "image" | "frame";

export type StrokeStyle = "solid" | "dashed" | "dotted";

export type ArrowheadKind = "none" | "triangle";

export type TextAlign = "left" | "center" | "right";

/**
 * Future binding anchor. Object bindings are NOT implemented yet; the field
 * exists so arrows can adopt them without a schema migration.
 */
export interface ElementBinding {
  readonly elementId: string;
  readonly focus?: number | undefined;
  readonly gap?: number | undefined;
}

export interface BaseElement {
  readonly id: string;
  readonly type: ElementType;

  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;

  /** Clockwise degrees on screen (y-down). Applied about the frame center. */
  readonly rotation: number;

  /** 0 (invisible) … 1 (opaque). */
  readonly opacity: number;

  readonly strokeColor: string;
  /** `"transparent"` for no fill. */
  readonly backgroundColor: string;

  readonly strokeWidth: number;
  readonly strokeStyle: StrokeStyle;

  /** 0 (clean) … 2 (max hand-drawn wobble). */
  readonly roughness: number;
  /** 0 (sharp corners) … 1 (fully round). */
  readonly roundness: number;

  readonly locked: boolean;

  readonly zIndex: number;

  readonly parentId?: string | undefined;
  readonly groupId?: string | undefined;

  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface RectangleElement extends BaseElement {
  readonly type: "rectangle";
}

export interface EllipseElement extends BaseElement {
  readonly type: "ellipse";
}

export interface DiamondElement extends BaseElement {
  readonly type: "diamond";
}

export interface LineElement extends BaseElement {
  readonly type: "line";
  /** Exactly two points, local to (`x`, `y`). */
  readonly points: readonly [Point, Point];
}

export interface ArrowElement extends BaseElement {
  readonly type: "arrow";
  /** Body endpoints, local to (`x`, `y`). */
  readonly points: readonly [Point, Point];
  readonly startArrowhead: ArrowheadKind;
  readonly endArrowhead: ArrowheadKind;
  readonly startBinding?: ElementBinding | undefined;
  readonly endBinding?: ElementBinding | undefined;
}

export interface FreehandElement extends BaseElement {
  readonly type: "freehand";
  /** Stroke polyline, local to (`x`, `y`). */
  readonly points: readonly Point[];
  readonly pressures?: readonly number[] | undefined;
}

export interface TextElement extends BaseElement {
  readonly type: "text";
  readonly text: string;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly fontWeight: number;
  readonly textAlign: TextAlign;
  readonly lineHeight: number;
}

export interface ImageElement extends BaseElement {
  readonly type: "image";
  /** Key into the asset store (never binary data in the document). */
  readonly assetId: string;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
}

export interface FrameElement extends BaseElement {
  readonly type: "frame";
  readonly name: string;
}

export type Element =
  | RectangleElement
  | EllipseElement
  | DiamondElement
  | LineElement
  | ArrowElement
  | FreehandElement
  | TextElement
  | ImageElement
  | FrameElement;

/** Extract the member of {@link Element} for a given type tag. */
export type ElementOf<T extends ElementType> = Extract<Element, { readonly type: T }>;

/** Full visual style (defaults fill every field; edits use partials). */
export interface ElementStyle {
  readonly strokeColor: string;
  readonly backgroundColor: string;
  readonly strokeWidth: number;
  readonly strokeStyle: StrokeStyle;
  readonly opacity: number;
  readonly roughness: number;
  readonly roundness: number;
}

/** Type guard for the discriminated union. */
export function isElementType(value: unknown): value is ElementType {
  return (
    value === "rectangle" ||
    value === "ellipse" ||
    value === "diamond" ||
    value === "line" ||
    value === "arrow" ||
    value === "freehand" ||
    value === "text" ||
    value === "image" ||
    value === "frame"
  );
}
