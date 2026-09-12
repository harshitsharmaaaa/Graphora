---
name: frontend-design
description: Design and implement Graphora frontend UI with a restrained futuristic technical product language, reusable tokens, accessible interactions, editor-safe architecture, and disciplined visual QA.
---

# Graphora frontend design skill

Use this skill for Graphora UI design, redesign, component styling, layout,
interaction polish, and visual QA. This skill does not authorize changes to
backend behavior, document schemas, editor geometry, camera transforms, or
collaboration protocols unless the task explicitly asks for them.

## Operating procedure

1. **Inspect first.** Read the current route, component tree, styles, hooks,
   editor APIs, and shared primitives. Locate the existing source of truth for
   state and layout before writing CSS.
2. **Map the surface.** Describe the hierarchy, density, states, responsive
   behavior, and ownership boundaries of the surface being changed.
3. **Find inconsistencies.** Record duplicated colors, arbitrary spacing,
   mismatched radii, inconsistent icon sizes, weak focus states, unclear
   hierarchy, and competing containers.
4. **Establish tokens.** Extend the semantic token layer and primitive
   components before styling many consumers.
5. **Implement deliberately.** Prefer a small number of strong surfaces,
   aligned controls, and meaningful states over decorative additions.
6. **Preserve behavior.** Keep the editor's document, camera, selection,
   renderer, persistence, auth, and collaboration behavior intact.
7. **Validate.** Run typecheck, lint, focused tests, and the relevant build.
   Perform the visual QA matrix in the visual QA reference.
8. **Report honestly.** State what was inspected, what changed, what was
   validated, and any unavailable browser or visual checks.

## Product character

Graphora is “the next generation of a technical creative tool,” not a website
with futuristic effects. Draw principles from contemporary developer tools,
creative tools, productivity products, and editorial interfaces without
copying logos, proprietary assets, exact layouts, or exact styling.

The desired language is:

- near-black, layered surfaces with cool neutrals
- high-quality typography and information hierarchy
- thin, precise borders and restrained elevation
- compact professional density
- subtle cool accents used to communicate state
- motion that explains orientation, feedback, or transition
- clear alignment and intentional whitespace

Avoid neon everywhere, giant gradients, floating blobs, random blur, default
glassmorphism, excessive pills, decorative particles, template cards, and
visual effects without a functional reason.

## Required references

Read the relevant reference before implementation:

- `references/design-system.md` for tokens and visual primitives
- `references/interaction-design.md` for states, motion, and editor behavior
- `references/frontend-architecture.md` for ownership and integration rules
- `references/visual-qa.md` for viewport, zoom, accessibility, and regression
  checks

## Non-negotiable editor constraints

- Do not modify `camera.ts`, world/screen conversion, client/canvas
  conversion, DPR handling, renderer camera transforms, or selection
  coordinate transforms for visual work.
- Do not make camera, viewport, or local selection collaborative document
  state.
- Do not bypass Editor commands with component-local document mutation.
- Do not introduce one-off synchronization between React components and the
  canvas. Use existing editor/collaboration adapters.
- Do not change the solid dark canvas into a grid, dotted, or textured canvas.

## Handoff checklist

- Tokens are semantic and reusable.
- Interactive states and focus behavior are defined.
- Keyboard and reduced-motion behavior are covered.
- No unexplained decorative effects were added.
- Existing functionality and editor transforms remain intact.
- Relevant checks and visual QA were run or explicitly marked unavailable.
