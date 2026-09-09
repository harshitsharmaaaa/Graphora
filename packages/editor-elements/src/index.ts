/**
 * `@eraser/editor-elements` — element model, factories, and registry.
 *
 * Depends on `@eraser/editor-geometry` (math) and `@eraser/shared-types`
 * (primitives) only. No React, no DOM.
 */
export type {
  ArrowElement,
  ArrowheadKind,
  BaseElement,
  DiamondElement,
  Element,
  ElementBinding,
  ElementOf,
  ElementStyle,
  ElementType,
  EllipseElement,
  FrameElement,
  FreehandElement,
  ImageElement,
  LineElement,
  RectangleElement,
  StrokeStyle,
  TextAlign,
  TextElement,
} from "./types.js";
export { isElementType } from "./types.js";
export {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_WEIGHT,
  DEFAULT_HIT_TOLERANCE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_OPACITY,
  DEFAULT_ROUGHNESS,
  DEFAULT_ROUNDNESS,
  DEFAULT_STROKE_COLOR,
  DEFAULT_STROKE_STYLE,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_TEXT_ALIGN,
  getDefaultStyle,
} from "./defaults.js";
export { createElementId } from "./ids.js";
export type {
  CreateArrowInput,
  CreateBaseInput,
  CreateFrameInput,
  CreateFreehandInput,
  CreateImageInput,
  CreateLineInput,
  CreateTextInput,
} from "./factories.js";
export {
  createArrow,
  createDiamond,
  createEllipse,
  createFrame,
  createFreehand,
  createImage,
  createLine,
  createRectangle,
  createText,
} from "./factories.js";
export { elementCenter, toLocalPoint, toWorldPoint } from "./frame.js";
export {
  scaleArrowPoints,
  scaleFreehandPoints,
  scaleLinePoints,
  syncArrowBounds,
  syncFreehandBounds,
  syncLineBounds,
} from "./sync.js";
export type { CreateElementInput, ElementDefinition } from "./registry.js";
export { ElementRegistry, createDefaultRegistry, defaultRegistry } from "./registry.js";
export type { ArrowheadTriangles } from "./defs/arrow.js";
export { getArrowheadTriangles } from "./defs/arrow.js";
export { distanceToLineBody } from "./defs/line.js";
