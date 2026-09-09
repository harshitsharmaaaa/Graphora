# `@eraser/editor-renderer`

Deterministic Canvas 2D renderer. Given the same
(`elements`, `camera`, `viewport`, options) it paints the same pixels. No
React, no editor references, no subscriptions — the frontend pushes plain
`RenderState` per frame.

## Pipeline

```text
scene elements → viewport culling → z-order sort → element pass
  → selection overlays → marquee overlay → canvas
```

- **Culling** (`viewport/`) is a pure bounds test with a screen-pixel margin;
  the core `SpatialIndex` can back it later without touching this package.
- **DPR** (`canvas/`): the backing store scales by `viewport.dpr` while the
  context is normalized to CSS pixels, so all drawing code is DPR-blind.
- **Grid**: adaptive dot grid (spacing multiplies until legible at any zoom).
- **Scheduling**: `requestRender` coalesces bursts into one rAF;
  `renderNow` draws synchronously (first frame, tests).

## Element renderers (`elements/`)

One module per kind: `rectangle`, `ellipse`+`diamond`, `line`+`arrow`,
`freehand`, `text`, `image`+`frame`. Every draw runs inside the element's
local frame (`inElementFrame`: translate → rotate → draw in `[0,w]×[0,h]`).

- **Rough.js** draws hand-drawn output when `roughness > 0`, with a
  `seedFromId` seed per element so shapes never shimmer between frames.
  `roughness = 0` takes a clean canvas path (incl. `roundRect` corners,
  dashed/dotted strokes, smooth freehand via midpoint quadratics).
- **Arrows** reuse `getArrowheadTriangles` from `@eraser/editor-elements`,
  so hit areas and pixels always agree.
- **Text** renders committed text with canvas `fillText`; editing happens in
  the React textarea overlay (the document stays authoritative).
- **Images** resolve through an injected `ImageResolver` (blob-backed in the
  frontend today, S3-backed tomorrow); missing assets draw a placeholder.

## Overlays (`overlay/`)

Selection box + eight handles + rotation handle (layout from geometry, so
tools hit-test exactly what is drawn) and the drag marquee.
