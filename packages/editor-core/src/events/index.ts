/**
 * Tiny typed event emitter. The editor pushes coarse-grained notifications;
 * subscribers pull snapshots (`getDocument`, `getSelection`, …). No payloads
 * beyond a monotonically increasing version — this keeps the React layer from
 * ever caching stale editor state.
 */

export type EditorEventType = "document" | "selection" | "camera" | "history";

export type EditorMutationOrigin = "local" | "remote" | "history" | "load";

export interface EditorEvent {
  readonly type: EditorEventType;
  /** Monotonic counter bumped on every mutation (per editor instance). */
  readonly version: number;
  /** Identifies whether a document change came from this user or collaboration. */
  readonly origin?: EditorMutationOrigin;
}

export type EditorListener = (event: EditorEvent) => void;

export class EventEmitter {
  private readonly listeners = new Set<EditorListener>();

  subscribe(listener: EditorListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: EditorEvent): void {
    for (const listener of [...this.listeners]) {
      listener(event);
    }
  }

  listenerCount(): number {
    return this.listeners.size;
  }
}
