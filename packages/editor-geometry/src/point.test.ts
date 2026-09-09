import { describe, expect, it } from "vitest";
import {
  add,
  angleOf,
  createPoint,
  cross,
  distance,
  dot,
  lerp,
  length,
  midpoint,
  normalize,
  pointsEqual,
  rotatePoint,
  scale,
  subtract,
  translatePoint,
  vectorFromAngle,
} from "./primitives/point.js";
import { EPSILON } from "./epsilon.js";

describe("point arithmetic", () => {
  it("adds and subtracts, including negatives", () => {
    expect(add({ x: 1, y: -2 }, { x: -3, y: 4 })).toEqual({ x: -2, y: 2 });
    expect(subtract({ x: 1, y: -2 }, { x: -3, y: 4 })).toEqual({ x: 4, y: -6 });
  });

  it("scales and translates, including fractional values", () => {
    expect(scale({ x: 2.5, y: -0.5 }, 2)).toEqual({ x: 5, y: -1 });
    expect(translatePoint({ x: 1.25, y: 2.5 }, -0.25, 0.5)).toEqual({ x: 1, y: 3 });
  });

  it("computes dot and cross products", () => {
    expect(dot({ x: 1, y: 2 }, { x: 3, y: 4 })).toBe(11);
    expect(cross({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(1);
    expect(cross({ x: 2, y: 2 }, { x: -2, y: -2 })).toBe(0);
  });

  it("measures distance, including very large coordinates", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(distance({ x: -1e9, y: 0 }, { x: 1e9, y: 0 })).toBe(2e9);
    expect(distance({ x: 0.1, y: 0.2 }, { x: 0.1, y: 0.2 })).toBe(0);
  });

  it("normalizes, mapping the zero vector to itself", () => {
    const n = normalize({ x: 3, y: 4 });
    expect(n.x).toBeCloseTo(0.6, 12);
    expect(n.y).toBeCloseTo(0.8, 12);
    expect(length(n)).toBeCloseTo(1, 12);
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it("lerps and finds midpoints", () => {
    expect(lerp({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.25)).toEqual({ x: 2.5, y: 5 });
    expect(midpoint({ x: -4, y: 8 }, { x: 4, y: -8 })).toEqual({ x: 0, y: 0 });
  });

  it("rotates 90/180/360 degrees exactly", () => {
    expect(pointsEqual(rotatePoint({ x: 1, y: 0 }, Math.PI / 2), { x: 0, y: 1 })).toBe(true);
    expect(pointsEqual(rotatePoint({ x: 1, y: 1 }, Math.PI), { x: -1, y: -1 })).toBe(true);
    expect(pointsEqual(rotatePoint({ x: -3, y: 7 }, Math.PI * 2), { x: -3, y: 7 })).toBe(true);
  });

  it("rotates around an arbitrary origin", () => {
    const rotated = rotatePoint({ x: 2, y: 0 }, Math.PI / 2, { x: 1, y: 0 });
    expect(pointsEqual(rotated, { x: 1, y: 1 })).toBe(true);
  });

  it("compares with epsilon tolerance", () => {
    expect(pointsEqual({ x: 0, y: 0 }, { x: EPSILON / 2, y: 0 })).toBe(true);
    expect(pointsEqual({ x: 0, y: 0 }, { x: 1e-6, y: 0 })).toBe(false);
  });

  it("derives angles and vectors", () => {
    expect(angleOf({ x: 1, y: 0 })).toBeCloseTo(0, 12);
    expect(angleOf({ x: 0, y: 0 })).toBe(0);
    expect(pointsEqual(vectorFromAngle(Math.PI / 2), { x: 0, y: 1 })).toBe(true);
    expect(createPoint()).toEqual({ x: 0, y: 0 });
  });
});
