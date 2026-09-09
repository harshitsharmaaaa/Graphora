import { describe, expect, it, vi } from "vitest";
import { Editor, getActivePage, setLockedCommand } from "@eraser/editor-core";
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

/** Default camera maps screen (400,300) → world (0,0) at zoom 1. */
function drawRect(
  system: ReturnType<typeof setup>["system"],
  from: readonly [number, number],
  to: readonly [number, number],
): void {
  system.setActiveTool("rectangle");
  system.handlePointerDown(ptr(from[0], from[1]));
  system.handlePointerMove(ptr(to[0], to[1]));
  system.handlePointerUp(ptr(to[0], to[1]));
}

describe("rectangle creation matrix", () => {
  it("normalizes all four drag directions", () => {
    const cases: { from: readonly [number, number]; to: readonly [number, number] }[] = [
      { from: [400, 300], to: [500, 400] }, // TL → BR
      { from: [500, 400], to: [400, 300] }, // BR → TL
      { from: [500, 300], to: [400, 400] }, // TR → BL
      { from: [400, 400], to: [500, 300] }, // BL → TR
    ];
    for (const { from, to } of cases) {
      const { editor, system } = setup();
      drawRect(system, from, to);
      const elements = getActivePage(editor.getDocument()).elements;
      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({ x: 0, y: 0, width: 100, height: 100 });
    }
  });

  it("handles horizontal-only and vertical-only drags", () => {
    const { editor, system } = setup();
    drawRect(system, [400, 300], [550, 300]);
    expect(getActivePage(editor.getDocument()).elements[0]).toMatchObject({
      x: 0,
      y: 0,
      width: 150,
      height: 0,
    });
    const second = setup();
    drawRect(second.system, [400, 300], [400, 380]);
    expect(getActivePage(second.editor.getDocument()).elements[0]).toMatchObject({
      x: 0,
      y: 0,
      width: 0,
      height: 80,
    });
  });

  it("treats a click as default-size creation, not a degenerate rect", () => {
    const { editor, system } = setup();
    system.setActiveTool("rectangle");
    system.handlePointerDown(ptr(400, 300));
    system.handlePointerUp(ptr(401, 301));
    const element = getActivePage(editor.getDocument()).elements[0];
    expect(element).toMatchObject({ x: -80, y: -55, width: 160, height: 110 });
  });

  it("maps screen drags correctly when zoomed", () => {
    const { editor, system } = setup();
    editor.setCamera({ zoom: 2 });
    drawRect(system, [400, 300], [600, 500]);
    expect(getActivePage(editor.getDocument()).elements[0]).toMatchObject({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
  });

  it("maps screen drags correctly when panned", () => {
    const { editor, system } = setup();
    editor.setCamera({ x: 50, y: -25, zoom: 1 });
    drawRect(system, [400, 300], [500, 350]);
    expect(getActivePage(editor.getDocument()).elements[0]).toMatchObject({
      x: 50,
      y: -25,
      width: 100,
      height: 50,
    });
  });

  it("commits one history entry per drag", () => {
    const { editor, system } = setup();
    system.setActiveTool("rectangle");
    system.handlePointerDown(ptr(400, 300));
    for (let i = 1; i <= 10; i += 1) system.handlePointerMove(ptr(400 + i * 10, 300 + i * 10));
    system.handlePointerUp(ptr(500, 400));
    editor.undo();
    expect(getActivePage(editor.getDocument()).elements).toHaveLength(0);
    expect(editor.canUndo()).toBe(false);
  });
});

describe("selection matrix", () => {
  it("selects the topmost overlapping element", () => {
    const { editor, system } = setup();
    drawRect(system, [400, 300], [500, 400]);
    drawRect(system, [400, 300], [500, 400]);
    const elements = getActivePage(editor.getDocument()).elements;
    const topmost = elements[elements.length - 1];
    if (topmost === undefined) throw new Error("Expected elements");
    system.setActiveTool("select");
    system.handlePointerDown(ptr(450, 350));
    system.handlePointerUp(ptr(450, 350));
    expect(editor.getSelection().selectedIds).toEqual([topmost.id]);
  });

  it("click-selects locked elements but never moves them", () => {
    const { editor, system } = setup();
    drawRect(system, [400, 300], [500, 400]);
    const element = getActivePage(editor.getDocument()).elements[0];
    if (element === undefined) throw new Error("Expected an element");
    editor.dispatch(setLockedCommand([element.id], true));
    editor.clearSelection();
    system.setActiveTool("select");
    system.handlePointerDown(ptr(450, 350));
    system.handlePointerUp(ptr(450, 350));
    expect(editor.getSelection().selectedIds).toEqual([element.id]);
    // Dragging a locked selection changes nothing.
    system.handlePointerDown(ptr(450, 350));
    system.handlePointerMove(ptr(550, 450));
    system.handlePointerUp(ptr(550, 450));
    expect(getActivePage(editor.getDocument()).elements[0]).toMatchObject({ x: 0, y: 0 });
  });

  it("marquee skips locked elements", () => {
    const { editor, system } = setup();
    drawRect(system, [400, 300], [500, 400]);
    const element = getActivePage(editor.getDocument()).elements[0];
    if (element === undefined) throw new Error("Expected an element");
    editor.dispatch(setLockedCommand([element.id], true));
    system.setActiveTool("select");
    system.handlePointerDown(ptr(100, 100));
    system.handlePointerMove(ptr(300, 250));
    system.handlePointerUp(ptr(700, 500));
    expect(editor.getSelection().selectedIds).toHaveLength(0);
  });
});

describe("tool lifecycle", () => {
  it("rolls back a creation when switching tools mid-drag", () => {
    const { editor, system } = setup();
    system.setActiveTool("rectangle");
    system.handlePointerDown(ptr(400, 300));
    system.handlePointerMove(ptr(500, 400));
    system.setActiveTool("select");
    expect(getActivePage(editor.getDocument()).elements).toHaveLength(0);
    expect(editor.canUndo()).toBe(false);
    expect(editor.getSelection().selectedIds).toHaveLength(0);
  });

  it("discards previews on Escape without touching history", () => {
    const { editor, system } = setup();
    system.setActiveTool("ellipse");
    system.handlePointerDown(ptr(400, 300));
    system.handlePointerMove(ptr(500, 400));
    system.cancelActiveGesture();
    expect(getActivePage(editor.getDocument()).elements).toHaveLength(0);
    expect(editor.canUndo()).toBe(false);
  });

  it("resizes through the bottom-right handle", () => {
    const { editor, system } = setup();
    drawRect(system, [400, 300], [500, 400]);
    system.setActiveTool("select");
    // Handle sits at screen (500,400) for the 100×100 world rect at zoom 1.
    system.handlePointerDown(ptr(500, 400));
    system.handlePointerMove(ptr(550, 450));
    system.handlePointerUp(ptr(550, 450));
    expect(getActivePage(editor.getDocument()).elements[0]).toMatchObject({
      width: 150,
      height: 150,
    });
    editor.undo();
    expect(getActivePage(editor.getDocument()).elements[0]).toMatchObject({
      width: 100,
      height: 100,
    });
  });

  it("rotates through the rotation handle", () => {
    const { editor, system } = setup();
    drawRect(system, [400, 300], [500, 400]);
    system.setActiveTool("select");
    // Top-center (450,300); rotation handle 28px above at (450,272).
    system.handlePointerDown(ptr(450, 272));
    system.handlePointerMove(ptr(478, 300));
    system.handlePointerUp(ptr(478, 300));
    const rotated = getActivePage(editor.getDocument()).elements[0];
    expect(rotated?.rotation).toBeGreaterThan(25);
    expect(rotated?.rotation).toBeLessThan(35);
    editor.undo();
    expect(getActivePage(editor.getDocument()).elements[0]?.rotation).toBe(0);
  });
});
