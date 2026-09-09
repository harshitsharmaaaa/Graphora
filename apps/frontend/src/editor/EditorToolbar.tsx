/**
 * Floating left vertical toolbar. Renders inside the canvas viewport as UI
 * chrome above the canvas (never part of world coordinates). Groups:
 * navigate (select/hand), then creation tools.
 */
import { TOOL_ORDER, shortcutLabel } from "@eraser/editor-tools";
import type { ToolId } from "@eraser/editor-tools";
import { ToolIcon } from "../components/icons.js";
import { ToolButton, ToolbarDivider } from "../components/toolbar.js";
import { useEditorSnapshot } from "./hooks.js";
import type { EditorApp } from "./engine.js";

const TOOL_LABELS: Record<ToolId, string> = {
  select: "Select",
  hand: "Hand",
  rectangle: "Rectangle",
  ellipse: "Ellipse",
  diamond: "Diamond",
  line: "Line",
  arrow: "Arrow",
  freehand: "Freehand",
  text: "Text",
  frame: "Frame",
  image: "Image",
};

export function EditorToolbar({ app }: { readonly app: EditorApp }) {
  const snapshot = useEditorSnapshot(app);
  return (
    <div className="toolbar toolbar-vertical" role="toolbar" aria-label="Editor tools">
      {TOOL_ORDER.map((id) => (
        <span key={id} className="toolbar-item">
          {id === "rectangle" && <ToolbarDivider />}
          <ToolButton
            active={snapshot.activeToolId === id}
            label={TOOL_LABELS[id]}
            shortcut={shortcutLabel(id, "other")}
            onClick={() => {
              app.tools.setActiveTool(id);
            }}
          >
            <ToolIcon id={id} />
          </ToolButton>
        </span>
      ))}
    </div>
  );
}
