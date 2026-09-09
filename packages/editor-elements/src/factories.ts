/**
 * Factories — the only sanctioned way to mint elements. Every factory fills
 * defaults, stamps `createdAt`/`updatedAt`, and normalizes derived bounds so
 * invariants hold from birth.
 */
import type { Point } from "@eraser/shared-types";
import type {
  ArrowElement,
  ArrowheadKind,
  BaseElement,
  DiamondElement,
  EllipseElement,
  FrameElement,
  FreehandElement,
  ImageElement,
  LineElement,
  RectangleElement,
  StrokeStyle,
  TextAlign,
  TextElement,
} from "./types.js";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_WEIGHT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_TEXT_ALIGN,
  getDefaultStyle,
} from "./defaults.js";
import { createElementId } from "./ids.js";
import { syncArrowBounds, syncFreehandBounds, syncLineBounds } from "./sync.js";

/** Shared creation input (every field optional except where noted). */
export interface CreateBaseInput {
  readonly id?: string;
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly rotation?: number;
  readonly opacity?: number;
  readonly strokeColor?: string;
  readonly backgroundColor?: string;
  readonly strokeWidth?: number;
  readonly strokeStyle?: StrokeStyle;
  readonly roughness?: number;
  readonly roundness?: number;
  readonly locked?: boolean;
  readonly zIndex?: number;
  readonly parentId?: string;
  readonly groupId?: string;
}

type BaseFields = Omit<BaseElement, "type">;

function base(input: CreateBaseInput): BaseFields {
  const now = Date.now();
  const style = getDefaultStyle();
  return {
    id: input.id ?? createElementId(),
    x: input.x ?? 0,
    y: input.y ?? 0,
    width: Math.max(0, input.width ?? 0),
    height: Math.max(0, input.height ?? 0),
    rotation: input.rotation ?? 0,
    opacity: input.opacity ?? style.opacity,
    strokeColor: input.strokeColor ?? style.strokeColor,
    backgroundColor: input.backgroundColor ?? style.backgroundColor,
    strokeWidth: input.strokeWidth ?? style.strokeWidth,
    strokeStyle: input.strokeStyle ?? style.strokeStyle,
    roughness: input.roughness ?? style.roughness,
    roundness: input.roundness ?? style.roundness,
    locked: input.locked ?? false,
    zIndex: input.zIndex ?? 0,
    ...(input.parentId === undefined ? {} : { parentId: input.parentId }),
    ...(input.groupId === undefined ? {} : { groupId: input.groupId }),
    createdAt: now,
    updatedAt: now,
  };
}

export function createRectangle(input: CreateBaseInput = {}): RectangleElement {
  return { ...base(input), type: "rectangle" };
}

export function createEllipse(input: CreateBaseInput = {}): EllipseElement {
  return { ...base(input), type: "ellipse" };
}

export function createDiamond(input: CreateBaseInput = {}): DiamondElement {
  return { ...base(input), type: "diamond" };
}

export interface CreateLineInput extends CreateBaseInput {
  /** Local-frame endpoints. Defaults to the frame diagonal. */
  readonly points?: readonly [Point, Point];
}

function defaultDiagonal(input: CreateBaseInput): [Point, Point] {
  return [
    { x: 0, y: 0 },
    { x: input.width ?? 0, y: input.height ?? 0 },
  ];
}

export function createLine(input: CreateLineInput = {}): LineElement {
  const draft: LineElement = {
    ...base(input),
    type: "line",
    points: input.points ?? defaultDiagonal(input),
  };
  return syncLineBounds(draft);
}

export interface CreateArrowInput extends CreateLineInput {
  readonly startArrowhead?: ArrowheadKind;
  readonly endArrowhead?: ArrowheadKind;
}

export function createArrow(input: CreateArrowInput = {}): ArrowElement {
  const draft: ArrowElement = {
    ...base(input),
    type: "arrow",
    points: input.points ?? defaultDiagonal(input),
    startArrowhead: input.startArrowhead ?? "none",
    endArrowhead: input.endArrowhead ?? "triangle",
  };
  return syncArrowBounds(draft);
}

export interface CreateFreehandInput extends CreateBaseInput {
  readonly points?: readonly Point[];
  readonly pressures?: readonly number[];
}

export function createFreehand(input: CreateFreehandInput = {}): FreehandElement {
  const draft: FreehandElement = {
    ...base(input),
    type: "freehand",
    points: input.points ?? [],
    ...(input.pressures === undefined ? {} : { pressures: input.pressures }),
  };
  return syncFreehandBounds(draft);
}

export interface CreateTextInput extends CreateBaseInput {
  readonly text?: string;
  readonly fontSize?: number;
  readonly fontFamily?: string;
  readonly fontWeight?: number;
  readonly textAlign?: TextAlign;
  readonly lineHeight?: number;
}

export function createText(input: CreateTextInput = {}): TextElement {
  return {
    ...base(input),
    type: "text",
    text: input.text ?? "",
    fontSize: input.fontSize ?? DEFAULT_FONT_SIZE,
    fontFamily: input.fontFamily ?? DEFAULT_FONT_FAMILY,
    fontWeight: input.fontWeight ?? DEFAULT_FONT_WEIGHT,
    textAlign: input.textAlign ?? DEFAULT_TEXT_ALIGN,
    lineHeight: input.lineHeight ?? DEFAULT_LINE_HEIGHT,
  };
}

export interface CreateImageInput extends CreateBaseInput {
  readonly assetId: string;
  readonly naturalWidth?: number;
  readonly naturalHeight?: number;
}

export function createImage(input: CreateImageInput): ImageElement {
  return {
    ...base(input),
    type: "image",
    assetId: input.assetId,
    naturalWidth: input.naturalWidth ?? Math.max(1, input.width ?? 100),
    naturalHeight: input.naturalHeight ?? Math.max(1, input.height ?? 100),
  };
}

export interface CreateFrameInput extends CreateBaseInput {
  readonly name?: string;
}

export function createFrame(input: CreateFrameInput = {}): FrameElement {
  return { ...base(input), type: "frame", name: input.name ?? "Frame" };
}
