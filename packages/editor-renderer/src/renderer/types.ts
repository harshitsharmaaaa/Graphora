/**
 * Renderer contracts. The renderer is deterministic: same
 * (`elements`, `camera`, `viewport`, options) → same pixels.
 * It never reads React state and never mutates the document.
 */
import type { CameraState } from "@eraser/editor-core";
import type { Element } from "@eraser/editor-elements";
import type { Rect } from "@eraser/shared-types";

/** Canvas size in CSS pixels plus the device pixel ratio. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}

export interface RenderOptions {
  /** Canvas background. Defaults to white. */
  readonly background?: string;
  /** Dot grid (infinite-canvas feel). Defaults to true. */
  readonly showGrid?: boolean;
  /** Grid spacing in world units. Defaults to 32. */
  readonly gridSpacing?: number;
}

/** Resolves an asset id to something `drawImage` accepts (or nothing). */
export type ImageResolver = (assetId: string) => CanvasImageSource | undefined;

/** Everything needed for one frame. */
export interface RenderState {
  readonly elements: readonly Element[];
  readonly camera: CameraState;
  readonly viewport: Viewport;
  readonly selectedIds?: readonly string[] | undefined;
  /** Marquee rect in world coordinates (from the select tool). */
  readonly marqueeWorld?: Rect | undefined;
  readonly options?: RenderOptions | undefined;
  readonly imageResolver?: ImageResolver | undefined;
}
