import { describe, expect, it, vi } from "vitest";
import type { HistoryEntry } from "@eraser/editor-core";
import { History } from "./history.js";

function entry(label: string, log: string[]): HistoryEntry {
  return {
    label,
    redo: () => {
      log.push(`redo:${label}`);
    },
    undo: () => {
      log.push(`undo:${label}`);
    },
  };
}

describe("history stack", () => {
  it("pushes, undoes, and redoes in order", () => {
    const history = new History();
    const log: string[] = [];
    history.push(entry("a", log));
    history.push(entry("b", log));
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
    history.popUndo()?.undo();
    history.popUndo()?.undo();
    expect(log).toEqual(["undo:b", "undo:a"]);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);
    history.popRedo()?.redo();
    expect(log).toEqual(["undo:b", "undo:a", "redo:a"]);
  });

  it("invalidates redo on push", () => {
    const history = new History();
    history.push(entry("a", []));
    history.popUndo();
    expect(history.canRedo()).toBe(true);
    history.push(entry("b", []));
    expect(history.canRedo()).toBe(false);
  });

  it("enforces the limit from the oldest entries", () => {
    const history = new History({ limit: 2 });
    history.push(entry("a", []));
    history.push(entry("b", []));
    history.push(entry("c", []));
    expect(history.undoDepth()).toBe(2);
    expect(history.popUndo()?.label).toBe("c");
    expect(history.popUndo()?.label).toBe("b");
    expect(history.popUndo()).toBeUndefined();
  });

  it("clears and notifies subscribers", () => {
    const history = new History();
    const listener = vi.fn();
    history.subscribe(listener);
    history.push(entry("a", []));
    expect(listener).toHaveBeenCalledTimes(1);
    history.clear();
    expect(history.canUndo()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
