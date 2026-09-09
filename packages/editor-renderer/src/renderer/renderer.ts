/**
 * `Renderer` — deterministic Canvas 2D pipeline with rAF throttling:
 *
 *   scene elements → viewport culling → z-order sort → element pass
 *     → selection overlays → marquee overlay → canvas
 *
 * The renderer pulls plain state (`RenderState`) every frame; it holds no
 * editor references and subscribes to nothing. High-DPI is handled by
 * sizing the backing store with `viewport.dpr` (see `canvas/canvas.ts`).
 */
import rough from "roughjs";
import { screenRectToWorld, worldBoundsToScreen, worldToScreen } from "@eraser/editor-core";
import { defaultRegistry } from "@eraser/editor-elements";
import type { Element } from "@eraser/editor-elements";
import { setupCanvas } from "../canvas/canvas.js";
import { drawArrow, drawLine } from "../elements/line-arrow.js";
import { drawDiamond, drawEllipse } from "../elements/ellipse-diamond.js";
import { drawFrame, drawImage } from "../elements/image-frame.js";
import { drawFreehand } from "../elements/freehand.js";
import { drawRectangle } from "../elements/rectangle.js";
import { drawText } from "../elements/text.js";
import { drawMarqueeOverlay, drawSelectionOverlay } from "../overlay/selection.js";
import { getVisibleElements } from "../viewport/culling.js";
import { DARK_CANVAS_BACKGROUND, DARK_GRID_COLOR } from "../theme.js";
import { createRoughGenerator } from "../elements/common.js";
import type {
  DrawContext,
  RoughCanvasInstance,
  RoughGeneratorInstance,
} from "../elements/common.js";
import type { ImageResolver, RenderState } from "./types.js";

const GRID_BASE_SPACING = 32;
const GRID_MIN_PX = 12;

export class Renderer {
  private canvas: HTMLCanvasElement | undefined;
  private roughCanvas: RoughCanvasInstance | undefined;
  private readonly generator: RoughGeneratorInstance = createRoughGenerator();
  private imageResolver: ImageResolver | undefined;
  private rafId = 0;
  private pending: RenderState | undefined;
  private disposed = false;

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.roughCanvas = rough.canvas(canvas);
  }

  detach(): void {
    this.canvas = undefined;
    this.roughCanvas = undefined;
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.pending = undefined;
  }

  dispose(): void {
    this.disposed = true;
    this.detach();
  }

  setImageResolver(resolver: ImageResolver | undefined): void {
    this.imageResolver = resolver;
  }

  /** Schedule a frame (coalesces multiple calls into one rAF). */
  requestRender(state: RenderState): void {
    this.pending = state;
    if (this.rafId !== 0 || this.disposed) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      const next = this.pending;
      this.pending = undefined;
      if (next !== undefined) this.renderNow(next);
    });
  }

  /** Draw immediately (used by tests/screenshots and the first frame). */
  renderNow(state: RenderState): void {
    const canvas = this.canvas;
    const roughCanvas = this.roughCanvas;
    if (canvas === undefined || roughCanvas === undefined) return;
    const ctx = setupCanvas(canvas, state.viewport);
    if (ctx === null) return;

    const options = state.options ?? {};
    ctx.fillStyle = options.background ?? DARK_CANVAS_BACKGROUND;
    ctx.fillRect(0, 0, state.viewport.width, state.viewport.height);

    if (options.showGrid === true) {
      this.drawGrid(ctx, state);
    }

    const drawContext: DrawContext = {
      ctx,
      roughCanvas,
      generator: this.generator,
      imageResolver: state.imageResolver ?? this.imageResolver,
    };

    const visible = getVisibleElements(state.elements, state.camera, state.viewport);
    const ordered = [...visible].sort((a, b) => a.zIndex - b.zIndex);
    ctx.save();
    ctx.translate(
      state.viewport.width / 2 - state.camera.x * state.camera.zoom,
      state.viewport.height / 2 - state.camera.y * state.camera.zoom,
    );
    ctx.scale(state.camera.zoom, state.camera.zoom);
    for (const element of ordered) this.drawElement(drawContext, element);
    ctx.restore();

    // Selection is drawn on this same canvas, in canvas-local CSS pixels.
    // Its world bounds use the same registry and camera transform as elements.
    const selected = state.selectedIds ?? [];
    if (selected.length > 0) {
      const wanted = new Set(selected);
      for (const element of ordered) {
        if (!wanted.has(element.id)) continue;
        drawSelectionOverlay(
          ctx,
          worldBoundsToScreen(defaultRegistry.getBounds(element), state.camera, state.viewport),
        );
      }
    }

    if (state.marqueeWorld !== undefined) {
      const screen = worldBoundsToScreen(
        {
          minX: state.marqueeWorld.x,
          minY: state.marqueeWorld.y,
          maxX: state.marqueeWorld.x + state.marqueeWorld.w,
          maxY: state.marqueeWorld.y + state.marqueeWorld.h,
        },
        state.camera,
        state.viewport,
      );
      drawMarqueeOverlay(ctx, screen);
    }
  }

  private drawElement(context: DrawContext, element: Element): void {
    switch (element.type) {
      case "rectangle":
        drawRectangle(context, element);
        return;
      case "ellipse":
        drawEllipse(context, element);
        return;
      case "diamond":
        drawDiamond(context, element);
        return;
      case "line":
        drawLine(context, element);
        return;
      case "arrow":
        drawArrow(context, element);
        return;
      case "freehand":
        drawFreehand(context, element);
        return;
      case "text":
        drawText(context, element);
        return;
      case "image":
        drawImage(context, element);
        return;
      case "frame":
        drawFrame(context, element);
        return;
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D, state: RenderState): void {
    const spacingOption = state.options?.gridSpacing ?? GRID_BASE_SPACING;
    let spacing = spacingOption > 0 ? spacingOption : GRID_BASE_SPACING;
    let guard = 0;
    while (spacing * state.camera.zoom < GRID_MIN_PX && guard < 8) {
      spacing *= 5;
      guard += 1;
    }
    const world = screenRectToWorld(
      { x: 0, y: 0, w: state.viewport.width, h: state.viewport.height },
      state.camera,
      state.viewport,
    );
    const startX = Math.floor(world.minX / spacing) * spacing;
    const startY = Math.floor(world.minY / spacing) * spacing;
    ctx.fillStyle = DARK_GRID_COLOR;
    for (let gx = startX; gx <= world.maxX; gx += spacing) {
      for (let gy = startY; gy <= world.maxY; gy += spacing) {
        const screen = worldToScreen({ x: gx, y: gy }, state.camera, state.viewport);
        ctx.fillRect(screen.x - 1, screen.y - 1, 2, 2);
      }
    }
  }
}

/** Convenience factory (same as `new Renderer`). */
export function createRenderer(): Renderer {
  return new Renderer();
}
