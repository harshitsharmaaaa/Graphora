/** Shared defaults: one place defines "a fresh element looks like this". */
import type { ElementStyle, StrokeStyle, TextAlign } from "./types.js";

/** Neutral light stroke — readable against the dark canvas by default. */
export const DEFAULT_STROKE_COLOR = "#e8eaf0";
export const DEFAULT_BACKGROUND_COLOR = "transparent";
export const DEFAULT_STROKE_WIDTH = 2;
export const DEFAULT_STROKE_STYLE: StrokeStyle = "solid";
export const DEFAULT_OPACITY = 1;
export const DEFAULT_ROUGHNESS = 1;
export const DEFAULT_ROUNDNESS = 0;

export const DEFAULT_FONT_SIZE = 20;
export const DEFAULT_FONT_FAMILY = "Inter, system-ui, sans-serif";
export const DEFAULT_FONT_WEIGHT = 400;
export const DEFAULT_TEXT_ALIGN: TextAlign = "left";
export const DEFAULT_LINE_HEIGHT = 1.25;

/** Default world-space hit tolerance for strokes (callers scale by zoom). */
export const DEFAULT_HIT_TOLERANCE = 5;

export function getDefaultStyle(): ElementStyle {
  return {
    strokeColor: DEFAULT_STROKE_COLOR,
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    strokeStyle: DEFAULT_STROKE_STYLE,
    opacity: DEFAULT_OPACITY,
    roughness: DEFAULT_ROUGHNESS,
    roundness: DEFAULT_ROUNDNESS,
  };
}
