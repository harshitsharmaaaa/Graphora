import { describe, expect, it } from "vitest";
import { DOCUMENT_SCHEMA_VERSION } from "@eraser/shared-validation";
import { createRectangle } from "@eraser/editor-elements";
import { getActivePage } from "./document/model.js";
import { createEmptyDocument } from "./document/seed.js";
import {
  DOCUMENT_VERSION,
  DocumentParseError,
  parseDocument,
  serializeDocument,
} from "./document/serialization.js";

describe("document model", () => {
  it("seeds a valid empty document", () => {
    const doc = createEmptyDocument();
    expect(doc.pages).toHaveLength(1);
    expect(doc.activePageId).toBe(doc.pages[0]?.id);
    expect(getActivePage(doc).elements).toHaveLength(0);
  });

  it("round-trips through serialize/parse", () => {
    const doc = createEmptyDocument("Board");
    const page = getActivePage(doc);
    page.elements.push(createRectangle({ x: 1, y: 2, width: 3, height: 4 }));
    const parsed = parseDocument(serializeDocument(doc));
    expect(parsed.name).toBe("Board");
    expect(parsed.pages[0]?.elements).toHaveLength(1);
    expect(parsed.pages[0]?.elements[0]).toMatchObject({ x: 1, y: 2, width: 3, height: 4 });
  });

  it("rejects corrupt input with DocumentParseError", () => {
    for (const bad of ["not json", 42, [], {}, { pages: [] }, { id: "x" }]) {
      expect(() => parseDocument(bad)).toThrow(DocumentParseError);
    }
    const doc = createEmptyDocument();
    const tampered = JSON.parse(serializeDocument(doc)) as Record<string, unknown>;
    tampered.pages = [{ id: "p", name: "P", elements: [{ type: "nope" }] }];
    expect(() => parseDocument(tampered)).toThrow(DocumentParseError);
  });

  it("migrates missing versions and rejects future ones", () => {
    const doc = JSON.parse(serializeDocument(createEmptyDocument())) as Record<string, unknown>;
    delete doc.version;
    delete doc.assets;
    expect(parseDocument(doc).version).toBe(1);
    expect(() => parseDocument({ ...doc, version: 999 })).toThrow(DocumentParseError);
  });

  it("falls back to the first page for a stale activePageId", () => {
    const doc = createEmptyDocument();
    const parsed = parseDocument({ ...JSON.parse(serializeDocument(doc)), activePageId: "gone" });
    expect(parsed.activePageId).toBe(parsed.pages[0]?.id);
  });

  it("keeps the version constants in parity", () => {
    expect(DOCUMENT_VERSION).toBe(DOCUMENT_SCHEMA_VERSION);
  });
});
