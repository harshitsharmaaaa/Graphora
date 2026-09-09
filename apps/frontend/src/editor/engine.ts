/**
 * Editor application wiring: constructs the engine (`Editor` + `History` +
 * `ToolSystem`), clipboard, text-edit sessions, asset store, and autosave.
 * React components consume this handle but never own editor state.
 */
import {
  cloneElementsForPaste,
  createEditor,
  createElementsCommand,
  deleteElementsCommand,
  getActivePage,
  parseClipboardPayload,
  serializeElementsForClipboard,
  updateTextCommand,
} from "@eraser/editor-core";
import type { Document, DocumentPersistence, Editor as EditorType } from "@eraser/editor-core";
import { createEmptyDocument } from "@eraser/editor-core";
import { createHistory } from "@eraser/editor-history";
import { createDefaultToolSystem } from "@eraser/editor-tools";
import type { ToolSystem, ToolUiHooks } from "@eraser/editor-tools";
import { fontFor, measureTextBlock } from "@eraser/editor-renderer";
import { createText } from "@eraser/editor-elements";
import type { Point } from "@eraser/shared-types";
import { AssetStore, pickImageFile } from "../lib/assets.js";
import { systemClipboard } from "../lib/clipboard.js";
import { IndexedDBPersistence } from "../lib/persistence.js";

export const DEFAULT_DOCUMENT_ID = "graphora-local";
const AUTOSAVE_DEBOUNCE_MS = 800;
const PASTE_OFFSET = 24;

export interface TextEditSession {
  readonly elementId: string;
  readonly isNew: boolean;
  /** Click point for new text (no element exists until commit). */
  readonly anchor?: Point | undefined;
}

export function createEditorApp(options?: {
  readonly documentId?: string;
  readonly persistence?: DocumentPersistence;
}) {
  const documentId = options?.documentId ?? DEFAULT_DOCUMENT_ID;
  const persistence = options?.persistence ?? new IndexedDBPersistence();
  const editor: EditorType = createEditor({ history: createHistory({ limit: 100 }) });
  const assets = new AssetStore();

  let session: TextEditSession | undefined;
  const sessionListeners = new Set<() => void>();
  const notifySession = (): void => {
    for (const listener of [...sessionListeners]) listener();
  };

  const ui: ToolUiHooks = {
    requestTextEdit: (elementId: string, isNew: boolean, anchor?: Point) => {
      session = { elementId, isNew, anchor };
      notifySession();
    },
    pickAndStoreImage: async () => {
      const blob = await pickImageFile();
      if (blob === undefined) return undefined;
      try {
        const stored = await assets.storeBlob(blob);
        return { assetId: stored.assetId, width: stored.width, height: stored.height };
      } catch {
        return undefined;
      }
    },
  };
  const tools: ToolSystem = createDefaultToolSystem(editor, ui);

  // -- autosave (debounced; never on every pointer move) --------------------
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const scheduleSave = (): void => {
    if (saveTimer !== undefined) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = undefined;
      persistence.save(editor.getDocument()).catch((error: unknown) => {
        console.error("Autosave failed", error);
      });
    }, AUTOSAVE_DEBOUNCE_MS);
  };
  const unsubscribeDocument = editor.subscribe((event) => {
    if (event.type !== "document") return;
    scheduleSave();
  });

  /** Immediately persist (page hide/close must not lose the debounce window). */
  function flush(): void {
    if (saveTimer !== undefined) {
      clearTimeout(saveTimer);
      saveTimer = undefined;
    }
    persistence.save(editor.getDocument()).catch((error: unknown) => {
      console.error("Autosave failed", error);
    });
  }

  // -- clipboard (internal buffer first, system clipboard opportunistically) -
  let clipboardBuffer = "";

  function selectedElements(document: Document) {
    const page = getActivePage(document);
    const selected = new Set(editor.getSelection().selectedIds);
    return page.elements.filter((element) => selected.has(element.id));
  }

  function copySelected(): boolean {
    const selected = selectedElements(editor.getDocument());
    if (selected.length === 0) return false;
    clipboardBuffer = serializeElementsForClipboard(selected);
    systemClipboard()
      ?.writeText(clipboardBuffer)
      .catch(() => {
        // Internal buffer remains the source of truth.
      });
    return true;
  }

  function insertClones(elements: ReturnType<typeof parseClipboardPayload>): boolean {
    if (elements.length === 0) return false;
    const clones = cloneElementsForPaste(elements, PASTE_OFFSET, PASTE_OFFSET);
    editor.dispatch(createElementsCommand(clones, "Paste"));
    editor.setSelection(clones.map((element) => element.id));
    return true;
  }

  function paste(): boolean {
    if (clipboardBuffer === "") return false;
    return insertClones(parseClipboardPayload(clipboardBuffer));
  }

  async function pasteFromSystemClipboard(): Promise<boolean> {
    try {
      const clipboard = systemClipboard();
      if (clipboard === undefined) return false;
      const text = await clipboard.readText();
      const elements = parseClipboardPayload(text);
      if (elements.length === 0) return false;
      clipboardBuffer = serializeElementsForClipboard(elements);
      return insertClones(elements);
    } catch {
      return false;
    }
  }

  function duplicateSelected(): boolean {
    const selected = selectedElements(editor.getDocument());
    if (selected.length === 0) return false;
    const clones = cloneElementsForPaste(selected, PASTE_OFFSET, PASTE_OFFSET);
    editor.dispatch(createElementsCommand(clones, "Duplicate"));
    editor.setSelection(clones.map((element) => element.id));
    return true;
  }

  function deleteSelected(): boolean {
    const document = editor.getDocument();
    const ids = selectedElements(document)
      .filter((element) => !element.locked)
      .map((element) => element.id);
    if (ids.length === 0) return false;
    editor.dispatch(deleteElementsCommand(ids));
    // Drop selection references to the removed elements.
    const surviving = new Set(
      getActivePage(editor.getDocument()).elements.map((element) => element.id),
    );
    editor.setSelection(editor.getSelection().selectedIds.filter((id) => surviving.has(id)));
    return true;
  }

  // -- text editing sessions -------------------------------------------------
  function getTextEditSession(): TextEditSession | undefined {
    return session;
  }

  function onTextEditSession(listener: () => void): () => void {
    sessionListeners.add(listener);
    return () => {
      sessionListeners.delete(listener);
    };
  }

  function commitTextEdit(elementId: string, text: string): void {
    if (session?.elementId !== elementId) return;
    const anchor = session.anchor;
    const isNew = session.isNew;
    session = undefined;
    notifySession();
    const page = getActivePage(editor.getDocument());
    const existing = page.elements.find((candidate) => candidate.id === elementId);
    if (existing !== undefined) {
      if (existing.type !== "text") return;
      if (text === "") {
        editor.dispatch(deleteElementsCommand([elementId], "Edit text"));
        return;
      }
      const size = measureText(text, existing);
      editor.dispatch(updateTextCommand(elementId, text, size));
      return;
    }
    // New text: nothing was created until now, so commit is a single entry
    // and cancelling leaves no trace.
    if (!isNew || text === "") return;
    const origin = anchor ?? { x: 0, y: 0 };
    const draft = createText({ x: origin.x, y: origin.y, width: 0, height: 0, text });
    const size = measureText(text, draft);
    const element = { ...draft, width: size.width, height: size.height };
    editor.dispatch(createElementsCommand([element], "Create text"));
    editor.setSelection([element.id]);
  }

  function cancelTextEdit(): void {
    if (session === undefined) return;
    session = undefined;
    notifySession();
  }

  let measureContext: CanvasRenderingContext2D | undefined;
  function measureText(
    text: string,
    style: { fontSize: number; fontFamily: string; fontWeight: number; lineHeight: number },
  ): { readonly width: number; readonly height: number } {
    if (typeof document === "undefined") return { width: 120, height: 30 };
    measureContext ??= document.createElement("canvas").getContext("2d") ?? undefined;
    if (measureContext === undefined) return { width: 120, height: 30 };
    const measured = measureTextBlock(measureContext, text, fontFor(style), style.lineHeight);
    return { width: Math.max(24, measured.width + 8), height: Math.max(16, measured.height) };
  }

  // -- lifecycle ---------------------------------------------------------------
  async function load(): Promise<void> {
    let stored: Document | null = null;
    try {
      stored = await persistence.load(documentId);
    } catch {
      stored = null;
    }
    // Force our well-known id so every install shares one local board.
    const document = stored ?? createEmptyDocument("Untitled board");
    editor.loadDocument(document.id === documentId ? document : { ...document, id: documentId });
  }

  function dispose(): void {
    if (saveTimer !== undefined) clearTimeout(saveTimer);
    unsubscribeDocument();
    sessionListeners.clear();
    assets.dispose();
  }

  return {
    editor,
    tools,
    assets,
    persistence,
    documentId,
    load,
    flush,
    dispose,
    copySelected,
    paste,
    pasteFromSystemClipboard,
    duplicateSelected,
    deleteSelected,
    getTextEditSession,
    onTextEditSession,
    commitTextEdit,
    cancelTextEdit,
    measureText,
  };
}

export type EditorApp = ReturnType<typeof createEditorApp>;
