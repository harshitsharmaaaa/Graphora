/**
 * `@eraser/editor-renderer` — deterministic Canvas 2D renderer.
 * Depends on core/elements/geometry (+ Rough.js). No React.
 */
export type { ImageResolver, RenderOptions, RenderState, Viewport } from "./renderer/types.js";
export { setupCanvas } from "./canvas/canvas.js";
export { getVisibleElements, visibleWorldBounds } from "./viewport/culling.js";
export { Renderer, createRenderer } from "./renderer/renderer.js";
export { drawSelectionOverlay, drawMarqueeOverlay, SELECTION_COLOR } from "./overlay/selection.js";
export { fontFor, measureTextBlock } from "./elements/text.js";
export type { TextMetrics } from "./elements/text.js";
export { dashForStrokeStyle, seedFromId } from "./elements/common.js";
export {
  DARK_CANVAS_BACKGROUND,
  DARK_GRID_COLOR,
  FRAME_BORDER,
  FRAME_FILL,
  FRAME_LABEL,
  MARQUEE_FILL,
  PLACEHOLDER_BORDER,
  PLACEHOLDER_TEXT,
  SELECTION_COLOR as RENDER_SELECTION_COLOR,
} from "./theme.js";
