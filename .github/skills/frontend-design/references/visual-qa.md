# Graphora visual QA

Visual QA is part of frontend implementation, not an optional final glance.
Use browser tooling or screenshots when available and record unavailable
checks honestly.

## Viewport matrix

Review at:

- 1280×720
- 1440×900
- 1920×1080
- 2560×1440

Check both compact and spacious layouts. The toolbar, inspector, dialogs,
popover edges, canvas, and status indicators must not clip or overlap
unexpectedly.

## Browser zoom matrix

Review at:

- 100%
- 125%
- 150%
- 200%

At higher zoom, content may reflow, but controls must remain reachable,
legible, keyboard accessible, and free of horizontal clipping where the
layout promises reflow.

## Checklist

- hierarchy is clear without excessive contrast or decoration
- toolbar alignment and density feel intentional
- inspector sections and values line up
- canvas remains solid dark and visually quiet
- popovers and dialogs have clear boundaries and usable padding
- no text, icon, focus ring, or control is clipped
- selected, disabled, loading, error, success, and hover states are visible
- focus order follows the visual order
- focus indicators are visible against every surface
- remote presence/selection does not obscure local handles
- reduced motion removes nonessential animation
- responsive behavior preserves the editor's working area
- long names, errors, empty states, and loading states are handled
- contrast remains acceptable for text, borders, and status indicators

## Regression safety

For editor changes, verify:

- camera position and zoom behavior are unchanged
- world/screen conversion is unchanged
- pointer coordinates map to the same canvas location
- DPR and resize behavior remain correct
- selection handles remain aligned with rendered elements
- toolbar-to-canvas layout does not change coordinate assumptions
- local and remote selection visuals remain separate

Run focused tests first, then the repository's relevant typecheck, lint,
test, and build commands. Do not claim visual QA from a successful build.
