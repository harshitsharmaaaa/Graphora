import { describe, expect, it } from "vitest";
import { pointsEqual } from "./primitives/point.js";
import { normalizeAngleDeg, rotatePointDeg, snapAngleDeg } from "./transforms/rotation.js";
import { resizeRect } from "./transforms/resize.js";

describe("rotation helpers", () => {
  it("converts and normalizes angles", () => {
    expect(normalizeAngleDeg(720)).toBe(0);
    expect(normalizeAngleDeg(-90)).toBe(270);
    expect(normalizeAngleDeg(450.5)).toBeCloseTo(90.5, 12);
  });

  it("snaps to increments", () => {
    expect(snapAngleDeg(47)).toBe(45);
    expect(snapAngleDeg(52.4)).toBe(45);
    expect(snapAngleDeg(52.6)).toBe(60);
    expect(snapAngleDeg(-7)).toBe(0);
  });

  it("rotates points in degrees", () => {
    expect(pointsEqual(rotatePointDeg({ x: 1, y: 0 }, { x: 0, y: 0 }, 90), { x: 0, y: 1 })).toBe(
      true,
    );
    expect(pointsEqual(rotatePointDeg({ x: 2, y: 1 }, { x: 2, y: 1 }, 123), { x: 2, y: 1 })).toBe(
      true,
    );
  });
});

describe("resizeRect", () => {
  const base = { x: 0, y: 0, w: 100, h: 50 };

  it("drags each corner", () => {
    expect(resizeRect(base, "bottom-right", { x: 10, y: 20 })).toEqual({
      x: 0,
      y: 0,
      w: 110,
      h: 70,
    });
    expect(resizeRect(base, "top-left", { x: 10, y: 20 })).toEqual({
      x: 10,
      y: 20,
      w: 90,
      h: 30,
    });
  });

  it("drags edges", () => {
    expect(resizeRect(base, "right", { x: -30, y: 999 })).toEqual({ x: 0, y: 0, w: 70, h: 50 });
    expect(resizeRect(base, "top", { x: 999, y: 10 })).toEqual({ x: 0, y: 10, w: 100, h: 40 });
  });

  it("clamps at the minimum size instead of inverting", () => {
    expect(resizeRect(base, "left", { x: 500, y: 0 })).toEqual({ x: 99, y: 0, w: 1, h: 50 });
    expect(resizeRect(base, "top", { x: 0, y: 500 })).toEqual({ x: 0, y: 49, w: 100, h: 1 });
  });

  it("resizes from the center with Alt", () => {
    expect(resizeRect(base, "right", { x: 10, y: 0 }, { fromCenter: true })).toEqual({
      x: -10,
      y: 0,
      w: 120,
      h: 50,
    });
    expect(resizeRect(base, "bottom-right", { x: 10, y: 10 }, { fromCenter: true })).toEqual({
      x: -10,
      y: -10,
      w: 120,
      h: 70,
    });
  });

  it("preserves aspect ratio with Shift, anchoring the opposite edge", () => {
    // 100x50 dragged wider by 2x → 200x100, left edge fixed, vertically centered.
    expect(resizeRect(base, "right", { x: 100, y: 0 }, { preserveAspect: true })).toEqual({
      x: 0,
      y: -25,
      w: 200,
      h: 100,
    });
    // Drag top-left: anchor stays bottom-right.
    expect(resizeRect(base, "top-left", { x: -100, y: -50 }, { preserveAspect: true })).toEqual({
      x: -100,
      y: -50,
      w: 200,
      h: 100,
    });
  });

  it("centers aspect-locked edge drags on the untouched axis", () => {
    // Pure vertical drag doubles height → width doubles, centered horizontally.
    expect(resizeRect(base, "bottom", { x: 0, y: 50 }, { preserveAspect: true })).toEqual({
      x: -50,
      y: 0,
      w: 200,
      h: 100,
    });
  });

  it("keeps zero-sized rects resizable", () => {
    const grown = resizeRect({ x: 5, y: 5, w: 0, h: 0 }, "bottom-right", { x: 10, y: 10 });
    expect(grown).toEqual({ x: 5, y: 5, w: 10, h: 10 });
  });

  it("handles negative and fractional inputs", () => {
    expect(resizeRect({ x: -20.5, y: -10, w: 40, h: 20 }, "left", { x: -0.5, y: 0 })).toEqual({
      x: -21,
      y: -10,
      w: 40.5,
      h: 20,
    });
  });
});
