/** Hand tool: drag anywhere to pan the camera (viewport state, not history). */
import { panCamera } from "@eraser/editor-core";
import type { Point } from "@eraser/shared-types";
import type { CursorType, PointerEventData, Tool, ToolContext } from "../tool-system/types.js";

export class HandTool implements Tool {
  readonly id = "hand" as const;
  readonly label = "Hand";
  readonly cursor: CursorType = "grab";
  private lastScreen: Point | undefined;

  onPointerDown(_context: ToolContext, event: PointerEventData): void {
    if (event.button !== 0) return;
    this.lastScreen = event.point;
  }

  onPointerMove(context: ToolContext, event: PointerEventData): void {
    if (this.lastScreen === undefined) return;
    const dx = event.point.x - this.lastScreen.x;
    const dy = event.point.y - this.lastScreen.y;
    this.lastScreen = event.point;
    if (dx === 0 && dy === 0) return;
    const { editor } = context;
    editor.setCamera(panCamera(editor.getCamera(), dx, dy));
  }

  onPointerUp(): void {
    this.lastScreen = undefined;
  }

  onPointerCancel(): void {
    this.lastScreen = undefined;
  }

  cursorFor(): CursorType {
    return this.lastScreen === undefined ? "grab" : "grabbing";
  }

  cancelGesture(): void {
    this.lastScreen = undefined;
  }
}
