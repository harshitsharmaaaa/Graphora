/**
 * Camera — the single mapping between world and screen space.
 *
 * Convention:
 * - **World coordinates are the source of truth.** Documents store world
 *   units only; screen coordinates are derived per frame and never persisted.
 * - Screen space is CSS pixels relative to the canvas top-left.
 * - `camera.x`/`camera.y` is the world point at the viewport center.
 * - `zoom` is a linear scale (1 = 100%).
 * - All functions are pure: they take a camera and return a new one.
 */
import type { Bounds, Point, Rect } from "@eraser/shared-types";
import { clamp } from "@eraser/editor-geometry";

export interface CameraState {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
export const DEFAULT_ZOOM = 1;

/** Clamp a zoom level into the supported range. */
export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return DEFAULT_ZOOM;
  return clamp(zoom, MIN_ZOOM, MAX_ZOOM);
}

export function createCamera(partial: Partial<CameraState> = {}): CameraState {
  return {
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    zoom: clampZoom(partial.zoom ?? DEFAULT_ZOOM),
  };
}

/** World → screen (CSS pixels from the canvas top-left). */
export function worldToScreen(point: Point, camera: CameraState, viewport: ViewportSize): Point {
  return {
    x: (point.x - camera.x) * camera.zoom + viewport.width / 2,
    y: (point.y - camera.y) * camera.zoom + viewport.height / 2,
  };
}

/** Screen → world. Exact inverse of {@link worldToScreen}. */
export function screenToWorld(screen: Point, camera: CameraState, viewport: ViewportSize): Point {
  return {
    x: (screen.x - viewport.width / 2) / camera.zoom + camera.x,
    y: (screen.y - viewport.height / 2) / camera.zoom + camera.y,
  };
}

/** World bounds → screen rect (camera has no rotation, so this stays exact). */
export function worldBoundsToScreen(
  bounds: Bounds,
  camera: CameraState,
  viewport: ViewportSize,
): Rect {
  const topLeft = worldToScreen({ x: bounds.minX, y: bounds.minY }, camera, viewport);
  return {
    x: topLeft.x,
    y: topLeft.y,
    w: (bounds.maxX - bounds.minX) * camera.zoom,
    h: (bounds.maxY - bounds.minY) * camera.zoom,
  };
}

/** Screen rect → world bounds. */
export function screenRectToWorld(rect: Rect, camera: CameraState, viewport: ViewportSize): Bounds {
  const a = screenToWorld({ x: rect.x, y: rect.y }, camera, viewport);
  const b = screenToWorld({ x: rect.x + rect.w, y: rect.y + rect.h }, camera, viewport);
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}

/** Pan by a screen-space delta (drag right moves the world right). */
export function panCamera(camera: CameraState, dxScreen: number, dyScreen: number): CameraState {
  return {
    ...camera,
    x: camera.x - dxScreen / camera.zoom,
    y: camera.y - dyScreen / camera.zoom,
  };
}

/**
 * Zoom keeping the world point under `screenAnchor` fixed on screen.
 * This is the cursor-anchored zoom invariant the whole canvas relies on.
 */
export function zoomCameraAt(
  camera: CameraState,
  viewport: ViewportSize,
  screenAnchor: Point,
  newZoom: number,
): CameraState {
  const zoom = clampZoom(newZoom);
  const world = screenToWorld(screenAnchor, camera, viewport);
  return {
    x: world.x - (screenAnchor.x - viewport.width / 2) / zoom,
    y: world.y - (screenAnchor.y - viewport.height / 2) / zoom,
    zoom,
  };
}

/** Relative zoom around an anchor (factor > 1 zooms in). */
export function zoomCameraBy(
  camera: CameraState,
  viewport: ViewportSize,
  screenAnchor: Point,
  factor: number,
): CameraState {
  if (!Number.isFinite(factor) || factor <= 0) return camera;
  return zoomCameraAt(camera, viewport, screenAnchor, camera.zoom * factor);
}

/** Frame `bounds` with `padding` screen pixels around it. */
export function fitCameraToBounds(
  camera: CameraState,
  viewport: ViewportSize,
  bounds: Bounds | undefined,
  padding = 64,
): CameraState {
  if (bounds === undefined) return camera;
  const contentW = Math.max(0, bounds.maxX - bounds.minX);
  const contentH = Math.max(0, bounds.maxY - bounds.minY);
  const availW = Math.max(1, viewport.width - padding * 2);
  const availH = Math.max(1, viewport.height - padding * 2);
  if (contentW <= 0 || contentH <= 0) {
    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
      zoom: camera.zoom,
    };
  }
  const zoom = clampZoom(Math.min(availW / contentW, availH / contentH));
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    zoom,
  };
}

/** Back to origin at 100%. */
export function resetCamera(): CameraState {
  return { x: 0, y: 0, zoom: DEFAULT_ZOOM };
}
