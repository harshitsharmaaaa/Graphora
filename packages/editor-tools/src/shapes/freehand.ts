/**
 * Freehand tool: accumulates pointer positions into a stroke element.
 * Points are stored absolute while drawing and normalized to the local
 * frame by the factory on every update. One stroke = one history entry.
 * Strokes are simplified with a minimum-spacing filter; smoothing happens
 * at render time.
 */
import { createElementsCommand, getActivePage, replaceElementsCommand } from "@eraser/editor-core";
import type { Point } from "@eraser/shared-types";
import { createFreehand, syncFreehandBounds } from "@eraser/editor-elements";
import type { CursorType, PointerEventData, Tool, ToolContext } from "../tool-system/types.js";

/** Minimum pointer travel (screen pixels) between kept points. */
export const FREEHAND_MIN_SPACING_PX = 2;

export class FreehandTool implements Tool {
  readonly id = "freehand" as const;
  readonly label = "Freehand";
  readonly cursor: CursorType = "crosshair";
  private stroke: Point[] | undefined;
  private createdId: string | undefined;

  onPointerDown(context: ToolContext, event: PointerEventData): void {
    if (event.button !== 0) return;
    const { editor } = context;
    editor.beginTransaction("Draw");
    const element = createFreehand({ x: event.world.x, y: event.world.y, points: [event.world] });
    editor.dispatch(createElementsCommand([element], "Draw"));
    editor.setSelection([element.id]);
    this.stroke = [event.world];
    this.createdId = element.id;
  }

  onPointerMove(context: ToolContext, event: PointerEventData): void {
    if (this.stroke === undefined || this.createdId === undefined) return;
    // Zoom-relative spacing: ~2 screen pixels apart at any zoom, so strokes
    // neither explode when zoomed out nor turn jagged when zoomed in.
    const minSpacing = FREEHAND_MIN_SPACING_PX / context.editor.getCamera().zoom;
    const last = this.stroke[this.stroke.length - 1];
    if (last !== undefined) {
      const dx = event.world.x - last.x;
      const dy = event.world.y - last.y;
      if (Math.sqrt(dx * dx + dy * dy) < minSpacing) return;
    }
    this.stroke.push(event.world);
    const { editor } = context;
    const page = getActivePage(editor.getDocument());
    const current = page.elements.find((element) => element.id === this.createdId);
    if (current?.type !== "freehand") return;
    // Re-base absolute stroke points into the element's local frame, then
    // re-sync (the frame grows as the stroke extends past it).
    const origin: Point = { x: current.x, y: current.y };
    const local = this.stroke.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y }));
    const next = syncFreehandBounds({ ...current, points: local, updatedAt: Date.now() });
    editor.dispatch(replaceElementsCommand([next], "Draw"));
  }

  onPointerUp(context: ToolContext): void {
    this.stroke = undefined;
    this.createdId = undefined;
    context.editor.commitTransaction();
  }

  onPointerCancel(context: ToolContext): void {
    this.cancelGesture(context);
  }

  cancelGesture(context: ToolContext): void {
    const { editor } = context;
    if (
      this.createdId !== undefined &&
      editor.getSelection().selectedIds.includes(this.createdId)
    ) {
      editor.clearSelection();
    }
    this.stroke = undefined;
    this.createdId = undefined;
    editor.cancelTransaction();
  }
}
