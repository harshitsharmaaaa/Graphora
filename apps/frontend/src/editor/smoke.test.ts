import { describe, expect, it } from "vitest";
import { getActivePage } from "@eraser/editor-core";
import { createEditorApp } from "./engine.js";
import { MemoryPersistence } from "../lib/persistence.js";

/**
 * Engine-level end-to-end smoke test (DOM-free): drives the real
 * `EditorApp` wiring — tools, commands, history, clipboard, serialization,
 * persistence — through the full user journey, then reloads into a fresh
 * engine and verifies the document survived.
 *
 * Default camera/viewport maps screen (400,300) → world (0,0) at zoom 1.
 */
function pointer(x: number, y: number) {
  return {
    pointerId: 1,
    button: 0,
    point: { x, y },
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
  };
}

describe("graphora smoke journey", () => {
  it("draws, edits, undoes, persists, and reloads", async () => {
    const persistence = new MemoryPersistence();
    const app = createEditorApp({ persistence });
    app.tools.setViewport({ width: 800, height: 600 });
    await app.load();
    const { editor, tools } = app;
    const elements = () => getActivePage(editor.getDocument()).elements;

    // Rectangle: drag into existence.
    tools.setActiveTool("rectangle");
    tools.handlePointerDown(pointer(400, 300));
    tools.handlePointerMove(pointer(500, 400));
    tools.handlePointerUp(pointer(500, 400));
    expect(elements()).toHaveLength(1);
    expect(elements()[0]).toMatchObject({ x: 0, y: 0, width: 100, height: 100 });

    // Select + move.
    tools.setActiveTool("select");
    tools.handlePointerDown(pointer(450, 350));
    tools.handlePointerMove(pointer(470, 370));
    tools.handlePointerUp(pointer(470, 370));
    expect(elements()[0]).toMatchObject({ x: 20, y: 20 });

    // Resize + rotate + style through editor commands (inspector path).
    const { resizeSingleElement, rotateElementsAbout, changeStyleCommand, replaceElementsCommand } =
      await import("@eraser/editor-core");
    const selected = elements()[0];
    if (selected === undefined) throw new Error("Expected a rectangle");
    editor.dispatch(
      replaceElementsCommand(
        [resizeSingleElement(selected, { handle: "right", deltaWorld: { x: 30, y: 0 } })],
        "Resize",
      ),
    );
    expect(elements()[0]).toMatchObject({ width: 130 });
    const center = { x: 85, y: 70 };
    const rotated = elements()[0];
    if (rotated === undefined) throw new Error("Expected a rectangle");
    editor.dispatch(replaceElementsCommand(rotateElementsAbout([rotated], center, 45), "Rotate"));
    expect(elements()[0]?.rotation).toBe(45);
    const styled = elements()[0];
    if (styled === undefined) throw new Error("Expected a rectangle");
    editor.dispatch(
      changeStyleCommand([styled.id], { backgroundColor: "#ff0000", strokeColor: "#00ff00" }),
    );
    expect(elements()[0]).toMatchObject({ backgroundColor: "#ff0000" });

    // Undo style, redo style.
    editor.undo();
    expect(elements()[0]).toMatchObject({ backgroundColor: "transparent" });
    editor.redo();
    expect(elements()[0]).toMatchObject({ backgroundColor: "#ff0000" });

    // Delete, undo (restores).
    const rectId = elements()[0]?.id;
    if (rectId === undefined) throw new Error("Expected a rectangle");
    editor.setSelection([rectId]);
    expect(app.deleteSelected()).toBe(true);
    expect(elements()).toHaveLength(0);
    editor.undo();
    expect(elements()).toHaveLength(1);

    // Ellipse + arrow + freehand.
    tools.setActiveTool("ellipse");
    tools.handlePointerDown(pointer(100, 100));
    tools.handlePointerMove(pointer(200, 160));
    tools.handlePointerUp(pointer(200, 160));
    tools.setActiveTool("arrow");
    tools.handlePointerDown(pointer(600, 100));
    tools.handlePointerMove(pointer(700, 200));
    tools.handlePointerUp(pointer(700, 200));
    tools.setActiveTool("freehand");
    tools.handlePointerDown(pointer(100, 500));
    tools.handlePointerMove(pointer(130, 510));
    tools.handlePointerMove(pointer(160, 500));
    tools.handlePointerUp(pointer(160, 500));
    expect(elements().map((element) => element.type)).toEqual([
      "rectangle",
      "ellipse",
      "arrow",
      "freehand",
    ]);

    // Text: click opens a session, commit mints exactly one element.
    tools.setActiveTool("text");
    tools.handlePointerDown(pointer(300, 500));
    const session = app.getTextEditSession();
    expect(session).toBeDefined();
    if (session === undefined) throw new Error("Expected a text session");
    app.commitTextEdit(session.elementId, "hello\nworld");
    const text = elements().find((element) => element.type === "text");
    expect(text).toMatchObject({ text: "hello\nworld" });

    // Save, reload into a fresh engine, verify restoration.
    await persistence.save(editor.getDocument());
    const reloaded = createEditorApp({ persistence });
    await reloaded.load();
    const restored = getActivePage(reloaded.editor.getDocument()).elements;
    expect(restored.map((element) => element.type)).toEqual([
      "rectangle",
      "ellipse",
      "arrow",
      "freehand",
      "text",
    ]);
    expect(restored[0]).toMatchObject({ x: 20, y: 20, width: 130, rotation: 45 });
    expect(restored[4]).toMatchObject({ text: "hello\nworld" });

    app.dispose();
    reloaded.dispose();
  });
});
