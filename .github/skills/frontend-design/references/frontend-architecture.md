# Graphora frontend architecture

Graphora has a framework-free editor core behind a React shell. Visual work
must respect ownership boundaries so styling does not destabilize editing.

## Ownership

- **React components:** layout, accessible controls, transient UI state, and
  subscription to editor snapshots.
- **Editor core:** document model, commands, camera, selection, transactions,
  and history contracts.
- **Tools:** pointer gestures and shortcut interpretation that dispatch editor
  commands.
- **Renderer:** deterministic canvas rendering and overlays.
- **Persistence:** IndexedDB and server document persistence.
- **Realtime adapter:** Editor↔Yjs synchronization, room state, presence, and
  connection status.
- **Backend:** authorization, durable snapshots, AI authorization, and
  WebSocket room management.

Do not make React state the source of truth for the document, camera, or
collaboration protocol. Do not mutate document data directly from a visual
component when an Editor command exists.

## Safe visual change pattern

1. Read the current component and its snapshot/hook dependencies.
2. Add or refine semantic tokens in the shared styling layer.
3. Extract a primitive only when it has stable repeated behavior or visual
   language.
4. Apply variants through the primitive rather than duplicating CSS.
5. Keep DOM/layout changes separate from command and persistence changes.
6. Verify canvas geometry and interaction with existing regression tests.

## Editor-specific boundaries

The canvas is a primary product surface, but its coordinate system is not a
styling concern. Never change camera, world/screen conversion, client/canvas
conversion, DPR handling, renderer transforms, or selection coordinate
transforms as part of a visual redesign.

Toolbar and inspector layout can affect available canvas space, but must not
change the coordinate assumptions used by the editor. If layout changes
require a viewport measurement, use the existing viewport/canvas integration
instead of patching transform math.

## Persistence and collaboration

Do not create a second document authority in React. Durable document changes
must continue through Editor commands and the existing persistence or
collaboration adapters. Camera, local selection, hover, menus, focus, and
other UI state should remain ephemeral unless explicitly specified otherwise.

Connection, sync, offline, and permission states should be represented by
truthful status UI. Do not claim “Saved” or “Synced” without the existing
system confirming it.

## Validation commands

Use the repository's Bun/Turbo scripts and the smallest relevant package
selectors while iterating. Before handoff, run the relevant frontend
typecheck, lint, tests, and build, then perform the visual QA matrix. A
successful typecheck does not prove visual correctness.
