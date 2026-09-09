# `@eraser/editor-history`

Bounded undo/redo stack implementing core's `HistoryStore` contract
(depend on `@eraser/editor-core` for types only — the arrow never points
back, so no cycle is possible).

- `push` records an entry and invalidates redo.
- `popUndo`/`popRedo` move entries between stacks; the `Editor` executes
  them so document access stays centralized.
- `limit` (default 100) drops the oldest entries first.
- Subscribers are notified on every stack change (drives history UI state).
