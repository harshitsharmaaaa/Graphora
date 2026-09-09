import { describe, expect, it } from "vitest";
import { documentSchema, elementSchema } from "@eraser/shared-validation";
import {
  createArrow,
  createDiamond,
  createEllipse,
  createFrame,
  createFreehand,
  createImage,
  createLine,
  createRectangle,
  createText,
} from "./index.js";
import type { Element } from "./types.js";

/**
 * Drift net: every factory product must satisfy the Zod schemas in
 * `@eraser/shared-validation`, and every parsed schema output must remain
 * assignable to the TypeScript `Element` union (compile-time check below).
 */
describe("validation mirror", () => {
  it("accepts all factory products", () => {
    const elements: Element[] = [
      createRectangle({ width: 10, height: 10 }),
      createEllipse({ width: 10, height: 10 }),
      createDiamond({ width: 10, height: 10 }),
      createLine({
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 5 },
        ],
      }),
      createArrow({
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 5 },
        ],
      }),
      createFreehand({
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      }),
      createText({ text: "hello", width: 100, height: 30 }),
      createImage({ assetId: "asset-1", width: 10, height: 10 }),
      createFrame({ width: 200, height: 100 }),
    ];
    for (const element of elements) {
      expect(elementSchema.safeParse(element).success).toBe(true);
    }
    const document = {
      id: "doc-1",
      version: 1,
      name: "Test",
      pages: [{ id: "page-1", name: "Page 1", elements }],
      activePageId: "page-1",
      assets: {},
      metadata: { createdAt: 1, updatedAt: 2 },
    };
    const parsed = documentSchema.safeParse(document);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    // Compile-time drift check: schema output must stay assignable to `Element`.
    const roundTripped: Element[] = parsed.data.pages[0]?.elements ?? [];
    expect(roundTripped).toHaveLength(9);
  });
});
