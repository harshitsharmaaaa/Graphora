/**
 * Property inspector: edits the current selection through editor commands.
 * Single selection → full transform/style/type controls. Multi selection →
 * only style controls safe to apply to every member. Locked members can be
 * unlocked here but never transformed.
 */
import { useState } from "react";
import type { JSX } from "react";
import {
  changeStyleCommand,
  getActivePage,
  replaceElementsCommand,
  rotateElementsAbout,
  setElementFrame,
  setLockedCommand,
} from "@eraser/editor-core";
import { defaultRegistry } from "@eraser/editor-elements";
import type { Element, ElementStyle } from "@eraser/editor-elements";
import { normalizeAngleDeg } from "@eraser/editor-geometry";
import { useEditorSnapshot } from "./hooks.js";
import type { EditorApp } from "./engine.js";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function NumberRow({
  label,
  value,
  onCommit,
  min,
  max,
  step = 1,
}: {
  readonly label: string;
  readonly value: number;
  readonly onCommit: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}): JSX.Element {
  return (
    <label className="inspector-row">
      <span>{label}</span>
      <input
        key={String(value)}
        type="number"
        defaultValue={String(round2(value))}
        min={min}
        max={max}
        step={step}
        onBlur={(e) => {
          const parsed = Number.parseFloat(e.target.value);
          if (Number.isFinite(parsed)) onCommit(parsed);
          else e.target.value = String(round2(value));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onCommit,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly format: (value: number) => string;
  readonly onCommit: (value: number) => void;
}): JSX.Element {
  const [draft, setDraft] = useState<number | undefined>(undefined);
  const shown = draft ?? value;
  const finish = (): void => {
    if (draft !== undefined) {
      onCommit(draft);
      setDraft(undefined);
    }
  };
  return (
    <label className="inspector-row">
      <span>
        {label} · {format(shown)}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        onChange={(e) => {
          setDraft(Number.parseFloat(e.target.value));
        }}
        onPointerUp={finish}
        onBlur={finish}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}

function ColorRow({
  label,
  value,
  onCommit,
}: {
  readonly label: string;
  readonly value: string;
  readonly onCommit: (value: string) => void;
}): JSX.Element {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="inspector-row">
      <span>{label}</span>
      <span className="color-field">
        <input
          type="color"
          value={isHex ? value : "#000000"}
          disabled={!isHex && value !== "transparent"}
          aria-label={`${label} picker`}
          onChange={(e) => {
            onCommit(e.target.value);
          }}
        />
        <input
          key={value}
          type="text"
          defaultValue={value}
          spellCheck={false}
          onBlur={(e) => {
            const next = e.target.value.trim();
            if (next.length > 0) onCommit(next);
            else e.target.value = value;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </span>
    </div>
  );
}

function StyleControls({
  app,
  ids,
  sample,
}: {
  readonly app: EditorApp;
  readonly ids: readonly string[];
  readonly sample: Element;
}): JSX.Element {
  const apply = (patch: Partial<ElementStyle>): void => {
    app.editor.dispatch(changeStyleCommand(ids, patch, "Change style"));
  };
  return (
    <section>
      <h3>Style</h3>
      <ColorRow
        label="Stroke"
        value={sample.strokeColor}
        onCommit={(v) => {
          apply({ strokeColor: v });
        }}
      />
      <ColorRow
        label="Fill"
        value={sample.backgroundColor}
        onCommit={(v) => {
          apply({ backgroundColor: v });
        }}
      />
      <div className="inspector-row">
        <span>Fill pattern</span>
        <select
          value={sample.fillStyle}
          onChange={(e) => {
            const style = e.target.value;
            if (
              style === "none" ||
              style === "solid" ||
              style === "hachure" ||
              style === "cross-hatch"
            ) {
              apply({
                fillStyle: style,
                backgroundColor:
                  style === "none"
                    ? "transparent"
                    : sample.backgroundColor === "transparent"
                      ? "#818cf8"
                      : sample.backgroundColor,
              });
            }
          }}
        >
          <option value="none">None</option>
          <option value="solid">Solid</option>
          <option value="hachure">Hachure</option>
          <option value="cross-hatch">Cross-hatch</option>
        </select>
      </div>
      <div className="inspector-row">
        <span>Fill state</span>
        <button
          type="button"
          className="mini-button"
          onClick={() => {
            apply({ backgroundColor: "transparent", fillStyle: "none" });
          }}
        >
          Transparent
        </button>
      </div>
      <NumberRow
        label="Width"
        value={sample.strokeWidth}
        min={0}
        max={50}
        step={0.5}
        onCommit={(v) => {
          apply({ strokeWidth: Math.min(50, Math.max(0, v)) });
        }}
      />
      <label className="inspector-row">
        <span>Stroke style</span>
        <select
          value={sample.strokeStyle}
          onChange={(e) => {
            const style = e.target.value;
            if (style === "solid" || style === "dashed" || style === "dotted") {
              apply({ strokeStyle: style });
            }
          }}
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </label>
      <SliderRow
        label="Opacity"
        value={sample.opacity}
        min={0}
        max={1}
        step={0.01}
        format={(v) => `${String(Math.round(v * 100))}%`}
        onCommit={(v) => {
          apply({ opacity: Math.min(1, Math.max(0, v)) });
        }}
      />
      <label className="inspector-row">
        <span>Roughness</span>
        <select
          value={String(sample.roughness)}
          onChange={(e) => {
            const parsed = Number.parseFloat(e.target.value);
            if (Number.isFinite(parsed)) apply({ roughness: Math.min(2, Math.max(0, parsed)) });
          }}
        >
          <option value="0">Clean</option>
          <option value="1">Sketchy</option>
          <option value="2">Wild</option>
        </select>
      </label>
      <SliderRow
        label="Roundness"
        value={sample.roundness}
        min={0}
        max={1}
        step={0.05}
        format={(v) => String(Math.round(v * 100))}
        onCommit={(v) => {
          apply({ roundness: Math.min(1, Math.max(0, v)) });
        }}
      />
    </section>
  );
}

function SingleInspector({
  app,
  element,
}: {
  readonly app: EditorApp;
  readonly element: Element;
}): JSX.Element {
  const replace = (next: Element, label: string): void => {
    app.editor.dispatch(replaceElementsCommand([next], label));
  };
  const frame = (
    patch: { x?: number; y?: number; width?: number; height?: number; rotation?: number },
    label: string,
  ): void => {
    replace(setElementFrame(element, patch), label);
  };
  const locked = element.locked;
  return (
    <div>
      <div className="inspector-header">
        <strong>{element.type}</strong>
        <span className="inspector-id">{element.id.slice(0, 8)}</span>
      </div>
      <div className="inspector-actions">
        <button
          type="button"
          className="mini-button"
          onClick={() => {
            app.editor.dispatch(setLockedCommand([element.id], !locked));
          }}
        >
          {locked ? "Unlock" : "Lock"}
        </button>
        <button
          type="button"
          className="mini-button danger"
          disabled={locked}
          title={locked ? "Unlock to delete" : "Delete (Del)"}
          onClick={() => {
            app.deleteSelected();
          }}
        >
          Delete
        </button>
      </div>
      {locked && <p className="inspector-note">Locked — transform controls are disabled.</p>}
      <section>
        <h3>Transform</h3>
        <fieldset disabled={locked}>
          <NumberRow
            label="X"
            value={element.x}
            step={1}
            onCommit={(v) => {
              frame({ x: v }, "Move");
            }}
          />
          <NumberRow
            label="Y"
            value={element.y}
            step={1}
            onCommit={(v) => {
              frame({ y: v }, "Move");
            }}
          />
          <NumberRow
            label="W"
            value={element.width}
            min={0}
            step={1}
            onCommit={(v) => {
              frame({ width: Math.max(0, v) }, "Resize");
            }}
          />
          <NumberRow
            label="H"
            value={element.height}
            min={0}
            step={1}
            onCommit={(v) => {
              frame({ height: Math.max(0, v) }, "Resize");
            }}
          />
          <NumberRow
            label="Rotation°"
            value={element.rotation}
            step={1}
            onCommit={(v) => {
              frame({ rotation: normalizeAngleDeg(v) }, "Rotate");
            }}
          />
          <div className="inspector-row">
            <span>Rotate</span>
            <span className="button-row">
              <button
                type="button"
                className="mini-button"
                onClick={() => {
                  const pivot = defaultRegistry.getBounds(element);
                  const center = {
                    x: (pivot.minX + pivot.maxX) / 2,
                    y: (pivot.minY + pivot.maxY) / 2,
                  };
                  const [next] = rotateElementsAbout([element], center, -15);
                  if (next !== undefined) replace(next, "Rotate");
                }}
              >
                −15°
              </button>
              <button
                type="button"
                className="mini-button"
                onClick={() => {
                  const pivot = defaultRegistry.getBounds(element);
                  const center = {
                    x: (pivot.minX + pivot.maxX) / 2,
                    y: (pivot.minY + pivot.maxY) / 2,
                  };
                  const [next] = rotateElementsAbout([element], center, 15);
                  if (next !== undefined) replace(next, "Rotate");
                }}
              >
                +15°
              </button>
            </span>
          </div>
        </fieldset>
      </section>
      <StyleControls app={app} ids={[element.id]} sample={element} />
      {element.type === "text" && (
        <section>
          <h3>Text</h3>
          <NumberRow
            label="Size"
            value={element.fontSize}
            min={1}
            max={500}
            step={1}
            onCommit={(v) => {
              const fontSize = Math.min(500, Math.max(1, Math.round(v)));
              const size = app.measureText(element.text, { ...element, fontSize });
              replace(
                {
                  ...element,
                  fontSize,
                  width: size.width,
                  height: size.height,
                  updatedAt: Date.now(),
                },
                "Edit text",
              );
            }}
          />
          <label className="inspector-row">
            <span>Weight</span>
            <select
              value={String(element.fontWeight)}
              onChange={(e) => {
                const fontWeight = Number.parseInt(e.target.value, 10);
                if (!Number.isFinite(fontWeight)) return;
                const size = app.measureText(element.text, { ...element, fontWeight });
                replace(
                  {
                    ...element,
                    fontWeight,
                    width: size.width,
                    height: size.height,
                    updatedAt: Date.now(),
                  },
                  "Edit text",
                );
              }}
            >
              <option value="400">Regular</option>
              <option value="500">Medium</option>
              <option value="700">Bold</option>
            </select>
          </label>
          <div className="inspector-row">
            <span>Align</span>
            <span className="button-row">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  className={element.textAlign === align ? "mini-button active" : "mini-button"}
                  onClick={() => {
                    replace({ ...element, textAlign: align, updatedAt: Date.now() }, "Edit text");
                  }}
                >
                  {align}
                </button>
              ))}
            </span>
          </div>
        </section>
      )}
      {element.type === "arrow" && (
        <section>
          <h3>Arrow</h3>
          {(["startArrowhead", "endArrowhead"] as const).map((side) => (
            <label className="inspector-row" key={side}>
              <span>{side === "startArrowhead" ? "Start" : "End"}</span>
              <select
                value={element[side]}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "none" || value === "triangle") {
                    replace({ ...element, [side]: value, updatedAt: Date.now() }, "Arrowhead");
                  }
                }}
              >
                <option value="none">None</option>
                <option value="triangle">Triangle</option>
              </select>
            </label>
          ))}
        </section>
      )}
      {element.type === "image" && (
        <section>
          <h3>Image</h3>
          <p className="inspector-note">
            {String(element.naturalWidth)} × {String(element.naturalHeight)} px ·{" "}
            {element.assetId.slice(0, 8)}
          </p>
        </section>
      )}
      {element.type === "frame" && (
        <section>
          <h3>Frame</h3>
          <label className="inspector-row">
            <span>Name</span>
            <input
              key={element.name}
              type="text"
              defaultValue={element.name}
              onBlur={(e) => {
                const name = e.target.value.slice(0, 256);
                if (name !== element.name) {
                  replace({ ...element, name, updatedAt: Date.now() }, "Edit text");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          </label>
        </section>
      )}
    </div>
  );
}

export function PropertyInspector({ app }: { readonly app: EditorApp }): JSX.Element {
  const snapshot = useEditorSnapshot(app);
  const document = app.editor.getDocument();
  const page = getActivePage(document);
  const wanted = new Set(snapshot.selectedIds);
  const selected = page.elements.filter((element) => wanted.has(element.id));
  return (
    <aside className="inspector" aria-label="Properties">
      <div className="inspector-top">
        <div>
          <span className="panel-kicker">Properties</span>
          <strong>Inspector</strong>
        </div>
        <span className="inspector-count">
          {selected.length === 0 ? "—" : String(selected.length).padStart(2, "0")}
        </span>
      </div>
      {selected.length === 0 && (
        <div className="inspector-empty">
          <div className="empty-state-mark" aria-hidden="true">
            +
          </div>
          <h3>Nothing selected</h3>
          <p>Select an object on the canvas to inspect its geometry and style.</p>
          <ul>
            <li>Drag a tool to create a shape</li>
            <li>Click to select, drag to move</li>
            <li>
              <kbd>Shift</kbd>-click for multi-select
            </li>
            <li>Drag handles to resize, top handle to rotate</li>
            <li>
              <kbd>Space</kbd> + drag to pan · wheel to zoom
            </li>
            <li>
              <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · <kbd>Del</kbd> delete
            </li>
          </ul>
        </div>
      )}
      {selected.length === 1 && selected[0] !== undefined && (
        <SingleInspector app={app} element={selected[0]} />
      )}
      {selected.length > 1 && selected[0] !== undefined && (
        <div>
          <div className="inspector-header">
            <strong>{`${String(selected.length)} selected`}</strong>
          </div>
          <StyleControls
            app={app}
            ids={selected.map((element) => element.id)}
            sample={selected[0]}
          />
        </div>
      )}
    </aside>
  );
}
