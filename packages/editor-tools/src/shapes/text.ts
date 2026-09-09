/**
 * Text tool: click to place a text element and immediately open the editing
 * surface (via `ui.requestTextEdit`). The element is created first so cancel
 * semantics stay uniform (Escape on a new empty text removes it).
 */
import { createElementsCommand, deleteElementsCommand } from "@eraser/editor-core";
import { createText, defaultRegistry } from "@eraser/editor-elements";
import type { CursorType, PointerEventData, Tool, ToolContext } from "../tool-system/types.js";

export class TextTool implements Tool {
  readonly id = "text" as const;
  readonly label = "Text";
  readonly cursor: CursorType = "text";
  private pendingId: string | undefined;

  onPointerDown(context: ToolContext, event: PointerEventData): void {
    if (event.button !== 0) return;
    const { editor } = context;
    // Clicking existing text edits it instead of creating new text.
    const zoom = editor.getCamera().zoom;
    const elements = editor.getScene().getElements(editor.getDocument(), editor.getVersion());
    for (let i = elements.length - 1; i >= 0; i -= 1) {
      const element = elements[i];
      if (element?.type !== "text" || element.locked) continue;
      if (defaultRegistry.containsPoint(element, event.world, 8 / zoom)) {
        editor.setSelection([element.id]);
        context.ui.requestTextEdit(element.id, false);
        return;
      }
    }
    const element = createText({ x: event.world.x, y: event.world.y, width: 0, height: 0 });
    editor.dispatch(createElementsCommand([element], "Create text"));
    editor.setSelection([element.id]);
    this.pendingId = element.id;
    context.ui.requestTextEdit(element.id, true);
  }

  onPointerMove(): void {
    // Text placement needs no drag tracking.
  }

  onPointerUp(): void {
    this.pendingId = undefined;
  }

  onPointerCancel(context: ToolContext): void {
    this.cancelPending(context);
  }

  cancelGesture(context: ToolContext): void {
    this.cancelPending(context);
  }

  /** Remove the just-created element when editing is cancelled while empty. */
  cancelPending(context: ToolContext): void {
    if (this.pendingId === undefined) return;
    const id = this.pendingId;
    this.pendingId = undefined;
    const { editor } = context;
    const element = editor.getScene().getElement(editor.getDocument(), editor.getVersion(), id);
    if (element?.type === "text" && element.text === "") {
      editor.dispatch(deleteElementsCommand([id], "Create text"));
    }
  }
}
