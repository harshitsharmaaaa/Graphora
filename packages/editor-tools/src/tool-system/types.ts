/**
 * Tool contracts. Tools translate pointer gestures into editor commands —
 * they never mutate the document directly. The `ToolContext` carries the
 * editor plus UI hooks the tools cannot implement themselves (text editing
 * surfaces, file pickers), keeping this package DOM-free.
 */
import type { Point } from "@eraser/shared-types";
import type { Editor, ViewportSize } from "@eraser/editor-core";

export type ToolId =
  | "select"
  | "hand"
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "line"
  | "arrow"
  | "freehand"
  | "text"
  | "image"
  | "frame";

export type CursorType =
  | "default"
  | "crosshair"
  | "grab"
  | "grabbing"
  | "move"
  | "text"
  | "pointer"
  | "ns-resize"
  | "ew-resize"
  | "nwse-resize"
  | "nesw-resize";

/** Pointer data with both screen (CSS px) and world coordinates resolved. */
export interface PointerEventData {
  readonly pointerId: number;
  readonly button: number;
  readonly point: Point;
  readonly world: Point;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly eventType: "down" | "move" | "up" | "cancel";
}

/**
 * Host-implemented UI hooks. The frontend provides these; tools stay
 * platform-agnostic and testable without a DOM.
 */
export interface ToolUiHooks {
  /** Open the text editing surface for an element (`isNew` → cancel deletes). */
  requestTextEdit(elementId: string, isNew: boolean): void;
  /** Let the user pick an image and register it, returning its asset ref. */
  pickAndStoreImage(): Promise<
    { readonly assetId: string; readonly width: number; readonly height: number } | undefined
  >;
}

export interface ToolContext {
  readonly editor: Editor;
  readonly ui: ToolUiHooks;
  readonly viewport: ViewportSize;
}

/** Transient overlay state a tool wants rendered (marquee, rubber band…). */
export interface ToolOverlay {
  /** Marquee rect in world coordinates (select tool). */
  readonly marqueeWorld?:
    { readonly x: number; readonly y: number; readonly w: number; readonly h: number } | undefined;
}

export interface Tool {
  readonly id: ToolId;
  readonly label: string;
  readonly cursor: CursorType;

  onPointerDown(context: ToolContext, event: PointerEventData): void;
  onPointerMove?(context: ToolContext, event: PointerEventData): void;
  onPointerUp?(context: ToolContext, event: PointerEventData): void;
  onPointerCancel?(context: ToolContext, event: PointerEventData): void;
  onDoubleClick?(context: ToolContext, event: PointerEventData): void;
  /** Dynamic cursor (e.g. handle hover). Defaults to {@link Tool.cursor}. */
  cursorFor?(context: ToolContext, screen: Point, world: Point): CursorType;
  /** Render hints for the current gesture, if any. */
  getOverlay?(context: ToolContext): ToolOverlay | undefined;
  /** Abort the in-flight gesture (Escape). */
  cancelGesture?(context: ToolContext): void;
}
