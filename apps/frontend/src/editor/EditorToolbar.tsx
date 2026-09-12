/** Top toolbar rendered as UI chrome above the canvas, outside world coordinates. */
import { TOOL_ORDER, shortcutLabel } from "@eraser/editor-tools";
import type { ToolId } from "@eraser/editor-tools";
import { ToolIcon } from "../components/icons.js";
import { ToolButton } from "../components/toolbar.js";
import { useEditorSnapshot } from "./hooks.js";
import type { EditorApp } from "./engine.js";
import { useState } from "react";

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
  const [shapesOpen, setShapesOpen] = useState(false);
  const choose = (id: ToolId): void => {
    app.tools.setActiveTool(id);
    setShapesOpen(false);
  };
  const shapes = TOOL_ORDER.filter((id) =>
    ["rectangle", "ellipse", "diamond", "line", "arrow", "freehand"].includes(id),
  );
  const primary = TOOL_ORDER.filter((id) =>
    ["select", "hand", "text", "frame", "image"].includes(id),
  );
  return (
    <aside className="tool-rail" aria-label="Editor tools">
      <div className="tool-rail-group" role="toolbar" aria-label="Navigation tools">
        {primary.slice(0, 2).map((id) => (
          <ToolButton
            key={id}
            active={snapshot.activeToolId === id}
            label={TOOL_LABELS[id]}
            shortcut={shortcutLabel(id, "other")}
            onClick={() => {
              choose(id);
            }}
          >
            <ToolIcon id={id} />
          </ToolButton>
        ))}
      </div>
      <div className="tool-rail-rule" aria-hidden="true" />
      <div className="tool-rail-group" role="toolbar" aria-label="Shape tools">
        <div className="shape-tool-wrap">
          <ToolButton
            active={shapes.includes(snapshot.activeToolId) || shapesOpen}
            label="Shapes"
            shortcut="S"
            onClick={() => {
              setShapesOpen((open) => !open);
            }}
          >
            <ToolIcon
              id={shapes.includes(snapshot.activeToolId) ? snapshot.activeToolId : "rectangle"}
            />
          </ToolButton>
          {shapesOpen && (
            <div className="shape-menu" role="menu" aria-label="Shapes">
              {shapes.map((id) => (
                <ToolButton
                  key={id}
                  active={snapshot.activeToolId === id}
                  label={TOOL_LABELS[id]}
                  shortcut={shortcutLabel(id, "other")}
                  onClick={() => {
                    choose(id);
                  }}
                >
                  <ToolIcon id={id} />
                </ToolButton>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="tool-rail-rule" aria-hidden="true" />
      <div className="tool-rail-group" role="toolbar" aria-label="Insert tools">
        {primary.slice(2).map((id) => (
          <ToolButton
            key={id}
            active={snapshot.activeToolId === id}
            label={TOOL_LABELS[id]}
            shortcut={shortcutLabel(id, "other")}
            onClick={() => {
              choose(id);
            }}
          >
            <ToolIcon id={id} />
          </ToolButton>
        ))}
      </div>
    </aside>
  );
}
