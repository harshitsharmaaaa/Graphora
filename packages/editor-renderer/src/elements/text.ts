import type { TextElement } from "@eraser/editor-elements";
import { inElementFrame } from "./common.js";
import type { DrawContext } from "./common.js";

export interface TextMetrics {
  readonly width: number;
  readonly height: number;
}

/** Canvas font string for an element. */
export function fontFor(
  element: Pick<TextElement, "fontSize" | "fontFamily" | "fontWeight">,
): string {
  return `${String(element.fontWeight)} ${String(element.fontSize)}px ${element.fontFamily}`;
}

/** Measure committed text (used when sizing the element on commit). */
export function measureTextBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  lineHeight: number,
): TextMetrics {
  const previousFont = ctx.font;
  ctx.font = font;
  try {
    const lines = text.split("\n");
    let width = 0;
    for (const line of lines) width = Math.max(width, ctx.measureText(line).width);
    const size = parseFontSize(font);
    return { width, height: Math.max(size * lineHeight, size) * Math.max(1, lines.length) };
  } finally {
    ctx.font = previousFont;
  }
}

function parseFontSize(font: string): number {
  const match = /(\d+(?:\.\d+)?)px/.exec(font);
  const sizeText = match?.[1];
  if (sizeText === undefined) return 16;
  const parsed = Number.parseFloat(sizeText);
  return Number.isFinite(parsed) ? parsed : 16;
}

export function drawText(context: DrawContext, element: TextElement): void {
  inElementFrame(context, element, () => {
    const { ctx } = context;
    ctx.font = fontFor(element);
    ctx.fillStyle = element.strokeColor;
    ctx.textBaseline = "top";
    const lines = element.text.split("\n");
    const linePx = element.fontSize * element.lineHeight;
    lines.forEach((line, index) => {
      let x = 0;
      if (element.textAlign === "center") x = element.width / 2;
      else if (element.textAlign === "right") x = element.width;
      ctx.textAlign = element.textAlign;
      ctx.fillText(line, x, index * linePx);
    });
  });
}
