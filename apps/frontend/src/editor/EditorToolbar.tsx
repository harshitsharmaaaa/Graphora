/**
 * Minimal tool switcher. Tool order, labels, and shortcut hints come from
 * the tools package — this component only renders state owned elsewhere.
 */
import { TOOL_ORDER, shortcutLabel } from "@eraser/editor-tools";
import type { ToolId } from "@eraser/editor-tools";
import { useEditorSnapshot } from "./hooks.js";
import type { EditorApp } from "./engine.js";

const TOOL_LABELS: Record<ToolId, string> = {
  select: "Select",
  hand: "Hand",
  rectangle: "Rectangle",
  ellipse: "Ellipse",
  diamond: "Diamond",
  arrow: "Arrow",
  line: "Line",
  freehand: "Draw",
  text: "Text",
  image: "Image",
  frame: "Frame",
};

export function EditorToolbar({ app }: { readonly app: EditorApp }) {
  const snapshot = useEditorSnapshot(app);
  return (
    <div className="toolbar" role="toolbar" aria-label="Editor tools">
      {TOOL_ORDER.map((id) => {
        const active = snapshot.activeToolId === id;
        return (
          <button
            key={id}
            type="button"
            className={active ? "tool-button active" : "tool-button"}
            aria-pressed={active}
            title={`${TOOL_LABELS[id]} (${shortcutLabel(id, "other")})`}
            onClick={() => {
              app.tools.setActiveTool(id);
            }}
          >
            {TOOL_LABELS[id]}
          </button>
        );
      })}
      <span className="toolbar-divider" aria-hidden="true" />
      <button
        type="button"
        className="tool-button"
        title="Undo (Ctrl+Z)"
        disabled={!snapshot.canUndo}
        onClick={() => {
          app.editor.undo();
        }}
      >
        Undo
      </button>
      <button
        type="button"
        className="tool-button"
        title="Redo (Ctrl+Shift+Z)"
        disabled={!snapshot.canRedo}
        onClick={() => {
          app.editor.redo();
        }}
      >
        Redo
      </button>
    </div>
  );
}
