/**
 * Canvas setup: backing-store sizing for the device pixel ratio and a
 * 2D context normalized back to CSS pixels. All drawing code works in CSS
 * pixels; the camera maps world → screen on top.
 */
import type { Viewport } from "../renderer/types.js";

/** Size the canvas backing store and normalize the context to CSS pixels. */
export function setupCanvas(
  canvas: HTMLCanvasElement,
  viewport: Viewport,
): CanvasRenderingContext2D | null {
  const dpr = viewport.dpr > 0 ? viewport.dpr : 1;
  const width = Math.max(1, Math.round(viewport.width * dpr));
  const height = Math.max(1, Math.round(viewport.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  if (context === null) return null;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = true;
  return context;
}
