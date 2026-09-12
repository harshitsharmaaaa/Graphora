# Graphora frontend guidance

Graphora is a technical visual workspace for whiteboarding, diagramming,
architecture documentation, AI-assisted diagram generation, sharing, and
realtime collaboration.

Before changing the frontend:

1. Read the relevant existing components, styles, editor hooks, and shared
   primitives. Do not infer the current UI from screenshots or filenames.
2. Preserve editor behavior. Camera transforms, world/screen conversion,
   DPR handling, selection coordinates, renderer transforms, and canvas
   interaction must not change during visual work.
3. Keep the canvas visually quiet: solid dark, no default dots, grid, or
   decorative texture.
4. Extend shared tokens and primitives before adding page- or component-local
   styling. Avoid one-off visual values when a semantic token exists.
5. Keep product logic separate from visual changes. Do not alter API contracts,
   persistence, authorization, collaboration, or editor commands unless the
   request explicitly requires it.
6. Treat keyboard access, visible focus, reduced motion, contrast, and screen
   reader semantics as part of the implementation, not polish.
7. Validate at the required viewport and zoom matrix in
   `.github/skills/frontend-design/references/visual-qa.md`.

Use the `frontend-design` skill for substantial UI work. It is the source of
truth for Graphora's design direction, tokens, interaction rules, architecture
boundaries, and visual QA checklist.
