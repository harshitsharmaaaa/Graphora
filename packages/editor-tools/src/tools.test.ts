import { describe, expect, it, vi } from "vitest";
import { Editor, getActivePage } from "@eraser/editor-core";
import type { HistoryEntry, HistoryStore } from "@eraser/editor-core";
import { createDefaultToolSystem } from "./index.js";
import type { RawPointerData, ToolUiHooks } from "./index.js";

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
  const editor = new Editor({ history: new FakeHistory() });
  const ui: ToolUiHooks = {
    requestTextEdit: vi.fn(),
    pickAndStoreImage: () => Promise.resolve(undefined),
  };
  const system = createDefaultToolSystem(editor, ui);
  system.setViewport({ width: 800, height: 600 });
  return { editor, system, ui };
}

/** Screen point (default camera maps screen (400,300) → world (0,0)). */
function ptr(x: number, y: number, extra: Partial<RawPointerData> = {}): RawPointerData {
  return {
    pointerId: 1,
    button: 0,
    point: { x, y },
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    ...extra,
  };
}

describe("tool-driven editing", () => {
  it("drags a rectangle into existence as one undo step", () => {
    const { editor, system } = setup();
    system.setActiveTool("rectangle");
    system.handlePointerDown(ptr(400, 300));
    system.handlePointerMove(ptr(500, 400));
    system.handlePointerUp(ptr(500, 400));
    const elements = getActivePage(editor.getDocument()).elements;
    expect(elements).toHaveLength(1);
    expect(elements[0]).toMatchObject({ x: 0, y: 0, width: 100, height: 100 });
    editor.undo();
    expect(getActivePage(editor.getDocument()).elements).toHaveLength(0);
  });

  it("selects and drag-moves with the select tool", () => {
    const { editor, system } = setup();
    system.setActiveTool("rectangle");
    system.handlePointerDown(ptr(400, 300));
    system.handlePointerMove(ptr(500, 400));
    system.handlePointerUp(ptr(500, 400));
    system.setActiveTool("select");
    system.handlePointerDown(ptr(450, 350));
    expect(editor.getSelection().selectedIds).toHaveLength(1);
    system.handlePointerMove(ptr(470, 370));
    system.handlePointerUp(ptr(470, 370));
    expect(getActivePage(editor.getDocument()).elements[0]).toMatchObject({ x: 20, y: 20 });
    editor.undo();
    expect(getActivePage(editor.getDocument()).elements[0]).toMatchObject({ x: 0, y: 0 });
  });

  it("marquee-selects and shift-toggles", () => {
    const { editor, system } = setup();
    system.setActiveTool("rectangle");
    system.handlePointerDown(ptr(400, 300));
    system.handlePointerMove(ptr(500, 400));
    system.handlePointerUp(ptr(500, 400));
    system.setActiveTool("select");
    // Click empty space clears; drag a marquee around the shape.
    system.handlePointerDown(ptr(100, 100));
    system.handlePointerMove(ptr(300, 250));
    expect(system.getOverlay()?.marqueeWorld).toBeDefined();
    system.handlePointerUp(ptr(700, 500));
    expect(editor.getSelection().selectedIds).toHaveLength(1);
    // Shift-click the selected shape deselects it on release.
    const id = editor.getSelection().selectedIds[0];
    if (id === undefined) throw new Error("Expected a selection");
    system.handlePointerDown(ptr(450, 350, { shiftKey: true }));
    system.handlePointerUp(ptr(450, 350, { shiftKey: true }));
    expect(editor.getSelection().selectedIds).toHaveLength(0);
  });

  it("draws a freehand stroke as one undo step", () => {
    const { editor, system } = setup();
    system.setActiveTool("freehand");
    system.handlePointerDown(ptr(400, 300));
    system.handlePointerMove(ptr(420, 300));
    system.handlePointerMove(ptr(440, 320));
    system.handlePointerUp(ptr(440, 320));
    const elements = getActivePage(editor.getDocument()).elements;
    expect(elements).toHaveLength(1);
    expect(elements[0]?.type).toBe("freehand");
    editor.undo();
    expect(getActivePage(editor.getDocument()).elements).toHaveLength(0);
  });
});
