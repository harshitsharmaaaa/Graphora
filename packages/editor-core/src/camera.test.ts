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

  it("round-trips at every supported zoom with negative positions", () => {
    const points = [
      { x: 0, y: 0 },
      { x: -12.5, y: 44.125 },
      { x: 1000, y: -2000 },
    ];
    const cameras = [
      { x: 0, y: 0 },
      { x: -500.25, y: 300.75 },
      { x: 1e6, y: -1e6 },
    ];
    for (const zoom of [0.1, 0.5, 1, 2, 10]) {
      for (const center of cameras) {
        const camera = createCamera({ ...center, zoom });
        for (const world of points) {
          const screen = worldToScreen(world, camera, viewport);
          const back = screenToWorld(screen, camera, viewport);
          expect(Math.abs(back.x - world.x)).toBeLessThan(1e-6);
          expect(Math.abs(back.y - world.y)).toBeLessThan(1e-6);
        }
      }
    }
  });

  it("round-trips both directions for the full coordinate regression matrix", () => {
    const world = { x: -275.125, y: 430.75 };
    const screen = { x: -120.5, y: 901.25 };
    for (const zoom of [0.25, 0.5, 1, 2, 4, 10]) {
      const camera = { x: -320.5, y: 180.25, zoom };
      const projected = worldToScreen(world, camera, viewport);
      const restoredWorld = screenToWorld(projected, camera, viewport);
      expect(restoredWorld.x).toBeCloseTo(world.x, 10);
      expect(restoredWorld.y).toBeCloseTo(world.y, 10);

      const restoredScreen = worldToScreen(
        screenToWorld(screen, camera, viewport),
        camera,
        viewport,
      );
      expect(restoredScreen.x).toBeCloseTo(screen.x, 10);
      expect(restoredScreen.y).toBeCloseTo(screen.y, 10);
    }
  });

  it("pins the cursor across extreme zoom jumps", () => {
    const anchor = { x: 123.5, y: 477.25 };
    const camera = createCamera({ x: -42, y: 17.5, zoom: 0.1 });
    const world = screenToWorld(anchor, camera, viewport);
    const zoomed = zoomCameraAt(camera, viewport, anchor, 10);
    const pinned = worldToScreen(world, zoomed, viewport);
    expect(Math.abs(pinned.x - anchor.x)).toBeLessThan(1e-6);
    expect(Math.abs(pinned.y - anchor.y)).toBeLessThan(1e-6);
  });
});
