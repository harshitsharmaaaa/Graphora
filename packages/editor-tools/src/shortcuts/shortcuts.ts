/**
 * Centralized keyboard shortcuts. Nothing outside this module maps keys to
 * actions: components and the canvas bridge resolve through
 * {@link matchShortcutAction}. Accepts Ctrl *or* Cmd as the mod key so one
 * map serves every platform; labels render per-platform via
 * {@link shortcutLabel}.
 */
import type { ToolId } from "../tool-system/types.js";

export type EditorActionId =
  | ToolId
  | "delete"
  | "undo"
  | "redo"
  | "copy"
  | "paste"
  | "duplicate"
  | "cancel"
  | "zoom-in"
  | "zoom-out"
  | "reset-zoom"
  | "fit";

export interface KeyBinding {
  /** `KeyboardEvent.key` (compared case-insensitively for single chars). */
  readonly key: string;
  readonly mod?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
}

export interface KeyEventData {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

export const DEFAULT_SHORTCUTS: Record<EditorActionId, readonly KeyBinding[]> = {
  select: [{ key: "v" }],
  hand: [{ key: "h" }],
  rectangle: [{ key: "r" }],
  ellipse: [{ key: "e" }],
  diamond: [{ key: "d" }],
  line: [{ key: "l" }],
  arrow: [{ key: "a" }],
  freehand: [{ key: "p" }],
  text: [{ key: "t" }],
  image: [{ key: "i" }],
  frame: [{ key: "f" }],
  delete: [{ key: "Delete" }, { key: "Backspace" }],
  undo: [{ key: "z", mod: true }],
  redo: [
    { key: "z", mod: true, shift: true },
    { key: "y", mod: true },
  ],
  copy: [{ key: "c", mod: true }],
  paste: [{ key: "v", mod: true }],
  duplicate: [{ key: "d", mod: true }],
  cancel: [{ key: "Escape" }],
  "zoom-in": [{ key: "=", mod: true }],
  "zoom-out": [{ key: "-", mod: true }],
  "reset-zoom": [{ key: "0", mod: true }],
  fit: [{ key: "1", mod: true }],
};

function bindingMatches(binding: KeyBinding, event: KeyEventData): boolean {
  const mod = event.ctrlKey || event.metaKey;
  if ((binding.mod ?? false) !== mod) return false;
  if ((binding.shift ?? false) !== event.shiftKey) return false;
  if ((binding.alt ?? false) !== event.altKey) return false;
  if (binding.key.length === 1) {
    return binding.key.toLowerCase() === event.key.toLowerCase();
  }
  return binding.key === event.key;
}

/** Resolve a key event to an action, or `undefined` when unbound. */
export function matchShortcutAction(event: KeyEventData): EditorActionId | undefined {
  const actions = Object.keys(DEFAULT_SHORTCUTS) as EditorActionId[];
  for (const action of actions) {
    const bindings = DEFAULT_SHORTCUTS[action];
    if (bindings.some((binding) => bindingMatches(binding, event))) return action;
  }
  return undefined;
}

/**
 * True for text-entry targets where single-key shortcuts must not fire.
 * Structural check (no DOM globals) so this module stays runnable in Node.
 */
export function isTextEntryTarget(target: unknown): boolean {
  if (typeof target !== "object" || target === null) return false;
  const candidate = target as { tagName?: unknown; isContentEditable?: unknown };
  if (typeof candidate.tagName === "string") {
    const tag = candidate.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
  }
  return candidate.isContentEditable === true;
}

export type PlatformKind = "mac" | "other";

/** Human label for tooltips/menus (`⌘Z` vs `Ctrl+Z`). */
export function shortcutLabel(action: EditorActionId, platform: PlatformKind = "other"): string {
  const bindings = DEFAULT_SHORTCUTS[action];
  const first = bindings[0];
  if (first === undefined) return "";
  const parts: string[] = [];
  const modLabel = platform === "mac" ? "⌘" : "Ctrl+";
  if (first.mod === true) parts.push(modLabel);
  if (first.shift === true) parts.push(platform === "mac" ? "⇧" : "Shift+");
  if (first.alt === true) parts.push(platform === "mac" ? "⌥" : "Alt+");
  const key = first.key.length === 1 ? first.key.toUpperCase() : first.key;
  parts.push(key);
  return parts.join(platform === "mac" ? "" : "");
}
