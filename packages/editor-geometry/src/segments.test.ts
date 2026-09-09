import { describe, expect, it } from "vitest";
import { pointsEqual } from "./primitives/point.js";
import { lineFromPoints, lineIntersection } from "./primitives/line.js";
import {
  closestPointOnSegment,
  distancePointToSegment,
  isDegenerateSegment,
} from "./primitives/segment.js";
import { rectIntersection, segmentIntersection } from "./intersections/index.js";

describe("segments", () => {
  it("detects degenerate segments", () => {
    expect(isDegenerateSegment({ a: { x: 1, y: 1 }, b: { x: 1, y: 1 } })).toBe(true);
    expect(isDegenerateSegment({ a: { x: 0, y: 0 }, b: { x: 0.5, y: 0 } })).toBe(false);
  });

  it("projects onto the segment, clamping past endpoints", () => {
    const seg = { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } };
    expect(closestPointOnSegment({ x: 5, y: 3 }, seg)).toEqual({ x: 5, y: 0 });
    expect(closestPointOnSegment({ x: -4, y: 0 }, seg)).toEqual({ x: 0, y: 0 });
    expect(closestPointOnSegment({ x: 99, y: 1 }, seg)).toEqual({ x: 10, y: 0 });
  });

  it("handles degenerate segments as points", () => {
    const seg = { a: { x: 2, y: 2 }, b: { x: 2, y: 2 } };
    expect(closestPointOnSegment({ x: 5, y: 6 }, seg)).toEqual({ x: 2, y: 2 });
    expect(distancePointToSegment({ x: 5, y: 6 }, seg)).toBe(5);
  });

  it("measures distance with fractional coordinates", () => {
    expect(
      distancePointToSegment({ x: 0.25, y: 0.25 }, { a: { x: 0, y: 0 }, b: { x: 1, y: 0 } }),
    ).toBeCloseTo(0.25, 12);
  });
});

describe("lines", () => {
  it("rejects degenerate lines", () => {
    expect(lineFromPoints({ x: 1, y: 1 }, { x: 1, y: 1 })).toBeUndefined();
  });

  it("intersects crossing lines and rejects parallels", () => {
    const h = lineFromPoints({ x: 0, y: 0 }, { x: 1, y: 0 });
    const v = lineFromPoints({ x: 0, y: 0 }, { x: 0, y: 1 });
    const h2 = lineFromPoints({ x: 0, y: 5 }, { x: 1, y: 5 });
    expect(h).toBeDefined();
    expect(v).toBeDefined();
    expect(h2).toBeDefined();
    if (h === undefined || v === undefined || h2 === undefined) return;
    const cross = lineIntersection(h, v);
    expect(cross !== undefined && pointsEqual(cross, { x: 0, y: 0 })).toBe(true);
    expect(lineIntersection(h, h2)).toBeUndefined();
  });
});

describe("segment intersection", () => {
  it("finds crossings, including at endpoints", () => {
    const cross = segmentIntersection(
      { x: 0, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
      { x: 4, y: 0 },
    );
    expect(cross !== undefined && pointsEqual(cross, { x: 2, y: 2 })).toBe(true);
    const touch = segmentIntersection(
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 3 },
    );
    expect(touch !== undefined && pointsEqual(touch, { x: 2, y: 0 })).toBe(true);
  });

  it("rejects disjoint and parallel segments", () => {
    expect(
      segmentIntersection({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }),
    ).toBeUndefined();
    expect(
      segmentIntersection({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }),
    ).toBeUndefined();
  });
});

describe("rect intersection", () => {
  it("overlaps and touches", () => {
    expect(
      rectIntersection(
        { minX: 0, minY: 0, maxX: 4, maxY: 4 },
        { minX: 2, minY: 2, maxX: 6, maxY: 6 },
      ),
    ).toEqual({ minX: 2, minY: 2, maxX: 4, maxY: 4 });
    expect(
      rectIntersection(
        { minX: 0, minY: 0, maxX: 2, maxY: 2 },
        { minX: 2, minY: 2, maxX: 4, maxY: 4 },
      ),
    ).toEqual({ minX: 2, minY: 2, maxX: 2, maxY: 2 });
    expect(
      rectIntersection(
        { minX: 0, minY: 0, maxX: 1, maxY: 1 },
        { minX: 5, minY: 5, maxX: 6, maxY: 6 },
      ),
    ).toBeUndefined();
  });
});
