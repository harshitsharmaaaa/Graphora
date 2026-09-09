/**
 * `ToolSystem` — owns the active tool, resolves screen→world coordinates,
 * and routes pointer gestures. One instance per editor session; the canvas
 * bridge feeds it raw screen events and reads back overlay/cursor state.
 */
import { screenToWorld } from "@eraser/editor-core";
import type { Editor, ViewportSize } from "@eraser/editor-core";
import type { Point } from "@eraser/shared-types";
import type {
  CursorType,
  PointerEventData,
  Tool,
  ToolContext,
  ToolId,
  ToolOverlay,
  ToolUiHooks,
} from "./types.js";

/** Screen-space pointer data as delivered by the canvas bridge. */
export interface RawPointerData {
  readonly pointerId: number;
  readonly button: number;
  readonly point: Point;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
}

export class ToolSystem {
  private readonly editor: Editor;
  private readonly ui: ToolUiHooks;
  private readonly tools = new Map<ToolId, Tool>();
  private activeId: ToolId = "select";
  private viewport: ViewportSize = { width: 800, height: 600 };
  private readonly listeners = new Set<(id: ToolId) => void>();

  constructor(editor: Editor, ui: ToolUiHooks) {
    this.editor = editor;
    this.ui = ui;
  }

  register(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }

  toolIds(): ToolId[] {
    return [...this.tools.keys()];
  }

  getActiveToolId(): ToolId {
    return this.activeId;
  }

  getActiveTool(): Tool | undefined {
    return this.tools.get(this.activeId);
  }

  setViewport(viewport: ViewportSize): void {
    this.viewport = viewport;
  }

  getViewport(): ViewportSize {
    return { ...this.viewport };
  }

  setActiveTool(id: ToolId): void {
    if (!this.tools.has(id)) return;
    if (id === this.activeId) return;
    const previous = this.tools.get(this.activeId);
    previous?.cancelGesture?.(this.createContext());
    this.activeId = id;
    for (const listener of [...this.listeners]) listener(id);
  }

  subscribe(listener: (id: ToolId) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  handlePointerDown(raw: RawPointerData): void {
    this.getActiveTool()?.onPointerDown(this.createContext(), this.resolve(raw, "down"));
  }

  handlePointerMove(raw: RawPointerData): void {
    this.getActiveTool()?.onPointerMove?.(this.createContext(), this.resolve(raw, "move"));
  }

  handlePointerUp(raw: RawPointerData): void {
    this.getActiveTool()?.onPointerUp?.(this.createContext(), this.resolve(raw, "up"));
  }

  handlePointerCancel(raw: RawPointerData): void {
    this.getActiveTool()?.onPointerCancel?.(this.createContext(), this.resolve(raw, "cancel"));
  }

  handleDoubleClick(raw: RawPointerData): void {
    this.getActiveTool()?.onDoubleClick?.(this.createContext(), this.resolve(raw, "down"));
  }

  /** Abort the active gesture without committing (Escape mid-drag). */
  cancelActiveGesture(): boolean {
    const tool = this.getActiveTool();
    if (tool?.cancelGesture === undefined) return false;
    tool.cancelGesture(this.createContext());
    return true;
  }

  getOverlay(): ToolOverlay | undefined {
    return this.getActiveTool()?.getOverlay?.(this.createContext());
  }

  getCursor(screen: Point): CursorType {
    const tool = this.getActiveTool();
    if (tool === undefined) return "default";
    const world = screenToWorld(screen, this.editor.getCamera(), this.viewport);
    return tool.cursorFor?.(this.createContext(), screen, world) ?? tool.cursor;
  }

  private createContext(): ToolContext {
    return { editor: this.editor, ui: this.ui, viewport: { ...this.viewport } };
  }

  private resolve(raw: RawPointerData, eventType: PointerEventData["eventType"]): PointerEventData {
    return {
      ...raw,
      world: screenToWorld(raw.point, this.editor.getCamera(), this.viewport),
      eventType,
    };
  }
}
