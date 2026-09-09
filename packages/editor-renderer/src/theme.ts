/**
 * Dark-first render theme. The canvas reads as a near-black technical
 * workspace; chrome colors live in CSS variables (frontend), canvas colors
 * live here so headless consumers share them.
 */

/** Near-black neutral canvas (never pure black). */
export const DARK_CANVAS_BACKGROUND = "#111318";
/** Subtle dot grid — visible, never overpowering. */
export const DARK_GRID_COLOR = "#262c38";
/** High-contrast selection accents (visible against any shape color). */
export const SELECTION_COLOR = "#818cf8";
/** Marquee fill. */
export const MARQUEE_FILL = "rgba(129, 140, 248, 0.10)";
/** Frame surface + border + label. */
export const FRAME_FILL = "#171b23";
export const FRAME_BORDER = "#3b4356";
export const FRAME_LABEL = "#9aa3b2";
/** Image placeholder. */
export const PLACEHOLDER_BORDER = "#3b4356";
export const PLACEHOLDER_TEXT = "#9aa3b2";
