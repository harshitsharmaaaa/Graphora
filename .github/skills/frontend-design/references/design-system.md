# Graphora design system

This is a direction and token contract for future Graphora frontend work.
Use the repository's existing styling mechanism when adding these values;
do not create a second competing token system.

## Semantic color roles

Use roles, not raw colors in components:

| Token | Purpose |
| --- | --- |
| `background.canvas` | Primary drawing surface; solid, quiet near-black |
| `background.app` | Application chrome and page background |
| `surface.1` | Lowest elevated UI surface |
| `surface.2` | Toolbar, inspector, popover, and panel surface |
| `surface.3` | Focused, selected, or nested elevated surface |
| `border.subtle` | Low-contrast separation |
| `border.strong` | Structural separation and active boundaries |
| `text.primary` | Main labels, values, and headings |
| `text.secondary` | Supporting labels and descriptions |
| `text.muted` | Metadata and low-priority hints |
| `accent.primary` | Main action and active tool |
| `accent.secondary` | Supporting technical/cool accent |
| `selection.primary` | Local selection and focus indication |
| `selection.remote` | Remote collaborator selection; distinct from local |
| `danger` | Destructive action and error |
| `warning` | Attention and degraded state |
| `success` | Confirmed/saved/connected state |

Use restrained contrast steps. Accent color should clarify state or action,
not decorate every surface. A gradient is allowed only when it improves
hierarchy or state communication and should remain subtle.

## Typography

Define a compact type scale with deliberate weight and line-height:

- **display:** rare, high-level product moments; never the default editor UI
- **heading:** panel and section hierarchy
- **body:** descriptions and normal content
- **label:** controls, toolbar names, inspector labels
- **caption:** metadata, helper text, status detail
- **code:** IDs, shortcuts, technical values, and code-like content
- **numeric/editorial:** dimensions, zoom, revisions, and high-salience values

Hierarchy should come from size, weight, tracking, line-height, and placement,
not only brighter colors or oversized headings. Keep labels concise and avoid
all-caps except for short, intentional metadata.

## Spacing and sizing

Use a small spacing scale and compose from it. Prefer consistent increments
over arbitrary 20/24/32 pixel gaps. Density should be compact enough for
professional tooling while preserving touch and keyboard usability.

Define shared sizes for:

- toolbar height
- control height
- icon button hit area
- inspector row height
- panel padding
- section gap
- popover padding
- focus ring offset

When an exceptional value is required, document why it is exceptional.

## Radius, borders, and elevation

- Use a small radius scale. Not every component should be rounded.
- Use sharper geometry for toolbars, inspectors, and technical property rows.
- Reserve larger radii for intentional dialogs or distinct floating surfaces.
- Prefer one-pixel borders and layered surfaces over heavy shadows.
- Use elevation to clarify overlap and interaction, not to make every card
  appear to float.
- Avoid blur unless it improves legibility over a changing background.

## Iconography

Use one consistent icon family, stroke weight, optical size, and alignment.
Icons must have accessible labels when they are the only affordance. Pair an
icon with text when the action is ambiguous. Do not use emoji or mismatched
icon sources as product UI.

## Component language

Build reusable primitives for buttons, icon buttons, fields, tabs, tool
controls, separators, popovers, panels, badges, tooltips, and status rows.
Primitives should accept semantic variants rather than encouraging ad hoc
color and spacing props.
