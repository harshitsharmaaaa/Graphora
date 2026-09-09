import { describe, expect, it } from "vitest";
import { documentSchema, elementSchema } from "./index.js";

function validRectangle() {
  return {
    id: "el-1",
    type: "rectangle",
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    rotation: 0,
    opacity: 1,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    roundness: 0,
    locked: false,
    zIndex: 0,
    createdAt: 1,
    updatedAt: 1,
  };
}

function validDocument() {
  return {
    id: "doc-1",
    version: 1,
    name: "Untitled",
    pages: [{ id: "page-1", name: "Page 1", elements: [validRectangle()] }],
    activePageId: "page-1",
    assets: {},
    metadata: { createdAt: 1, updatedAt: 1 },
  };
}

describe("element schemas", () => {
  it("accepts every element type with valid payloads", () => {
    const base = validRectangle();
    const variants: Record<string, unknown>[] = [
      { ...base, type: "ellipse" },
      { ...base, type: "diamond" },
      {
        ...base,
        type: "line",
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
      },
      {
        ...base,
        type: "arrow",
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        startArrowhead: "none",
        endArrowhead: "triangle",
      },
      { ...base, type: "freehand", points: [{ x: 0, y: 0 }] },
      {
        ...base,
        type: "text",
        text: "hi",
        fontSize: 20,
        fontFamily: "Inter",
        fontWeight: 400,
        textAlign: "left",
        lineHeight: 1.25,
      },
      { ...base, type: "image", assetId: "a-1", naturalWidth: 100, naturalHeight: 50 },
      { ...base, type: "frame", name: "Frame" },
    ];
    for (const variant of variants) {
      expect(elementSchema.safeParse(variant).success).toBe(true);
    }
  });

  it("rejects unknown types, NaN coordinates, and bad enums", () => {
    const base = validRectangle();
    expect(elementSchema.safeParse({ ...base, type: "circle" }).success).toBe(false);
    expect(elementSchema.safeParse({ ...base, x: Number.NaN }).success).toBe(false);
    expect(elementSchema.safeParse({ ...base, x: Number.POSITIVE_INFINITY }).success).toBe(false);
    expect(elementSchema.safeParse({ ...base, strokeStyle: "wavy" }).success).toBe(false);
    expect(elementSchema.safeParse({ ...base, opacity: 2 }).success).toBe(false);
    expect(
      elementSchema.safeParse({ ...base, type: "line", points: [{ x: 0, y: 0 }] }).success,
    ).toBe(false);
  });
});

describe("document schema", () => {
  it("accepts a valid document", () => {
    expect(documentSchema.safeParse(validDocument()).success).toBe(true);
  });

  it("defaults missing assets and rejects empty pages or bad versions", () => {
    const { assets: _assets, ...withoutAssets } = validDocument();
    const parsed = documentSchema.safeParse(withoutAssets);
    expect(parsed.success).toBe(true);
    expect(documentSchema.safeParse({ ...validDocument(), pages: [] }).success).toBe(false);
    expect(documentSchema.safeParse({ ...validDocument(), version: 0 }).success).toBe(false);
    expect(documentSchema.safeParse({ ...validDocument(), version: 999 }).success).toBe(true);
  });
});
