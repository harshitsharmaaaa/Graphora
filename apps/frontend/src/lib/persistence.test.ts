import { describe, expect, it } from "vitest";
import { createEmptyDocument, getActivePage } from "@eraser/editor-core";
import { createRectangle } from "@eraser/editor-elements";
import { MemoryPersistence } from "./persistence.js";

describe("memory persistence", () => {
  it("saves, loads, and deletes", async () => {
    const persistence = new MemoryPersistence();
    const document = createEmptyDocument();
    getActivePage(document).elements.push(createRectangle({ width: 7, height: 8 }));
    await persistence.save(document);
    const loaded = await persistence.load(document.id);
    expect(loaded?.pages[0]?.elements).toHaveLength(1);
    expect(await persistence.load("missing")).toBeNull();
    await persistence.delete(document.id);
    expect(await persistence.load(document.id)).toBeNull();
  });
});
