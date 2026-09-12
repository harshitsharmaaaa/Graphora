---
applyTo: "apps/frontend/**/*.{ts,tsx,css,scss}"
---

# Graphora frontend implementation instructions

## Before editing

- Inspect the component tree, existing CSS, editor hooks, and shared UI
  primitives that own the surface being changed.
- Identify whether the change is visual, interactional, or behavioral. Keep
  visual redesigns from changing editor, persistence, API, authorization, or
  collaboration behavior.
- Read the frontend-design skill and the relevant references before adding
  new tokens, components, or layout rules.

## Design direction

Graphora should feel futuristic, premium, technical, intentional, minimal,
editorial, and product-grade. Use near-black surfaces, cool neutral text,
precise geometry, thin borders, restrained accents, subtle depth, and
purposeful motion. Do not use cyberpunk/neon-heavy, gamer, crypto, generic AI
SaaS, template-generated, or overdecorated styling.

The canvas is the primary product surface. UI must support it rather than
compete with it. Keep the canvas solid dark and quiet.

## Implementation rules

- Use semantic design tokens. Add or refine tokens centrally before styling
  many consumers.
- Prefer reusable primitives and composition over duplicated CSS.
- Keep toolbar, inspector, context menu, command palette, AI, sharing,
  presence, and status surfaces in one component language.
- Every interactive control needs default, hover, active, focus, disabled,
  loading, selected, error, and success behavior when applicable.
- Use real labels and accessible names. Do not use emoji as product icons.
- Preserve the existing editor data flow and coordinate system.
- Do not put UI state into the persisted document model unless the request
  explicitly defines it as collaborative state.
- Keep animations short and informative; honor `prefers-reduced-motion`.
- Avoid arbitrary large gaps, excessive rounded cards, decorative gradients,
  blur, glow, shadows, or glassmorphism without a product reason.

## Validation

Run the smallest relevant typecheck, lint, and tests while iterating, then
run the frontend checks before handoff. Review the result at
1280x720, 1440x900, 1920x1080, and 2560x1440, plus 100%, 125%, 150%, and
200% browser zoom when possible. Check alignment, overflow, clipping,
contrast, density, keyboard focus, reduced motion, and responsive behavior.
