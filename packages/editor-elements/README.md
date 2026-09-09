# `@eraser/editor-elements`

Element model for the Graphora editor: the `Element` discriminated union
(`rectangle`, `ellipse`, `diamond`, `line`, `arrow`, `freehand`, `text`,
`image`, `frame`), factories, local-frame helpers, and the
`ElementRegistry`.

## Coordinate model

Every element owns an axis-aligned local frame (`x/y/width/height`, world
units). Point-based kinds store geometry **relative to (`x`, `y`)**;
`rotation` (degrees) applies rigidly about the frame center. `sync*`
helpers enforce the invariant (min-corner origin, tight extents) after
point edits; `scale*Points` support anchor-aware resize.

## Registry

`ElementDefinition` bundles per-type behavior (`create`, `getBounds`,
`containsPoint`, `distanceToPoint`, `getResizeHandleIds`,
`getDefaultStyle`). `createDefaultRegistry()` registers all nine kinds; new
kinds register without touching unrelated systems. No giant switches — the
one `create` switch inside the registry is the sanctioned exception.

A drift test (`validation-mirror.test.ts`) asserts every factory product
satisfies the Zod schemas in `@eraser/shared-validation` and that parsed
output stays assignable to the TypeScript union.
