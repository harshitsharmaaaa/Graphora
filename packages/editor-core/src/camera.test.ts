import { describe, expect, it } from "vitest";
import {
  clampZoom,
  createCamera,
  fitCameraToBounds,
  panCamera,
  resetCamera,
  screenRectToWorld,
  screenToWorld,
  worldBoundsToScreen,
  worldToScreen,
  zoomCameraAt,
} from "./camera/index.js";

const viewport = { width: 800, height: 600 };

function expectRoundTrip(world: { x: number; y: number }, zoom: number): void {
  const camera = createCamera({ x: -40.5, y: 123.25, zoom });
  const screen = worldToScreen(world, camera, viewport);
  const back = screenToWorld(screen, camera, viewport);
  expect(Math.abs(back.x - world.x)).toBeLessThan(1e-9);
  expect(Math.abs(back.y - world.y)).toBeLessThan(1e-9);
}

describe("camera transforms", () => {
  it("round-trips world/screen across coordinate regimes", () => {
    expectRoundTrip({ x: 0, y: 0 }, 1);
    expectRoundTrip({ x: -1000.5, y: -2000.25 }, 0.25);
    expectRoundTrip({ x: 1e9, y: -1e9 }, 2);
    expectRoundTrip({ x: 0.125, y: -0.375 }, 4);
  });

  it("maps bounds both ways", () => {
    const camera = createCamera({ x: 0, y: 0, zoom: 2 });
    const screen = worldBoundsToScreen(
      { minX: -10, minY: -10, maxX: 10, maxY: 10 },
      camera,
      viewport,
    );
    expect(screen).toEqual({ x: 380, y: 280, w: 40, h: 40 });
    const back = screenRectToWorld(screen, camera, viewport);
    expect(back.minX).toBeCloseTo(-10, 9);
    expect(back.maxX).toBeCloseTo(10, 9);
  });

  it("keeps the world point under the cursor fixed while zooming", () => {
    const anchors = [
      { x: 400, y: 300 },
      { x: 0, y: 0 },
      { x: 799.5, y: 599.5 },
    ];
    for (const anchor of anchors) {
      for (const target of [0.2, 0.5, 2, 5, 8]) {
        const before = createCamera({ x: 37.5, y: -91.25, zoom: 1 });
        const worldBefore = screenToWorld(anchor, before, viewport);
        const after = zoomCameraAt(before, viewport, anchor, target);
        const pinned = worldToScreen(worldBefore, after, viewport);
        expect(Math.abs(pinned.x - anchor.x)).toBeLessThan(1e-9);
        expect(Math.abs(pinned.y - anchor.y)).toBeLessThan(1e-9);
        expect(after.zoom).toBe(target);
      }
    }
  });

  it("pans in screen space scaled by zoom", () => {
    const camera = createCamera({ x: 0, y: 0, zoom: 2 });
    expect(panCamera(camera, 100, -50)).toEqual({ x: -50, y: 25, zoom: 2 });
  });

  it("fits content with centering", () => {
    const camera = createCamera();
    const fitted = fitCameraToBounds(
      camera,
      viewport,
      { minX: 0, minY: 0, maxX: 400, maxY: 300 },
      0,
    );
    expect(fitted.x).toBe(200);
    expect(fitted.y).toBe(150);
    expect(fitted.zoom).toBe(2);
    expect(fitCameraToBounds(camera, viewport, undefined)).toEqual(camera);
  });

  it("clamps zoom and resets", () => {
    expect(clampZoom(0.01)).toBe(0.1);
    expect(clampZoom(100)).toBe(8);
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(resetCamera()).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});
