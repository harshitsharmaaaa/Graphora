import { describe, expect, it } from "vitest";
import { isTextEntryTarget, matchShortcutAction, shortcutLabel } from "./shortcuts/shortcuts.js";

describe("shortcuts", () => {
  it("maps tool keys", () => {
    const plain = { ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };
    expect(matchShortcutAction({ ...plain, key: "v" })).toBe("select");
    expect(matchShortcutAction({ ...plain, key: "H" })).toBe("hand");
    expect(matchShortcutAction({ ...plain, key: "r" })).toBe("rectangle");
    expect(matchShortcutAction({ ...plain, key: "e" })).toBe("ellipse");
    expect(matchShortcutAction({ ...plain, key: "d" })).toBe("diamond");
    expect(matchShortcutAction({ ...plain, key: "l" })).toBe("line");
    expect(matchShortcutAction({ ...plain, key: "a" })).toBe("arrow");
    expect(matchShortcutAction({ ...plain, key: "p" })).toBe("freehand");
    expect(matchShortcutAction({ ...plain, key: "t" })).toBe("text");
    expect(matchShortcutAction({ ...plain, key: "i" })).toBe("image");
    expect(matchShortcutAction({ ...plain, key: "f" })).toBe("frame");
  });

  it("maps history/clipboard keys with Ctrl or Cmd", () => {
    for (const mod of [
      { ctrlKey: true, metaKey: false },
      { ctrlKey: false, metaKey: true },
    ]) {
      const base = { ...mod, shiftKey: false, altKey: false };
      expect(matchShortcutAction({ ...base, key: "z" })).toBe("undo");
      expect(matchShortcutAction({ ...base, key: "Z", shiftKey: true })).toBe("redo");
      expect(matchShortcutAction({ ...base, key: "c" })).toBe("copy");
      expect(matchShortcutAction({ ...base, key: "v" })).toBe("paste");
      expect(matchShortcutAction({ ...base, key: "d" })).toBe("duplicate");
    }
    expect(
      matchShortcutAction({
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        key: "z",
      }),
    ).toBeUndefined();
  });

  it("maps delete, cancel, and zoom keys", () => {
    const plain = { ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };
    expect(matchShortcutAction({ ...plain, key: "Delete" })).toBe("delete");
    expect(matchShortcutAction({ ...plain, key: "Backspace" })).toBe("delete");
    expect(matchShortcutAction({ ...plain, key: "Escape" })).toBe("cancel");
    expect(
      matchShortcutAction({
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        key: "=",
      }),
    ).toBe("zoom-in");
  });

  it("labels shortcuts per platform", () => {
    expect(shortcutLabel("undo", "mac")).toBe("⌘Z");
    expect(shortcutLabel("undo", "other")).toBe("Ctrl+Z");
    expect(shortcutLabel("rectangle", "other")).toBe("R");
  });

  it("detects text-entry targets structurally", () => {
    expect(isTextEntryTarget({ tagName: "TEXTAREA" })).toBe(true);
    expect(isTextEntryTarget({ tagName: "div", isContentEditable: true })).toBe(true);
    expect(isTextEntryTarget({ tagName: "div" })).toBe(false);
    expect(isTextEntryTarget(null)).toBe(false);
  });
});
