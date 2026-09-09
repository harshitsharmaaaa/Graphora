import { describe, expect, it } from "vitest";
import { boundsOfPoints, pointInPolygon, polygonBounds } from "./primitives/polygon.js";

const square = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 4 },
  { x: 0, y: 4 },
];

describe("polygons", () => {
  it("contains interior points and rejects exterior ones", () => {
    expect(pointInPolygon({ x: 2, y: 2 }, square)).toBe(true);
    expect(pointInPolygon({ x: -1, y: 2 }, square)).toBe(false);
    expect(pointInPolygon({ x: 2, y: 5 }, square)).toBe(false);
  });

  it("counts on-edge points as inside, including negative space", () => {
    expect(pointInPolygon({ x: 0, y: 2 }, square)).toBe(true);
    expect(pointInPolygon({ x: 4, y: 4 }, square)).toBe(true);
    const neg = square.map((p) => ({ x: p.x - 10, y: p.y - 10 }));
    expect(pointInPolygon({ x: -8, y: -8 }, neg)).toBe(true);
  });

  it("handles concave shapes", () => {
    const arrow = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 2 },
      { x: 6, y: 2 },
      { x: 3, y: 5 },
      { x: 0, y: 2 },
    ];
    expect(pointInPolygon({ x: 2, y: 1 }, arrow)).toBe(true);
    expect(pointInPolygon({ x: 5, y: 4 }, arrow)).toBe(false);
  });

  it("rejects degenerate rings", () => {
    expect(pointInPolygon({ x: 0, y: 0 }, [])).toBe(false);
    expect(
      pointInPolygon({ x: 0, y: 0 }, [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toBe(false);
  });

  it("computes bounds", () => {
    expect(boundsOfPoints([])).toBeUndefined();
    expect(polygonBounds(square)).toEqual({ minX: 0, minY: 0, maxX: 4, maxY: 4 });
    expect(
      boundsOfPoints([
        { x: -100.5, y: 1e6 },
        { x: 0.125, y: -2 },
      ]),
    ).toEqual({ minX: -100.5, minY: -2, maxX: 0.125, maxY: 1e6 });
  });
});
