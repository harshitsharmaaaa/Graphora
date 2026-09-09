/**
 * Clipboard payloads. Serialization is versioned JSON; parsing is
 * fail-safe — one corrupt element is dropped, never fatal to the paste.
 * Id remapping happens here so pasted content never collides.
 */
import { createElementId } from "@eraser/editor-elements";
import type { Element } from "@eraser/editor-elements";
import { elementSchema } from "@eraser/shared-validation";

export const CLIPBOARD_VERSION = 1;
export const CLIPBOARD_MIME = "application/x-graphora-elements";

export interface ClipboardPayload {
  readonly version: number;
  readonly elements: Element[];
}

/** Serialize selected elements for the clipboard (internal or system). */
export function serializeElementsForClipboard(elements: readonly Element[]): string {
  const payload: ClipboardPayload = { version: CLIPBOARD_VERSION, elements: [...elements] };
  return JSON.stringify(payload);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parse a clipboard payload, keeping every valid element and dropping the
 * rest. Returns an empty array (never throws) for unusable input.
 */
export function parseClipboardPayload(data: unknown): Element[] {
  try {
    const raw = typeof data === "string" ? (JSON.parse(data) as unknown) : data;
    if (!isRecord(raw)) return [];
    const elements = raw.elements;
    if (!Array.isArray(elements)) return [];
    const kept: Element[] = [];
    for (const candidate of elements) {
      const parsed = elementSchema.safeParse(candidate);
      if (parsed.success) kept.push(parsed.data);
    }
    return kept;
  } catch {
    return [];
  }
}

/** Clone elements with fresh ids, translated by (`dx`, `dy`). */
export function cloneElementsForPaste(
  elements: readonly Element[],
  dx: number,
  dy: number,
): Element[] {
  const now = Date.now();
  return elements.map((element) => ({
    ...element,
    id: createElementId(),
    x: element.x + dx,
    y: element.y + dy,
    zIndex: 0,
    createdAt: now,
    updatedAt: now,
  }));
}
