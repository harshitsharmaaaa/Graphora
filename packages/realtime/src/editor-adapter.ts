import type { Document, Editor } from "@eraser/editor-core";
import { documentToYDoc, yDocToDocument } from "./conversion.js";
import type { RealtimeCollaborationClient } from "./client.js";

/**
 * Bridges the durable Editor model and a Y.Doc. Camera and selection never
 * enter the document, while every command (including undo/redo) is mirrored.
 */
export class CollaborativeEditorAdapter {
  private readonly editorUnsubscribe: () => void;
  private readonly yDocUpdate: (update: Uint8Array, origin: unknown) => void;
  private disposed = false;

  constructor(
    editor: Editor,
    private readonly client: RealtimeCollaborationClient,
  ) {
    if (client.yDoc.getMap("graphora").size === 0) {
      documentToYDoc(editor.getDocument(), client.yDoc, this);
    }
    this.editorUnsubscribe = editor.subscribe((event) => {
      if (
        this.disposed ||
        event.type !== "document" ||
        event.origin === "remote"
      )
        return;
      documentToYDoc(editor.getDocument(), client.yDoc, this);
    });
    this.yDocUpdate = (_update, origin) => {
      if (this.disposed || origin === this) return;
      try {
        editor.applyRemoteDocument(yDocToDocument(client.yDoc));
      } catch {
        // The room rejects invalid updates; persistence can still contain a
        // corrupt row, which must not take down the editor.
      }
    };
    client.yDoc.on("update", this.yDocUpdate);
  }

  getDocument(): Document {
    return yDocToDocument(this.client.yDoc);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.editorUnsubscribe();
    this.client.yDoc.off("update", this.yDocUpdate);
  }
}
