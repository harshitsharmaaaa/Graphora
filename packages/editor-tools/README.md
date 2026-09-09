# `@eraser/editor-tools`

Pointer tools that translate gestures into editor commands. Tools never
mutate the document directly and never touch the DOM. Host capabilities
arrive via `ToolUiHooks` (`requestTextEdit`, `pickAndStoreImage`), implemented
by the frontend — which keeps this package runnable in Node tests.

## Layout

| Directory      | Contents                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| `tool-system/` | `Tool`/`ToolContext` contracts, `ToolSystem` (active tool, screen→world resolution, overlay/cursor queries) |
| `shortcuts/`   | Centralized keymap (`DEFAULT_SHORTCUTS`), matching, per-platform labels                                     |
| `selection/`   | Select tool: click/shift/marquee selection, move, resize, rotate                                            |
| `pan/`         | Hand tool (camera-only drag)                                                                                |
| `shapes/`      | Box creators (rectangle/ellipse/diamond/line/arrow/frame), freehand, text, image                            |

## Rules tools follow

- Pointer-down opens an editor transaction; pointer-up commits it — one drag
  is one undo step. Escape cancels via `cancelGesture`.
- Resize computes from the **original** snapshot every move (no error
  accumulation); single-element resize runs in the element's local frame;
  `Shift` locks aspect, `Alt` resizes from center.
- Rotation measures from the gesture start angle each move; `Shift` snaps to
  15°. Locked elements are clickable (so they can be unlocked) but never
  transform.
- Marquee selection uses the release point as the rect end; shift-marquee
  toggles.
- `getOverlay` exposes transient gesture state (marquee) for the renderer;
  `cursorFor` reports dynamic cursors (handle hover, dragging).

## Shortcuts

`V H R E D L A P T F` (+`I` image), `Delete/Backspace`, `Ctrl/Cmd+Z`,
`Ctrl/Cmd+Shift+Z` (or `Ctrl/Cmd+Y`), `Ctrl/Cmd+C/V/D`, `Escape`,
`Space+drag` to pan (handled by the canvas bridge), `Ctrl+=/-/0/1` for zoom.
Single-key shortcuts never fire from text-entry targets.
