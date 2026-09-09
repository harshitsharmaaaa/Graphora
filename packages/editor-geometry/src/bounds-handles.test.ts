import { describe, expect, it } from "vitest";
import { getRotatedBounds } from "./bounds/element-bounds.js";
import {
  getResizeHandlePosition,
  getRotationHandlePosition,
  hitResizeHandle,
  hitRotationHandle,
} from "./handles.js";

describe("rotated bounds", () => {
  it("equals plain bounds at 0 degrees (360 carries float dust)", () => {
    expect(getRotatedBounds({ x: 0, y: 0, w: 10, h: 20 }, 0)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 20,
    });
    const full = getRotatedBounds({ x: 0, y: 0, w: 10, h: 20 }, 360);
    expect(full.minX).toBeCloseTo(0, 9);
    expect(full.minY).toBeCloseTo(0, 9);
    expect(full.maxX).toBeCloseTo(10, 9);
    expect(full.maxY).toBeCloseTo(20, 9);
  });

  it("orbits the frame about its center at 90 degrees", () => {
    // Center (5,10); corners swing to x ∈ [-5,15], y ∈ [5,15].
    const b = getRotatedBounds({ x: 0, y: 0, w: 10, h: 20 }, 90);
    expect(b.minX).toBeCloseTo(-5, 9);
    expect(b.maxX).toBeCloseTo(15, 9);
    expect(b.minY).toBeCloseTo(5, 9);
    expect(b.maxY).toBeCloseTo(15, 9);
  });

  it("grows a square rotated 45 degrees", () => {
    const b = getRotatedBounds({ x: -5, y: -5, w: 10, h: 10 }, 45);
    const half = 5 * Math.SQRT2;
    expect(b.minX).toBeCloseTo(-half, 9);
    expect(b.maxX).toBeCloseTo(half, 9);
    expect(b.minY).toBeCloseTo(-half, 9);
    expect(b.maxY).toBeCloseTo(half, 9);
  });

  it("handles negative origins and fractional sizes", () => {
    const b = getRotatedBounds({ x: -100.5, y: 50.25, w: 0.5, h: 0.25 }, 180);
    expect(b.minX).toBeCloseTo(-100.5, 9);
    expect(b.maxX).toBeCloseTo(-100, 9);
  });
});

describe("selection handles", () => {
  const bounds = { x: 100, y: 100, w: 200, h: 100 };

  it("lays out eight handles", () => {
    expect(getResizeHandlePosition(bounds, "top-left")).toEqual({ x: 100, y: 100 });
    expect(getResizeHandlePosition(bounds, "bottom-right")).toEqual({ x: 300, y: 200 });
    expect(getResizeHandlePosition(bounds, "top")).toEqual({ x: 200, y: 100 });
    expect(getRotationHandlePosition(bounds)).toEqual({ x: 200, y: 72 });
  });

  it("hit-tests handles with corner priority", () => {
    expect(hitResizeHandle({ x: 100, y: 100 }, bounds)).toBe("top-left");
    expect(hitResizeHandle({ x: 200, y: 100 }, bounds)).toBe("top");
    expect(hitResizeHandle({ x: 300, y: 150 }, bounds)).toBe("right");
    expect(hitResizeHandle({ x: 200, y: 150 }, bounds)).toBeUndefined();
    expect(hitRotationHandle({ x: 200, y: 72 }, bounds)).toBe(true);
    expect(hitRotationHandle({ x: 200, y: 100 }, bounds)).toBe(false);
  });
});
