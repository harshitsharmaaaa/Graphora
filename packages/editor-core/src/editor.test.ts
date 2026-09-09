import { describe, expect, it } from "vitest";
import { createLine, createRectangle } from "@eraser/editor-elements";
import type { Element } from "@eraser/editor-elements";
import { parseClipboardPayload, serializeElementsForClipboard } from "./clipboard/index.js";
import {
  changeStyleCommand,
  createElementsCommand,
  deleteElementsCommand,
  replaceElementsCommand,
} from "./commands/element-commands.js";
import { moveElement, resizeSingleElement, rotateElementsAbout } from "./commands/transforms.js";
import { getActivePage } from "./document/model.js";
import { createEmptyDocument } from "./document/seed.js";
import { parseDocument, serializeDocument } from "./document/serialization.js";
import { Editor } from "./editor/index.js";
import type { HistoryEntry, HistoryStore } from "./history/types.js";
import type { DocumentPersistence } from "./persistence/types.js";

/** Minimal in-test history (mirrors the real `editor-history` semantics). */
class FakeHistory implements HistoryStore {
  private readonly undoStack: HistoryEntry[] = [];
  private readonly redoStack: HistoryEntry[] = [];
  private readonly listeners = new Set<() => void>();

  push(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    this.redoStack.length = 0;
    this.notify();
  }

  popUndo(): HistoryEntry | undefined {
    const entry = this.undoStack.pop();
    if (entry !== undefined) {
      this.redoStack.push(entry);
      this.notify();
    }
    return entry;
  }

  popRedo(): HistoryEntry | undefined {
    const entry = this.redoStack.pop();
    if (entry !== undefined) {
      this.undoStack.push(entry);
      this.notify();
    }
    return entry;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

function setup() {
  const editor = new Editor({ history: new FakeHistory(), document: createEmptyDocument() });
  return { editor };
}

function onlyElement(editor: Editor): Element {
  const elements = getActivePage(editor.getDocument()).elements;
  const first = elements[0];
  if (first === undefined || elements.length !== 1) throw new Error("Expected one element");
  return first;
}

describe("editor integration", () => {
  it("creates, undoes, and redoes", () => {
    const { editor } = setup();
    expect(editor.canUndo()).toBe(false);
    editor.dispatch(createElementsCommand([createRectangle({ width: 10, height: 10 })]));
    expect(getActivePage(editor.getDocument()).elements).toHaveLength(1);
    expect(editor.canUndo()).toBe(true);
    editor.undo();
    expect(getActivePage(editor.getDocument()).elements).toHaveLength(0);
    expect(editor.canRedo()).toBe(true);
    editor.redo();
    expect(getActivePage(editor.getDocument()).elements).toHaveLength(1);
  });

  it("invalidates redo on new commands", () => {
    const { editor } = setup();
    editor.dispatch(createElementsCommand([createRectangle({ width: 1, height: 1 })]));
    editor.undo();
    editor.dispatch(createElementsCommand([createRectangle({ width: 2, height: 2 })]));
    expect(editor.canRedo()).toBe(false);
  });

  it("groups a drag transaction into one undo step", () => {
    const { editor } = setup();
    editor.dispatch(
      createElementsCommand([createRectangle({ x: 0, y: 0, width: 10, height: 10 })]),
    );
    editor.beginTransaction("Move");
    for (let i = 0; i < 3; i += 1) {
      const current = onlyElement(editor);
      editor.dispatch(replaceElementsCommand([moveElement(current, 10, 0)], "Move"));
    }
    editor.commitTransaction();
    expect(onlyElement(editor).x).toBe(30);
    editor.undo();
    expect(onlyElement(editor).x).toBe(0);
    editor.redo();
    expect(onlyElement(editor).x).toBe(30);
  });

  it("rolls back cancelled transactions", () => {
    const { editor } = setup();
    editor.dispatch(
      createElementsCommand([createRectangle({ x: 5, y: 5, width: 10, height: 10 })]),
    );
    editor.beginTransaction("Move");
    editor.dispatch(replaceElementsCommand([moveElement(onlyElement(editor), 100, 100)], "Move"));
    editor.cancelTransaction();
    const el = onlyElement(editor);
    expect(el.x).toBe(5);
    expect(el.y).toBe(5);
    expect(editor.canUndo()).toBe(true); // only the create remains
  });

  it("deletes and restores at the original index", () => {
    const { editor } = setup();
    const a = createRectangle({ width: 1, height: 1 });
    const b = createRectangle({ width: 2, height: 2 });
    editor.dispatch(createElementsCommand([a, b]));
    editor.dispatch(deleteElementsCommand([a.id]));
    expect(getActivePage(editor.getDocument()).elements.map((el) => el.id)).toEqual([b.id]);
    editor.undo();
    expect(getActivePage(editor.getDocument()).elements.map((el) => el.id)).toEqual([a.id, b.id]);
  });

  it("resizes rotated elements in their local frame", () => {
    const { editor } = setup();
    editor.dispatch(
      createElementsCommand([
        createRectangle({ x: 0, y: 0, width: 100, height: 50, rotation: 90 }),
      ]),
    );
    // Local +x maps to world +y after a 90° turn.
    const resized = resizeSingleElement(onlyElement(editor), {
      handle: "right",
      deltaWorld: { x: 0, y: 40 },
    });
    expect(resized.width).toBe(140);
    expect(resized.height).toBe(50);
    expect(resized.rotation).toBe(90);
    expect(resized.x).toBe(0);
  });

  it("rotates a line into a vertical frame without drift", () => {
    const { editor } = setup();
    editor.dispatch(
      createElementsCommand([
        createLine({
          x: 0,
          y: 0,
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        }),
      ]),
    );
    const before = onlyElement(editor);
    if (before.type !== "line") throw new Error("Expected a line");
    const center = { x: before.x + before.width / 2, y: before.y + before.height / 2 };
    const [rotated] = rotateElementsAbout([before], center, 90);
    if (rotated?.type !== "line") throw new Error("Expected a line");
    expect(rotated.rotation).toBe(90);
    expect(rotated.x).toBeCloseTo(50, 9);
    expect(rotated.y).toBeCloseTo(-50, 9);
    expect(rotated.width).toBeCloseTo(0, 9);
    expect(rotated.height).toBeCloseTo(100, 9);
  });

  it("changes styles and restores them on undo", () => {
    const { editor } = setup();
    editor.dispatch(createElementsCommand([createRectangle({ width: 5, height: 5 })]));
    const id = onlyElement(editor).id;
    editor.dispatch(changeStyleCommand([id], { strokeColor: "#ff0000", strokeWidth: 5 }));
    expect(onlyElement(editor).strokeColor).toBe("#ff0000");
    editor.undo();
    expect(onlyElement(editor).strokeColor).toBe("#1e1e1e");
  });

  it("tracks selection and emits events", () => {
    const { editor } = setup();
    const seen: string[] = [];
    editor.subscribe((event) => {
      seen.push(event.type);
    });
    editor.dispatch(createElementsCommand([createRectangle({ width: 1, height: 1 })]));
    const id = onlyElement(editor).id;
    editor.setSelection([id]);
    expect(editor.getSelection().selectedIds).toEqual([id]);
    editor.clearSelection();
    expect(editor.getSelection().selectedIds).toEqual([]);
    expect(seen).toContain("document");
    expect(seen).toContain("selection");
  });

  it("loads documents and clears history", () => {
    const { editor } = setup();
    editor.dispatch(createElementsCommand([createRectangle({ width: 1, height: 1 })]));
    const fresh = createEmptyDocument("Fresh");
    editor.loadDocument(fresh);
    expect(editor.getDocument().name).toBe("Fresh");
    expect(editor.canUndo()).toBe(false);
  });

  it("bumps the version on every mutation", () => {
    const { editor } = setup();
    const v0 = editor.getVersion();
    editor.dispatch(createElementsCommand([createRectangle({ width: 1, height: 1 })]));
    expect(editor.getVersion()).toBeGreaterThan(v0);
  });
});

describe("clipboard", () => {
  it("round-trips elements and drops corrupt entries", () => {
    const valid = createRectangle({ x: 1, y: 2, width: 3, height: 4 });
    const json = serializeElementsForClipboard([valid]);
    const parsed = parseClipboardPayload(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.id).toBe(valid.id);
    expect(parseClipboardPayload("garbage")).toEqual([]);
    expect(
      parseClipboardPayload(JSON.stringify({ elements: [{ type: "nope" }, valid] })),
    ).toHaveLength(1);
  });
});

describe("persistence contract", () => {
  it("saves and reloads through serialize/parse", async () => {
    const memory = new Map<string, string>();
    const persistence: DocumentPersistence = {
      save: (document) => {
        memory.set(document.id, serializeDocument(document));
        return Promise.resolve();
      },
      load: (documentId) => {
        const raw = memory.get(documentId);
        if (raw === undefined) return Promise.resolve(null);
        return Promise.resolve(parseDocument(raw));
      },
      delete: (documentId) => {
        memory.delete(documentId);
        return Promise.resolve();
      },
    };
    const doc = createEmptyDocument();
    getActivePage(doc).elements.push(createRectangle({ width: 7, height: 8 }));
    await persistence.save(doc);
    const loaded = await persistence.load(doc.id);
    expect(loaded?.pages[0]?.elements).toHaveLength(1);
    expect(await persistence.load("missing")).toBeNull();
    await persistence.delete(doc.id);
    expect(await persistence.load(doc.id)).toBeNull();
  });
});
