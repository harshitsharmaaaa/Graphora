import { describe, expect, it } from "vitest";
import {
  boundsCenter,
  boundsIntersect,
  boundsOfPointCloud,
  boundsSize,
  boundsToRect,
  inflateBounds,
  normalizeRect,
  pointInBounds,
  rectToBounds,
  translateBounds,
  unionAllBounds,
  unionBounds,
} from "./primitives/rect.js";

describe("rect and bounds", () => {
  it("normalizes negative sizes", () => {
    expect(normalizeRect({ x: 10, y: 10, w: -4, h: -6 })).toEqual({ x: 6, y: 4, w: 4, h: 6 });
    expect(normalizeRect({ x: -5, y: 0, w: 0, h: 0 })).toEqual({ x: -5, y: 0, w: 0, h: 0 });
  });

  it("converts between rect and bounds, normalizing inverted bounds", () => {
    expect(rectToBounds({ x: 1, y: 2, w: 3, h: 4 })).toEqual({
      minX: 1,
      minY: 2,
      maxX: 4,
      maxY: 6,
    });
    expect(boundsToRect({ minX: 4, minY: 6, maxX: 1, maxY: 2 })).toEqual({
      x: 1,
      y: 2,
      w: 3,
      h: 4,
    });
  });

  it("unions bounds across quadrants", () => {
    const u = unionBounds(
      { minX: -10, minY: -10, maxX: 0, maxY: 0 },
      { minX: -5, minY: 5, maxX: 10, maxY: 20 },
    );
    expect(u).toEqual({ minX: -10, minY: -10, maxX: 10, maxY: 20 });
    expect(unionAllBounds([])).toBeUndefined();
    expect(
      unionAllBounds([
        { minX: 0, minY: 0, maxX: 1, maxY: 1 },
        { minX: 2, minY: 2, maxX: 3, maxY: 3 },
      ]),
    ).toEqual({ minX: 0, minY: 0, maxX: 3, maxY: 3 });
  });

  it("computes center, size, translation, inflation", () => {
    const b = { minX: -4, minY: 0, maxX: 4, maxY: 8 };
    expect(boundsCenter(b)).toEqual({ x: 0, y: 4 });
    expect(boundsSize(b)).toEqual({ w: 8, h: 8 });
    expect(translateBounds(b, 1.5, -2)).toEqual({ minX: -2.5, minY: -2, maxX: 5.5, maxY: 6 });
    expect(inflateBounds(b, 2)).toEqual({ minX: -6, minY: -2, maxX: 6, maxY: 10 });
  });

  it("tests containment with tolerance", () => {
    const b = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    expect(pointInBounds({ x: 10, y: 10 }, b)).toBe(true);
    expect(pointInBounds({ x: 10.5, y: 5 }, b)).toBe(false);
    expect(pointInBounds({ x: 10.5, y: 5 }, b, 1)).toBe(true);
  });

  it("treats edge-touching as intersecting", () => {
    const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    expect(boundsIntersect(a, { minX: 10, minY: 0, maxX: 20, maxY: 10 })).toBe(true);
    expect(boundsIntersect(a, { minX: 11, minY: 0, maxX: 20, maxY: 10 })).toBe(false);
  });

  it("bounds point clouds with padding, empty cloud yields undefined", () => {
    expect(boundsOfPointCloud([])).toBeUndefined();
    expect(
      boundsOfPointCloud(
        [
          { x: -1.5, y: 2 },
          { x: 3.25, y: -4 },
        ],
        1,
      ),
    ).toEqual({ minX: -2.5, minY: -5, maxX: 4.25, maxY: 3 });
  });
});
