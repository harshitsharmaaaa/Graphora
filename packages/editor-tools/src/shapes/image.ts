/**
 * Image tool: click to pick a local file (via `ui.pickAndStoreImage`) and
 * place it centered on the click point, capped at a sane maximum size.
 * Uploads/cloud assets arrive in a later phase; the asset-store boundary
 * already isolates this tool from that change.
 */
import { createElementsCommand } from "@eraser/editor-core";
import { createImage } from "@eraser/editor-elements";
import type { CursorType, PointerEventData, Tool, ToolContext } from "../tool-system/types.js";

/** Longest side (world units) for a freshly placed image. */
export const MAX_PLACED_IMAGE_SIDE = 640;

export class ImageTool implements Tool {
  readonly id = "image" as const;
  readonly label = "Image";
  readonly cursor: CursorType = "crosshair";

  onPointerDown(context: ToolContext, event: PointerEventData): void {
    if (event.button !== 0) return;
    const { editor, ui } = context;
    void ui.pickAndStoreImage().then((stored) => {
      if (stored === undefined) return;
      const scale = Math.min(1, MAX_PLACED_IMAGE_SIDE / Math.max(stored.width, stored.height));
      const width = Math.max(1, stored.width * scale);
      const height = Math.max(1, stored.height * scale);
      const element = createImage({
        assetId: stored.assetId,
        x: event.world.x - width / 2,
        y: event.world.y - height / 2,
        width,
        height,
        naturalWidth: stored.width,
        naturalHeight: stored.height,
      });
      editor.dispatch(createElementsCommand([element], "Insert image"));
      editor.setSelection([element.id]);
    });
  }
}
