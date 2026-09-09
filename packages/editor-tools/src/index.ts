/**
 * `@eraser/editor-tools` — pointer tools driving editor commands.
 * Depends on core/elements/geometry only. No React, no DOM.
 */
import type { Editor } from "@eraser/editor-core";
import { HandTool } from "./pan/hand.js";
import { SelectTool } from "./selection/select.js";
import {
  createArrowTool,
  createDiamondTool,
  createEllipseTool,
  createFrameTool,
  createLineTool,
  createRectangleTool,
} from "./shapes/box-tools.js";
import { FreehandTool } from "./shapes/freehand.js";
import { ImageTool } from "./shapes/image.js";
import { TextTool } from "./shapes/text.js";
import { ToolSystem } from "./tool-system/tool-system.js";
import type { Tool, ToolId } from "./tool-system/types.js";
import type { ToolUiHooks } from "./tool-system/types.js";

export type {
  CursorType,
  PointerEventData,
  Tool,
  ToolContext,
  ToolId,
  ToolOverlay,
  ToolUiHooks,
} from "./tool-system/types.js";
export { ToolSystem } from "./tool-system/tool-system.js";
export type { RawPointerData } from "./tool-system/tool-system.js";
export { CLICK_SLOP_PX, isClickGesture } from "./tool-system/gestures.js";
export {
  DEFAULT_SHORTCUTS,
  isTextEntryTarget,
  matchShortcutAction,
  shortcutLabel,
} from "./shortcuts/shortcuts.js";
export type {
  EditorActionId,
  KeyBinding,
  KeyEventData,
  PlatformKind,
} from "./shortcuts/shortcuts.js";
export { SelectTool } from "./selection/select.js";
export { HandTool } from "./pan/hand.js";
export { BoxCreateTool } from "./shapes/box-tools.js";
export { FreehandTool, FREEHAND_MIN_SPACING_PX } from "./shapes/freehand.js";
export { TextTool } from "./shapes/text.js";
export { ImageTool, MAX_PLACED_IMAGE_SIDE } from "./shapes/image.js";

/** Toolbar order for the default tool set. */
export const TOOL_ORDER: readonly ToolId[] = [
  "select",
  "hand",
  "rectangle",
  "ellipse",
  "diamond",
  "line",
  "arrow",
  "freehand",
  "text",
  "frame",
  "image",
];

/** Tool system with every built-in tool registered. */
export function createDefaultToolSystem(editor: Editor, ui: ToolUiHooks): ToolSystem {
  const system = new ToolSystem(editor, ui);
  const tools: Tool[] = [
    new SelectTool(),
    new HandTool(),
    createRectangleTool(),
    createEllipseTool(),
    createDiamondTool(),
    createArrowTool(),
    createLineTool(),
    new FreehandTool(),
    new TextTool(),
    new ImageTool(),
    createFrameTool(),
  ];
  for (const tool of tools) system.register(tool);
  return system;
}
