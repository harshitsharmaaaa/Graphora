/**
 * Concrete editor commands. Each factory snapshots what it needs on
 * `execute` (so redo replays correctly) and restores on `undo`.
 * Commands never touch selection, camera, or history directly.
 */
import { createElementId } from "@eraser/editor-elements";
import type { Element, ElementStyle } from "@eraser/editor-elements";
import type { EditorCommand } from "./types.js";

function commandId(): string {
  return `cmd-${createElementId()}`;
}

/** Insert elements (redo re-inserts the same objects). */
export function createElementsCommand(
  elements: readonly Element[],
  label = "Create",
): EditorCommand {
  const snapshot = [...elements];
  return {
    id: commandId(),
    label,
    execute: (context) => {
      context.insertElements(snapshot);
    },
    undo: (context) => {
      context.removeElements(snapshot.map((element) => element.id));
    },
  };
}

/** Delete by id; undo restores at original indexes. */
export function deleteElementsCommand(ids: readonly string[], label = "Delete"): EditorCommand {
  let removed: { element: Element; index: number }[] = [];
  return {
    id: commandId(),
    label,
    execute: (context) => {
      const page = context.getActivePage();
      removed = [];
      const drop = new Set(ids);
      page.elements.forEach((element, index) => {
        if (drop.has(element.id)) removed.push({ element, index });
      });
      context.removeElements(ids);
    },
    undo: (context) => {
      const page = context.getActivePage();
      const ordered = [...removed].sort((a, b) => a.index - b.index);
      for (const { element, index } of ordered) {
        context.insertElements([element], Math.min(index, page.elements.length));
      }
    },
  };
}

/**
 * Replace whole elements (move/resize/rotate/style/text all funnel here).
 * `next` carries complete new objects; `before` is snapshotted on execute.
 */
export function replaceElementsCommand(next: readonly Element[], label: string): EditorCommand {
  const after = [...next];
  let before: Element[] = [];
  return {
    id: commandId(),
    label,
    execute: (context) => {
      before = [];
      for (const element of after) {
        const current = context.getElement(element.id);
        if (current !== undefined) before.push(current);
      }
      for (const element of after) context.replaceElement(element);
      context.normalize();
    },
    undo: (context) => {
      for (const element of before) context.replaceElement(element);
      context.normalize();
    },
  };
}

/** Patch shared style fields on the given ids (skips missing elements). */
export function changeStyleCommand(
  ids: readonly string[],
  style: Partial<ElementStyle>,
  label = "Change style",
): EditorCommand {
  const patch = { ...style, updatedAt: Date.now() };
  let before: Element[] = [];
  return {
    id: commandId(),
    label,
    execute: (context) => {
      before = [];
      for (const id of ids) {
        const current = context.getElement(id);
        if (current === undefined) continue;
        before.push(current);
        context.replaceElement({ ...current, ...patch });
      }
      context.normalize();
    },
    undo: (context) => {
      for (const element of before) context.replaceElement(element);
      context.normalize();
    },
  };
}

/** Replace a text element's content and box (narrowed to text elements). */
export function updateTextCommand(
  id: string,
  text: string,
  size: { readonly width: number; readonly height: number },
  label = "Edit text",
): EditorCommand {
  let before: Element | undefined;
  return {
    id: commandId(),
    label,
    execute: (context) => {
      const current = context.getElement(id);
      before = current;
      if (current?.type !== "text") return;
      context.replaceElement({
        ...current,
        text,
        width: Math.max(0, size.width),
        height: Math.max(0, size.height),
        updatedAt: Date.now(),
      });
      context.normalize();
    },
    undo: (context) => {
      if (before !== undefined) context.replaceElement(before);
      context.normalize();
    },
  };
}

/** Toggle `locked` on the given ids. */
export function setLockedCommand(ids: readonly string[], locked: boolean): EditorCommand {
  let before: Element[] = [];
  return {
    id: commandId(),
    label: locked ? "Lock" : "Unlock",
    execute: (context) => {
      before = [];
      for (const id of ids) {
        const current = context.getElement(id);
        if (current === undefined) continue;
        before.push(current);
        context.replaceElement({ ...current, locked, updatedAt: Date.now() });
      }
      context.normalize();
    },
    undo: (context) => {
      for (const element of before) context.replaceElement(element);
      context.normalize();
    },
  };
}
