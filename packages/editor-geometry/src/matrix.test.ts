import { describe, expect, it } from "vitest";
import {
  applyMatrix,
  identityMatrix,
  invertMatrix,
  multiplyMatrices,
  rotationMatrix,
  scaleMatrix,
  translationMatrix,
} from "./primitives/matrix.js";
import { pointsEqual } from "./primitives/point.js";

describe("affine matrices", () => {
  it("applies identity as a no-op", () => {
    expect(applyMatrix(identityMatrix(), { x: -4.5, y: 9.25 })).toEqual({ x: -4.5, y: 9.25 });
  });

  it("translates and scales", () => {
    expect(applyMatrix(translationMatrix(3, -2), { x: 1, y: 1 })).toEqual({ x: 4, y: -1 });
    expect(applyMatrix(scaleMatrix(2, 0.5), { x: 3, y: 4 })).toEqual({ x: 6, y: 2 });
  });

  it("scales about an origin", () => {
    expect(applyMatrix(scaleMatrix(2, 2, { x: 1, y: 1 }), { x: 2, y: 3 })).toEqual({
      x: 3,
      y: 5,
    });
  });

  it("rotates 90 degrees", () => {
    expect(
      pointsEqual(applyMatrix(rotationMatrix(Math.PI / 2), { x: 1, y: 0 }), { x: 0, y: 1 }),
    ).toBe(true);
  });

  it("composes in the documented order (m2 first)", () => {
    const composed = multiplyMatrices(translationMatrix(10, 0), scaleMatrix(2, 2));
    expect(applyMatrix(composed, { x: 1, y: 1 })).toEqual({ x: 12, y: 2 });
  });

  it("inverts translations and round-trips arbitrary transforms", () => {
    const m = multiplyMatrices(translationMatrix(5, -7), rotationMatrix(0.7));
    const inv = invertMatrix(m);
    expect(inv).toBeDefined();
    if (inv === undefined) return;
    const p = { x: 12.5, y: -3.25 };
    expect(pointsEqual(applyMatrix(inv, applyMatrix(m, p)), p, 1e-9)).toBe(true);
  });

  it("reports singular matrices as non-invertible", () => {
    expect(invertMatrix(scaleMatrix(0, 1))).toBeUndefined();
    expect(invertMatrix({ a: 1, b: 2, c: 2, d: 4, e: 0, f: 0 })).toBeUndefined();
  });
});
