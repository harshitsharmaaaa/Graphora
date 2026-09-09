/**
 * Shared 2D geometry primitives for the whiteboard monorepo.
 *
 * Rules:
 * - Types only (no runtime code) so this package stays dependency-free.
 * - No React. Consumed by `editor-geometry` (math) and the editor packages.
 * - Coordinates are plain numbers. World-space vs screen-space meaning is
 *   documented at usage sites; the editor never persists screen coordinates.
 */

/** A 2D point or vector. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A 2D vector (same shape as {@link Point}; distinct name documents intent). */
export type Vector = Point;

/** Width/height extents. */
export interface Size {
  readonly w: number;
  readonly h: number;
}

/**
 * Axis-aligned rectangle in `x/y/width/height` form.
 * Width and height are expected to be `>= 0` (use normalization helpers
 * in `@eraser/editor-geometry` when they may not be).
 */
export interface Rect extends Size {
  readonly x: number;
  readonly y: number;
}

/**
 * Axis-aligned bounds in min/max form. Invariant: `minX <= maxX`,
 * `minY <= maxY` (use normalization helpers when they may not hold).
 */
export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}
