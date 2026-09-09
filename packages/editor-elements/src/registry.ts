/**
 * Element registry — the single dispatch point for per-type behavior.
 * New element kinds register a definition object; no other module needs a
 * type switch. (The one `create` switch below is the sanctioned exception:
 * it only routes to factories.)
 */
import type { Bounds, Point } from "@eraser/shared-types";
import { RESIZE_HANDLE_IDS } from "@eraser/editor-geometry";
import type { ResizeHandleId } from "@eraser/editor-geometry";
import type {
  CreateArrowInput,
  CreateBaseInput,
  CreateFrameInput,
  CreateFreehandInput,
  CreateImageInput,
  CreateLineInput,
  CreateTextInput,
} from "./factories.js";
import {
  createArrow,
  createDiamond,
  createEllipse,
  createFrame,
  createFreehand,
  createImage,
  createLine,
  createRectangle,
  createText,
} from "./factories.js";
import type { Element, ElementOf, ElementStyle, ElementType } from "./types.js";
import { arrowDefinition } from "./defs/arrow.js";
import { diamondDefinition } from "./defs/diamond.js";
import { ellipseDefinition } from "./defs/ellipse.js";
import { frameDefinition } from "./defs/frame.js";
import { freehandDefinition } from "./defs/freehand.js";
import { imageDefinition } from "./defs/image.js";
import { lineDefinition } from "./defs/line.js";
import { rectangleDefinition } from "./defs/rectangle.js";
import { textDefinition } from "./defs/text.js";

/** Creation input routed by `type` to the matching factory. */
export type CreateElementInput =
  | (CreateBaseInput & { readonly type: "rectangle" | "ellipse" | "diamond" })
  | (CreateLineInput & { readonly type: "line" })
  | (CreateArrowInput & { readonly type: "arrow" })
  | (CreateFreehandInput & { readonly type: "freehand" })
  | (CreateTextInput & { readonly type: "text" })
  | (CreateImageInput & { readonly type: "image" })
  | (CreateFrameInput & { readonly type: "frame" });

/**
 * Per-type behavior contract. Method syntax is intentional (bivariance lets
 * the registry store every definition behind `ElementDefinition<Element>`).
 */
export interface ElementDefinition<T extends Element = Element> {
  readonly type: T["type"];
  create(input: CreateElementInput & { readonly type: T["type"] }): T;
  getBounds(element: T): Bounds;
  containsPoint(element: T, point: Point, tolerance?: number): boolean;
  distanceToPoint(element: T, point: Point): number;
  getResizeHandleIds(element: T): readonly ResizeHandleId[];
  getDefaultStyle(): ElementStyle;
}

export class ElementRegistry {
  private readonly definitions = new Map<ElementType, ElementDefinition>();

  register<T extends Element>(definition: ElementDefinition<T>): void {
    if (this.definitions.has(definition.type)) {
      throw new Error(`Element type already registered: ${definition.type}`);
    }
    this.definitions.set(definition.type, definition);
  }

  types(): ElementType[] {
    return [...this.definitions.keys()];
  }

  definitionOf<T extends ElementType>(type: T): ElementDefinition<ElementOf<T>> {
    const definition = this.definitions.get(type);
    if (definition === undefined) throw new Error(`Unknown element type: ${type}`);
    return definition as ElementDefinition<ElementOf<T>>;
  }

  create(input: CreateElementInput): Element {
    switch (input.type) {
      case "rectangle":
        return createRectangle(input);
      case "ellipse":
        return createEllipse(input);
      case "diamond":
        return createDiamond(input);
      case "line":
        return createLine(input);
      case "arrow":
        return createArrow(input);
      case "freehand":
        return createFreehand(input);
      case "text":
        return createText(input);
      case "image":
        return createImage(input);
      case "frame":
        return createFrame(input);
    }
  }

  getBounds(element: Element): Bounds {
    const definition = this.definitions.get(element.type);
    if (definition === undefined) throw new Error(`Unknown element type: ${element.type}`);
    return definition.getBounds(element);
  }

  containsPoint(element: Element, point: Point, tolerance?: number): boolean {
    const definition = this.definitions.get(element.type);
    if (definition === undefined) return false;
    return definition.containsPoint(element, point, tolerance);
  }

  distanceToPoint(element: Element, point: Point): number {
    const definition = this.definitions.get(element.type);
    if (definition === undefined) return Number.POSITIVE_INFINITY;
    return definition.distanceToPoint(element, point);
  }

  getResizeHandleIds(element: Element): readonly ResizeHandleId[] {
    const definition = this.definitions.get(element.type);
    if (definition === undefined) return RESIZE_HANDLE_IDS;
    return definition.getResizeHandleIds(element);
  }
}

/** Registry with all nine built-in element kinds. */
export function createDefaultRegistry(): ElementRegistry {
  const registry = new ElementRegistry();
  registry.register(rectangleDefinition);
  registry.register(ellipseDefinition);
  registry.register(diamondDefinition);
  registry.register(lineDefinition);
  registry.register(arrowDefinition);
  registry.register(freehandDefinition);
  registry.register(textDefinition);
  registry.register(imageDefinition);
  registry.register(frameDefinition);
  return registry;
}

/** Shared singleton for the app and tests. */
export const defaultRegistry = createDefaultRegistry();
