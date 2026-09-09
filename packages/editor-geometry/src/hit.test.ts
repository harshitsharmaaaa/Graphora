import { describe, expect, it } from "vitest";
import {
  pointInDiamond,
  pointInEllipse,
  pointInRect,
  pointNearPolyline,
} from "./hit-testing/hit.js";

describe("hit predicates", () => {
  it("tests rects with tolerance", () => {
    const rect = { x: 0, y: 0, w: 10, h: 10 };
    expect(pointInRect({ x: 5, y: 5 }, rect)).toBe(true);
    expect(pointInRect({ x: 10, y: 10 }, rect)).toBe(true);
    expect(pointInRect({ x: 10.1, y: 5 }, rect)).toBe(false);
    expect(pointInRect({ x: 10.1, y: 5 }, rect, 0.5)).toBe(true);
    expect(pointInRect({ x: 5, y: 5 }, { x: 10, y: 10, w: -10, h: -10 })).toBe(true);
  });

  it("tests ellipses, collapsing degenerate radii", () => {
    expect(pointInEllipse({ x: 3, y: 0 }, { x: 0, y: 0 }, 4, 2)).toBe(true);
    expect(pointInEllipse({ x: 5, y: 0 }, { x: 0, y: 0 }, 4, 2)).toBe(false);
    expect(pointInEllipse({ x: 0, y: 0 }, { x: 0, y: 0 }, 0, 0)).toBe(true);
    expect(pointInEllipse({ x: 0, y: 3 }, { x: 0, y: 0 }, 4, 0)).toBe(false);
    expect(pointInEllipse({ x: 0, y: 0.4 }, { x: 0, y: 0 }, 4, 0, 0.5)).toBe(true);
  });

  it("tests diamonds, collapsing degenerate extents", () => {
    const center = { x: 0, y: 0 };
    expect(pointInDiamond({ x: 0, y: 0 }, center, 4, 2)).toBe(true);
    expect(pointInDiamond({ x: 4, y: 0 }, center, 4, 2)).toBe(true);
    expect(pointInDiamond({ x: 2, y: 1 }, center, 4, 2)).toBe(true); // 2/4 + 1/2 = 1
    expect(pointInDiamond({ x: 3, y: 1 }, center, 4, 2)).toBe(false); // 3/4 + 1/2 > 1
    expect(pointInDiamond({ x: 3, y: 2 }, center, 4, 2)).toBe(false);
    expect(pointInDiamond({ x: 0, y: 0 }, center, 0, 0)).toBe(true);
  });

  it("tests polylines with tolerance, including degenerate cases", () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(pointNearPolyline({ x: 5, y: 2 }, line, 3)).toBe(true);
    expect(pointNearPolyline({ x: 5, y: 2 }, line, 1)).toBe(false);
    expect(pointNearPolyline({ x: 0, y: 0 }, [], 5)).toBe(false);
    expect(pointNearPolyline({ x: 3, y: 4 }, [{ x: 0, y: 0 }], 5)).toBe(true);
    expect(pointNearPolyline({ x: 3, y: 4 }, [{ x: 0, y: 0 }], 4)).toBe(false);
  });
});
