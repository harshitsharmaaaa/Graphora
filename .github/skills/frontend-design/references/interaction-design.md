# Graphora interaction design

Graphora is an editor, not a dashboard. Interaction design should keep the
canvas primary, make state legible, and minimize interruption.

## State model

Every interactive component should account for the applicable states:

- default
- hover
- active/pressed
- focus-visible
- disabled
- loading
- selected/checked
- error
- success

Do not communicate state through color alone. Combine color with position,
label, icon, text, or shape. Loading states should preserve layout and explain
what is happening. Errors should be actionable and local to the failed task.

## Focus and keyboard behavior

- Use a visible `:focus-visible` treatment with sufficient contrast.
- Keep tab order aligned with visual order.
- Do not trap focus except inside a modal or deliberate dialog.
- Escape closes transient menus/popovers and cancels safe in-progress UI.
- Enter and Space activate controls according to native expectations.
- Provide keyboard access to toolbar tools, inspector controls, sharing, AI,
  undo/redo, and command surfaces.
- Preserve canvas shortcuts without stealing focus from text fields.

## Motion

Use four approximate timing tiers:

- `instant`: pressed/focus feedback and simple color changes
- `fast`: hover, tooltip, menu, and compact state transitions
- `normal`: panel/popover entrance and layout changes
- `slow`: rare orientation or multi-step transitions

Prefer opacity, color, transform, and height changes that communicate cause
and effect. Avoid bounce, looping decoration, long easing, and animation
that delays access. Honor `prefers-reduced-motion: reduce` by removing
nonessential movement and shortening remaining transitions.

## Editor surfaces

### Toolbar

The toolbar remains top-aligned and should read as professional creative
software. Group tools by task, make the active tool obvious, expose names when
icons are ambiguous, and avoid turning every control into a pill.

### Inspector

Use compact labeled rows and clear sections. Group geometry, appearance,
typography, hierarchy, and advanced properties according to the selected
element. Keep values aligned and preserve direct manipulation where possible.
Do not stack large rounded cards for every property group.

### Selection

Local selection owns handles, keyboard focus, and manipulation. Remote
selection is awareness-only and must be visually distinct; it must never steal
handles or local focus.

### Context menu and command palette

Show actions close to the relevant object or command context. Keep destructive
actions separated and clearly labeled. Command search should support keyboard
navigation, stable shortcuts, empty results, loading, and disabled actions.

### AI

AI is a contextual command layer for the canvas. Show what it will affect,
keep the interaction concise, validate the result, and make the operation
reversible through normal editor history. Avoid a generic chat panel unless
the task genuinely requires conversation.

### Sharing and presence

Share UI should communicate access, permission, link, and status in a compact
product surface. Presence should be lightweight and non-blocking. Connection
state must be understandable without competing with the canvas.

## Feedback and performance

Give immediate local feedback for editor actions. Do not block pointer
interaction on network acknowledgment. Show saved/syncing/offline states
truthfully. Debounce expensive work and avoid animation or React rerenders on
every pointer movement.

## Accessibility

Check contrast for text, controls, borders, selection, errors, and focus.
Ensure names and roles are available to assistive technology. Support
keyboard-only workflows and reduced motion. Tooltips supplement labels; they
must not be the only way to understand a control.
