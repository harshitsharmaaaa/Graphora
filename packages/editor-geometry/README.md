# `@eraser/editor-geometry`

Pure 2D math for the Graphora editor. No React, no DOM, no side effects —
every function takes values and returns fresh values.

## Modules

| Directory        | Contents                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `primitives/`    | `Point`/`Vector`, `Rect`/`Bounds`, `Segment`, `Line`, polygons, affine `Matrix`                                            |
| `transforms/`    | Degree/radian helpers, angle snapping, axis-aligned `resizeRect`                                                           |
| `bounds/`        | Rect corners, rotated hulls (`getRotatedBounds`)                                                                           |
| `intersections/` | Line, segment, and rect intersection                                                                                       |
| `hit-testing/`   | `pointInRect/Ellipse/Diamond`, `pointNearPolyline` + tolerance                                                             |
| `handles.ts`     | Screen-space selection-handle layout + hit-testing (shared by the renderer which draws them and the tools which grab them) |

## Conventions

- `EPSILON = 1e-9`; all predicates are epsilon-aware (`approxEquals`).
- Documents store **degrees**; trig internals use radians (explicit `degToRad` at boundaries).
- Degenerate inputs (zero-length segments, empty rings, singular matrices)
  return safe values (`undefined`, self, `false`) — never `NaN`, never throw.
- `resizeRect` works in an element's **local frame** and supports Shift
  (aspect lock, re-anchored) and Alt (resize from center); sizes clamp at a
  minimum instead of inverting.
- Screen handle geometry lives here (not in the renderer) so drawing and
  hit-testing can never disagree.

## Tests

Eight suites (~60 tests) cover positive/negative/zero/rotated/very-large/
fractional/degenerate inputs, including float-dust behavior at 0°/360° and
the exact 90° orbit of an off-origin frame.
