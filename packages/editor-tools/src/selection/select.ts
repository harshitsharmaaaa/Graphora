/**
 * Select tool: click / shift-click / marquee selection plus direct
 * manipulation (move, resize, rotate). Drag gestures run inside one editor
 * transaction each, so a whole drag is a single undo step. Locked elements
 * can be clicked (to allow unlocking) but never transform.
 */
import { getActivePage, replaceElementsCommand, worldBoundsToScreen } from "@eraser/editor-core";
import type { Bounds, Point, Rect } from "@eraser/shared-types";
import {
  hitResizeHandle,
  hitRotationHandle,
  normalizeAngleDeg,
  radToDeg,
  snapAngleDeg,
} from "@eraser/editor-geometry";
import type { ResizeHandleId } from "@eraser/editor-geometry";
import { defaultRegistry } from "@eraser/editor-elements";
import type { Element } from "@eraser/editor-elements";
import { moveElement, resizeSelectionElements, resizeSingleElement } from "@eraser/editor-core";
import { rotateElementsAbout, selectionPivot } from "@eraser/editor-core";
import type {
  CursorType,
  PointerEventData,
  Tool,
  ToolContext,
  ToolOverlay,
} from "../tool-system/types.js";

const CLICK_SLOP_PX = 4;
const HIT_TOLERANCE_PX = 8;
const SNAP_INCREMENT_DEG = 15;

type DragState =
  | { readonly kind: "idle" }
  | { readonly kind: "marquee"; readonly startWorld: Point; readonly toggle: boolean }
  | {
      readonly kind: "move";
      readonly ids: readonly string[];
      readonly lastWorld: Point;
      readonly downScreen: Point;
      readonly moved: boolean;
      readonly toggleOffId?: string | undefined;
    }
  | {
      readonly kind: "resize";
      readonly handle: ResizeHandleId;
      readonly startWorld: Point;
      readonly originals: readonly Element[];
      readonly selectionBounds: Bounds;
      readonly single: boolean;
    }
  | {
      readonly kind: "rotate";
      readonly center: Point;
      readonly startAngleDeg: number;
      readonly originals: readonly Element[];
    };

function handleCursor(handle: ResizeHandleId): CursorType {
  switch (handle) {
    case "top-left":
    case "bottom-right":
      return "nwse-resize";
    case "top-right":
    case "bottom-left":
      return "nesw-resize";
    case "left":
    case "right":
      return "ew-resize";
    case "top":
    case "bottom":
      return "ns-resize";
  }
}

function normalizeWorldRect(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

export class SelectTool implements Tool {
  readonly id = "select" as const;
  readonly label = "Select";
  readonly cursor: CursorType = "default";
  private drag: DragState = { kind: "idle" };
  private marqueeCurrent: Point | undefined;

  onPointerDown(context: ToolContext, event: PointerEventData): void {
    if (event.button !== 0) return;
    const { editor } = context;
    const selectedIds = editor.getSelection().selectedIds;

    // 1. Transform handles (only when something is selected).
    const screenBounds = this.selectionScreenBounds(context);
    if (screenBounds !== undefined) {
      if (hitRotationHandle(event.point, screenBounds)) {
        const worldBounds = this.selectionWorldBounds(context);
        if (worldBounds !== undefined) {
          this.beginRotate(context, selectionPivot(worldBounds), event.world);
          return;
        }
      }
      const handle = hitResizeHandle(event.point, screenBounds);
      if (handle !== undefined) {
        this.beginResize(context, handle, event.world);
        return;
      }
    }

    // 2. Element hit, topmost first (locked hittable by direct click only).
    const hit = this.hitElement(context, event.world);
    if (hit !== undefined) {
      const isSelected = selectedIds.includes(hit.id);
      if (event.shiftKey && !isSelected) {
        editor.setSelection([...selectedIds, hit.id]);
        this.beginMove(context, [hit.id], event, undefined);
      } else if (event.shiftKey && isSelected) {
        // Shift-click toggles on release (if it was a click, not a drag).
        this.beginMove(context, selectedIds, event, hit.id);
      } else if (!isSelected) {
        editor.setSelection([hit.id]);
        this.beginMove(context, [hit.id], event, undefined);
      } else {
        this.beginMove(context, selectedIds, event, undefined);
      }
      return;
    }

    // 3. Empty space: clear (unless shift) and start a marquee.
    if (!event.shiftKey) editor.clearSelection();
    this.drag = { kind: "marquee", startWorld: event.world, toggle: event.shiftKey };
    this.marqueeCurrent = event.world;
  }

  onPointerMove(context: ToolContext, event: PointerEventData): void {
    const drag = this.drag;
    switch (drag.kind) {
      case "idle":
        return;
      case "marquee":
        this.marqueeCurrent = event.world;
        return;
      case "move": {
        const dx = event.world.x - drag.lastWorld.x;
        const dy = event.world.y - drag.lastWorld.y;
        if (dx === 0 && dy === 0) return;
        const { editor } = context;
        const page = getActivePage(editor.getDocument());
        const wanted = new Set(drag.ids);
        const transformable = page.elements.filter(
          (element) => wanted.has(element.id) && !element.locked,
        );
        if (transformable.length === 0) return;
        editor.dispatch(
          replaceElementsCommand(
            transformable.map((element) => moveElement(element, dx, dy)),
            "Move",
          ),
        );
        const slop = Math.hypot(
          event.point.x - drag.downScreen.x,
          event.point.y - drag.downScreen.y,
        );
        this.drag = { ...drag, lastWorld: event.world, moved: drag.moved || slop > CLICK_SLOP_PX };
        return;
      }
      case "resize": {
        const deltaWorld = {
          x: event.world.x - drag.startWorld.x,
          y: event.world.y - drag.startWorld.y,
        };
        const { editor } = context;
        const first = drag.originals[0];
        const next =
          drag.single && drag.originals.length === 1 && first !== undefined
            ? [
                resizeSingleElement(first, {
                  handle: drag.handle,
                  deltaWorld,
                  preserveAspect: event.shiftKey,
                  fromCenter: event.altKey,
                }),
              ]
            : resizeSelectionElements(drag.originals, {
                handle: drag.handle,
                deltaWorld,
                selectionBounds: drag.selectionBounds,
                preserveAspect: event.shiftKey,
                fromCenter: event.altKey,
              });
        editor.dispatch(replaceElementsCommand(next, "Resize"));
        return;
      }
      case "rotate": {
        const angleDeg = radToDeg(
          Math.atan2(event.world.y - drag.center.y, event.world.x - drag.center.x),
        );
        let delta = normalizeAngleDeg(angleDeg - drag.startAngleDeg);
        if (delta > 180) delta -= 360;
        if (event.shiftKey) delta = snapAngleDeg(delta, SNAP_INCREMENT_DEG);
        context.editor.dispatch(
          replaceElementsCommand(rotateElementsAbout(drag.originals, drag.center, delta), "Rotate"),
        );
      }
    }
  }

  onPointerUp(context: ToolContext, event: PointerEventData): void {
    const drag = this.drag;
    this.drag = { kind: "idle" };
    const { editor } = context;
    switch (drag.kind) {
      case "idle":
        return;
      case "marquee": {
        // The release point is the marquee end (may extend past the last move).
        const rect = normalizeWorldRect(drag.startWorld, event.world);
        this.marqueeCurrent = undefined;
        // Click without drag: selection was already handled on pointer-down.
        if (rect.w === 0 && rect.h === 0) return;
        const hits = this.marqueeHits(context, rect);
        if (drag.toggle) {
          const selected = new Set(editor.getSelection().selectedIds);
          for (const id of hits) {
            if (selected.has(id)) selected.delete(id);
            else selected.add(id);
          }
          editor.setSelection([...selected]);
        } else {
          editor.setSelection(hits);
        }
        return;
      }
      case "move": {
        editor.commitTransaction();
        const slop = Math.hypot(
          event.point.x - drag.downScreen.x,
          event.point.y - drag.downScreen.y,
        );
        if (drag.toggleOffId !== undefined && !drag.moved && slop <= CLICK_SLOP_PX) {
          editor.setSelection(
            editor.getSelection().selectedIds.filter((id) => id !== drag.toggleOffId),
          );
        }
        return;
      }
      case "resize":
      case "rotate":
        editor.commitTransaction();
    }
  }

  onPointerCancel(context: ToolContext): void {
    this.cancelGesture(context);
  }

  onDoubleClick(context: ToolContext, event: PointerEventData): void {
    const hit = this.hitElement(context, event.world);
    if (hit?.type === "text" && !hit.locked) {
      context.editor.setSelection([hit.id]);
      context.ui.requestTextEdit(hit.id, false);
    }
  }

  cancelGesture(context: ToolContext): void {
    if (this.drag.kind === "idle") return;
    this.drag = { kind: "idle" };
    this.marqueeCurrent = undefined;
    context.editor.cancelTransaction();
  }

  getOverlay(): ToolOverlay | undefined {
    if (this.drag.kind !== "marquee" || this.marqueeCurrent === undefined) return undefined;
    return { marqueeWorld: normalizeWorldRect(this.drag.startWorld, this.marqueeCurrent) };
  }

  cursorFor(context: ToolContext, screen: Point, world: Point): CursorType {
    if (this.drag.kind === "move") return "move";
    if (this.drag.kind === "resize") return handleCursor(this.drag.handle);
    if (this.drag.kind === "rotate") return "pointer";
    const screenBounds = this.selectionScreenBounds(context);
    if (screenBounds !== undefined) {
      if (hitRotationHandle(screen, screenBounds)) return "pointer";
      const handle = hitResizeHandle(screen, screenBounds);
      if (handle !== undefined) return handleCursor(handle);
    }
    return this.hitElement(context, world) === undefined ? "default" : "move";
  }

  // -- internals ------------------------------------------------------------

  private beginMove(
    context: ToolContext,
    ids: readonly string[],
    event: PointerEventData,
    toggleOffId: string | undefined,
  ): void {
    context.editor.beginTransaction("Move");
    this.drag = {
      kind: "move",
      ids,
      lastWorld: event.world,
      downScreen: event.point,
      moved: false,
      toggleOffId,
    };
  }

  private transformableSelection(context: ToolContext): Element[] {
    const { editor } = context;
    const page = getActivePage(editor.getDocument());
    const selected = new Set(editor.getSelection().selectedIds);
    return page.elements.filter((element) => selected.has(element.id) && !element.locked);
  }

  private selectionWorldBounds(context: ToolContext): Bounds | undefined {
    const selected = this.selectedElements(context);
    if (selected.length === 0) return undefined;
    let acc: Bounds | undefined;
    for (const element of selected) {
      const box = defaultRegistry.getBounds(element);
      acc =
        acc === undefined
          ? box
          : {
              minX: Math.min(acc.minX, box.minX),
              minY: Math.min(acc.minY, box.minY),
              maxX: Math.max(acc.maxX, box.maxX),
              maxY: Math.max(acc.maxY, box.maxY),
            };
    }
    return acc;
  }

  private selectedElements(context: ToolContext): Element[] {
    const { editor } = context;
    const page = getActivePage(editor.getDocument());
    const selected = new Set(editor.getSelection().selectedIds);
    return page.elements.filter((element) => selected.has(element.id));
  }

  private selectionScreenBounds(context: ToolContext): Rect | undefined {
    const world = this.selectionWorldBounds(context);
    if (world === undefined) return undefined;
    const { editor, viewport } = context;
    return worldBoundsToScreen(world, editor.getCamera(), viewport);
  }

  private hitElement(context: ToolContext, world: Point): Element | undefined {
    const { editor } = context;
    const tolerance = HIT_TOLERANCE_PX / editor.getCamera().zoom;
    const elements = editor.getScene().getElements(editor.getDocument(), editor.getVersion());
    for (let i = elements.length - 1; i >= 0; i -= 1) {
      const element = elements[i];
      if (element === undefined || element.locked) continue;
      if (defaultRegistry.containsPoint(element, world, tolerance)) return element;
    }
    // Locked elements are hittable by direct click (so they can be unlocked).
    for (let i = elements.length - 1; i >= 0; i -= 1) {
      const element = elements[i];
      if (element?.locked !== true) continue;
      if (defaultRegistry.containsPoint(element, world, tolerance)) return element;
    }
    return undefined;
  }

  private marqueeHits(context: ToolContext, rect: Rect): string[] {
    const worldBounds = {
      minX: rect.x,
      minY: rect.y,
      maxX: rect.x + rect.w,
      maxY: rect.y + rect.h,
    };
    const { editor } = context;
    const elements = editor.getScene().getElements(editor.getDocument(), editor.getVersion());
    const hits: string[] = [];
    for (const element of elements) {
      if (element.locked) continue;
      const box = defaultRegistry.getBounds(element);
      if (
        box.minX <= worldBounds.maxX &&
        box.maxX >= worldBounds.minX &&
        box.minY <= worldBounds.maxY &&
        box.maxY >= worldBounds.minY
      ) {
        hits.push(element.id);
      }
    }
    return hits;
  }

  private beginResize(context: ToolContext, handle: ResizeHandleId, startWorld: Point): void {
    const selected = this.transformableSelection(context);
    if (selected.length === 0) return;
    const worldBounds = this.selectionWorldBounds(context);
    if (worldBounds === undefined) return;
    context.editor.beginTransaction("Resize");
    this.drag = {
      kind: "resize",
      handle,
      startWorld,
      originals: selected,
      selectionBounds: worldBounds,
      single: selected.length === 1,
    };
  }

  private beginRotate(context: ToolContext, center: Point, startWorld: Point): void {
    const selected = this.transformableSelection(context);
    if (selected.length === 0) return;
    context.editor.beginTransaction("Rotate");
    this.drag = {
      kind: "rotate",
      center,
      startAngleDeg: radToDeg(Math.atan2(startWorld.y - center.y, startWorld.x - center.x)),
      originals: selected,
    };
  }
}
