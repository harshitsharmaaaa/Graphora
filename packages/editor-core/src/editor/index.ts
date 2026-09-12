/**
 * `Editor` — the framework-free orchestration object.
 *
 * Owns: document (source of truth), camera, selection, command dispatch,
 * transactions, and undo/redo wiring. Emits coarse events; React subscribes
 * and pulls snapshots. History storage is injected (`HistoryStore`) so core
 * never depends on the history package.
 */
import { defaultRegistry } from "@eraser/editor-elements";
import type { Element, ElementRegistry } from "@eraser/editor-elements";
import { createCamera } from "../camera/index.js";
import type { CameraState } from "../camera/index.js";
import type { CommandContext, EditorCommand } from "../commands/types.js";
import {
  findElement,
  getActivePage,
  insertElements,
  normalizeZIndexes,
  removeElementsById,
  replaceElement,
} from "../document/model.js";
import { createEmptyDocument } from "../document/seed.js";
import type { Document, Page } from "../document/types.js";
import { EventEmitter } from "../events/index.js";
import type { EditorEvent, EditorListener, EditorMutationOrigin } from "../events/index.js";
import type { HistoryEntry, HistoryStore } from "../history/types.js";
import { Scene } from "../scene/index.js";
import { Selection } from "../selection/index.js";
import type { SelectionState } from "../selection/index.js";

export interface EditorOptions {
  readonly document?: Document;
  readonly history: HistoryStore;
  readonly registry?: ElementRegistry;
  readonly camera?: Partial<CameraState>;
}

export interface DocumentLoadOptions {
  readonly origin?: EditorMutationOrigin;
  readonly preserveHistory?: boolean;
}

export interface DispatchOptions {
  readonly origin?: "local" | "history";
}

export class Editor {
  private document: Document;
  private camera: CameraState;
  private readonly selection = new Selection();
  private readonly scene: Scene;
  private readonly history: HistoryStore;
  private readonly registry: ElementRegistry;
  private readonly emitter = new EventEmitter();
  private version = 0;

  private transactionDepth = 0;
  private transactionLabel = "";
  private readonly transactionEntries: HistoryEntry[] = [];

  constructor(options: EditorOptions) {
    this.document = options.document ?? createEmptyDocument();
    this.history = options.history;
    this.registry = options.registry ?? defaultRegistry;
    this.camera = createCamera(options.camera ?? {});
    this.scene = new Scene(this.registry);
  }

  // -- snapshots -----------------------------------------------------------

  getDocument(): Document {
    return this.document;
  }

  getScene(): Scene {
    return this.scene;
  }

  getCamera(): CameraState {
    return { ...this.camera };
  }

  getSelection(): SelectionState {
    return this.selection.snapshot();
  }

  getVersion(): number {
    return this.version;
  }

  canUndo(): boolean {
    return this.history.canUndo();
  }

  canRedo(): boolean {
    return this.history.canRedo();
  }

  subscribe(listener: EditorListener): () => void {
    return this.emitter.subscribe(listener);
  }

  // -- camera (ephemeral, never in history) --------------------------------

  setCamera(patch: Partial<CameraState>): void {
    this.camera = createCamera({ ...this.camera, ...patch });
    this.emit({ type: "camera", version: this.version });
  }

  // -- selection (ephemeral, never in history) ------------------------------

  setSelection(ids: readonly string[]): void {
    if (this.selection.set(ids)) this.emit({ type: "selection", version: this.version });
  }

  clearSelection(): void {
    if (this.selection.clear()) this.emit({ type: "selection", version: this.version });
  }

  // -- document -------------------------------------------------------------

  /** Replace the whole document (load from storage). Clears history. */
  loadDocument(document: Document, options: DocumentLoadOptions = {}): void {
    this.document = document;
    this.selection.clear();
    if (!options.preserveHistory) this.history.clear();
    this.cancelTransactionSilently();
    this.version += 1;
    const origin = options.origin ?? "load";
    this.emit({ type: "document", version: this.version, origin });
    this.emit({ type: "selection", version: this.version });
    this.emit({ type: "history", version: this.version });
  }

  /** Apply a collaboration snapshot without adding it to this user's history. */
  applyRemoteDocument(document: Document): void {
    const selectedIds = this.selection.snapshot().selectedIds;
    this.loadDocument(document, { origin: "remote", preserveHistory: true });
    const ids = new Set(
      document.pages.flatMap((page) => page.elements.map((element) => element.id)),
    );
    if (this.selection.set(selectedIds.filter((id) => ids.has(id)))) {
      this.emit({ type: "selection", version: this.version });
    }
  }

  /** Execute a command, recording exactly one history entry (or merging). */
  dispatch(command: EditorCommand, options: DispatchOptions = {}): void {
    const context = this.createContext();
    command.execute(context);
    this.recordEntry({
      label: command.label,
      redo: () => {
        command.execute(this.createContext());
      },
      undo: () => {
        command.undo(this.createContext());
      },
    });
    this.afterDocumentMutation(options.origin ?? "local");
  }

  undo(): void {
    if (this.transactionDepth > 0) this.commitTransaction();
    const entry = this.history.popUndo();
    if (entry === undefined) return;
    entry.undo();
    this.afterDocumentMutation("history");
  }

  redo(): void {
    if (this.transactionDepth > 0) this.commitTransaction();
    const entry = this.history.popRedo();
    if (entry === undefined) return;
    entry.redo();
    this.afterDocumentMutation("history");
  }

  // -- transactions (one drag gesture = one undo step) ----------------------

  beginTransaction(label: string): void {
    if (this.transactionDepth === 0) {
      this.transactionLabel = label;
      this.transactionEntries.length = 0;
    }
    this.transactionDepth += 1;
  }

  commitTransaction(): void {
    if (this.transactionDepth === 0) return;
    this.transactionDepth -= 1;
    if (this.transactionDepth > 0) return;
    const entries = [...this.transactionEntries];
    this.transactionEntries.length = 0;
    if (entries.length === 0) return;
    const label = this.transactionLabel;
    this.history.push({
      label,
      redo: () => {
        for (const entry of entries) entry.redo();
      },
      undo: () => {
        for (let i = entries.length - 1; i >= 0; i -= 1) {
          const entry = entries[i];
          if (entry !== undefined) entry.undo();
        }
      },
    });
    this.emit({ type: "history", version: this.version });
  }

  /** Roll back everything since `beginTransaction` (Escape mid-gesture). */
  cancelTransaction(): void {
    if (this.transactionDepth === 0) return;
    for (let i = this.transactionEntries.length - 1; i >= 0; i -= 1) {
      const entry = this.transactionEntries[i];
      if (entry !== undefined) entry.undo();
    }
    this.cancelTransactionSilently();
    this.afterDocumentMutation("local");
  }

  // -- internals ------------------------------------------------------------

  private cancelTransactionSilently(): void {
    this.transactionDepth = 0;
    this.transactionEntries.length = 0;
    this.transactionLabel = "";
  }

  private recordEntry(entry: HistoryEntry): void {
    if (this.transactionDepth > 0) {
      this.transactionEntries.push(entry);
      return;
    }
    this.history.push(entry);
    this.emit({ type: "history", version: this.version });
  }

  private afterDocumentMutation(origin: EditorMutationOrigin): void {
    this.document = {
      ...this.document,
      metadata: { ...this.document.metadata, updatedAt: Date.now() },
    };
    this.version += 1;
    this.emit({ type: "document", version: this.version, origin });
    if (this.transactionDepth === 0) this.emit({ type: "history", version: this.version });
  }

  private createContext(): CommandContext {
    return {
      document: this.document,
      getActivePage: (): Page => getActivePage(this.document),
      getElement: (id: string): Element | undefined => findElement(this.document, id)?.element,
      insertElements: (elements: readonly Element[], index?: number): void => {
        insertElements(getActivePage(this.document), elements, index);
      },
      removeElements: (ids: readonly string[]): Element[] => {
        return removeElementsById(getActivePage(this.document), ids);
      },
      replaceElement: (element: Element): boolean => {
        return replaceElement(getActivePage(this.document), element);
      },
      normalize: (): void => {
        normalizeZIndexes(getActivePage(this.document));
      },
    };
  }

  private emit(event: EditorEvent): void {
    this.emitter.emit(event);
  }
}

/** Convenience factory (same as `new Editor`, reads better at call sites). */
export function createEditor(options: EditorOptions): Editor {
  return new Editor(options);
}
