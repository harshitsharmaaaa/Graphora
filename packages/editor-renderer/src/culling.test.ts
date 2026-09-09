import { describe, expect, it } from "vitest";
import { createCamera } from "@eraser/editor-core";
import { createEllipse, createRectangle } from "@eraser/editor-elements";
import { getVisibleElements, visibleWorldBounds } from "./viewport/culling.js";

const viewport = { width: 800, height: 600, dpr: 1 };

describe("viewport culling", () => {
  it("keeps visible elements and drops the rest", () => {
    const camera = createCamera({ x: 0, y: 0, zoom: 1 });
    const inside = createRectangle({ x: -10, y: -10, width: 20, height: 20 });
    const far = createRectangle({ x: 10_000, y: 10_000, width: 10, height: 10 });
    const visible = getVisibleElements([inside, far], camera, viewport);
    expect(visible.map((element) => element.id)).toEqual([inside.id]);
  });

  it("keeps edge-touching elements (culling margin)", () => {
    const camera = createCamera({ x: 0, y: 0, zoom: 1 });
    // Viewport spans world x ∈ [-400, 400]; margin extends it by 100.
    const touching = createEllipse({ x: 400, y: 0, width: 50, height: 50 });
    expect(getVisibleElements([touching], camera, viewport)).toHaveLength(1);
    const outside = createEllipse({ x: 600, y: 0, width: 50, height: 50 });
    expect(getVisibleElements([outside], camera, viewport)).toHaveLength(0);
  });

  it("tracks zoomed cameras", () => {
    const camera = createCamera({ x: 0, y: 0, zoom: 0.1 });
    const world = visibleWorldBounds(camera, viewport);
    expect(world.minX).toBeLessThan(-1000);
    expect(world.maxX).toBeGreaterThan(1000);
  });
});
