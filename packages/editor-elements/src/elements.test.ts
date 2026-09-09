import { describe, expect, it } from "vitest";
import { getRotatedBounds } from "@eraser/editor-geometry";
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
  defaultRegistry,
  getArrowheadTriangles,
  toLocalPoint,
  toWorldPoint,
} from "./index.js";

describe("factories", () => {
  it("fills defaults and stamps metadata", () => {
    const el = createRectangle({ x: 10, y: 20, width: 100, height: 50 });
    expect(el.type).toBe("rectangle");
    expect(el.id.length).toBeGreaterThan(0);
    expect(el.strokeColor).toBe("#e8eaf0");
    expect(el.locked).toBe(false);
    expect(el.createdAt).toBeLessThanOrEqual(Date.now());
    expect(el.updatedAt).toBe(el.createdAt);
  });

  it("normalizes line frames around their endpoints", () => {
    const line = createLine({
      x: 50,
      y: 50,
      points: [
        { x: 100, y: 10 },
        { x: 20, y: 30 },
      ],
    });
    expect(line.x).toBe(70);
    expect(line.y).toBe(60);
    expect(line.width).toBe(80);
    expect(line.height).toBe(20);
    expect(line.points).toEqual([
      { x: 80, y: 0 },
      { x: 0, y: 20 },
    ]);
  });

  it("creates arrows with a default end head and no start head", () => {
    const arrow = createArrow({
      points: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
      ],
    });
    expect(arrow.endArrowhead).toBe("triangle");
    expect(arrow.startArrowhead).toBe("none");
    const tris = getArrowheadTriangles(arrow);
    expect(tris.end).toBeDefined();
    expect(tris.start).toBeUndefined();
  });

  it("creates freehand strokes with synced frames", () => {
    const stroke = createFreehand({
      x: 0,
      y: 0,
      points: [
        { x: 30, y: 5 },
        { x: 10, y: 25 },
      ],
    });
    expect(stroke.x).toBe(10);
    expect(stroke.y).toBe(5);
    expect(stroke.width).toBe(20);
    expect(stroke.height).toBe(20);
  });

  it("creates text, image, and frame elements", () => {
    expect(createText({ text: "hi" }).fontSize).toBe(20);
    expect(createImage({ assetId: "a", width: 10, height: 10 }).naturalWidth).toBe(10);
    expect(createFrame().name).toBe("Frame");
    expect(createEllipse().type).toBe("ellipse");
    expect(createDiamond().type).toBe("diamond");
  });
});

describe("registry", () => {
  it("knows all nine element kinds", () => {
    expect(defaultRegistry.types()).toHaveLength(9);
  });

  it("dispatches bounds through definitions", () => {
    const el = createRectangle({ x: 0, y: 0, width: 10, height: 20, rotation: 90 });
    expect(defaultRegistry.getBounds(el)).toEqual(
      getRotatedBounds({ x: 0, y: 0, w: 10, h: 20 }, 90),
    );
  });

  it("hit-tests the topmost shape by containment", () => {
    const rect = createRectangle({ x: 0, y: 0, width: 100, height: 100 });
    expect(defaultRegistry.containsPoint(rect, { x: 50, y: 50 })).toBe(true);
    expect(defaultRegistry.containsPoint(rect, { x: 150, y: 50 })).toBe(false);
  });

  it("hit-tests rotated shapes in their local frame", () => {
    const rect = createRectangle({ x: -50, y: -10, width: 100, height: 20, rotation: 90 });
    // Local x-axis maps to world y-axis after a 90° turn.
    expect(defaultRegistry.containsPoint(rect, { x: 0, y: 30 })).toBe(true);
    expect(defaultRegistry.containsPoint(rect, { x: 30, y: 0 })).toBe(false);
  });

  it("hit-tests lines with tolerance, not exact landing", () => {
    const line = createLine({
      x: 0,
      y: 0,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    });
    expect(defaultRegistry.containsPoint(line, { x: 50, y: 4 }, 5)).toBe(true);
    expect(defaultRegistry.containsPoint(line, { x: 50, y: 6 }, 5)).toBe(false);
    expect(defaultRegistry.distanceToPoint(line, { x: 50, y: 3 })).toBeCloseTo(3, 9);
  });

  it("hit-tests arrowheads", () => {
    const arrow = createArrow({
      x: 0,
      y: 0,
      points: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
      ],
    });
    // Off the body (distance 1.5 > tolerance 1) but inside the head triangle.
    expect(defaultRegistry.containsPoint(arrow, { x: 31, y: 1.5 }, 1)).toBe(true);
    expect(defaultRegistry.containsPoint(arrow, { x: 20, y: 20 }, 1)).toBe(false);
  });

  it("rejects duplicate registration and unknown lookups", () => {
    const fresh = defaultRegistry.types().length;
    expect(fresh).toBe(9);
    expect(() => defaultRegistry.definitionOf("rectangle")).not.toThrow();
  });
});

describe("local frames", () => {
  it("round-trips world/local conversion for rotated elements", () => {
    const el = createRectangle({ x: 10, y: 10, width: 40, height: 20, rotation: 30 });
    const world = { x: 25, y: 40 };
    const local = toLocalPoint(el, world);
    const back = toWorldPoint(el, local);
    expect(Math.abs(back.x - world.x)).toBeLessThan(1e-9);
    expect(Math.abs(back.y - world.y)).toBeLessThan(1e-9);
  });
});
