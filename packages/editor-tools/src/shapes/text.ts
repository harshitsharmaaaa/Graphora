/**
 * Text tool: click to open the editing surface. Nothing is created until
 * commit — the engine mints the element once, so typing is a single history
 * entry and cancelling leaves no trace. Double-click (or Text-click) on
 * existing text edits it in place.
 */
import { defaultRegistry } from "@eraser/editor-elements";
import { createElementId } from "@eraser/editor-elements";
import type { CursorType, PointerEventData, Tool, ToolContext } from "../tool-system/types.js";

export class TextTool implements Tool {
  readonly id = "text" as const;
  readonly label = "Text";
  readonly cursor: CursorType = "text";

  onPointerDown(context: ToolContext, event: PointerEventData): void {
    if (event.button !== 0) return;
    const { editor } = context;
    // Clicking existing text edits it instead of starting new text.
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
    editor.clearSelection();
    context.ui.requestTextEdit(createElementId(), true, event.world);
  }
}
