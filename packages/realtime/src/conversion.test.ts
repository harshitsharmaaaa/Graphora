import { describe, expect, it } from "vitest";
import { createEmptyDocument } from "@eraser/editor-core";
import { documentToYDoc, yDocToDocument } from "./conversion.js";

describe("Graphora Y.Doc conversion", () => {
  it("round-trips a document without changing its persisted shape", () => {
    const document = createEmptyDocument("Realtime board");
    const roundTrip = yDocToDocument(documentToYDoc(document));
    expect(roundTrip).toEqual(document);
  });

  it("writes asset keys in deterministic order", () => {
    const document = createEmptyDocument();
    const withAssets = {
      ...document,
      assets: {
        z: { id: "z", mimeType: "image/png" },
        a: { id: "a", mimeType: "image/png" },
      },
    };
    const root = documentToYDoc(withAssets).getMap("graphora");
    const assets = root.get("assets");
    expect(assets instanceof Map ? [...assets.keys()] : [...(assets as { keys(): Iterable<string> }).keys()]).toEqual(["a", "z"]);
  });
});
