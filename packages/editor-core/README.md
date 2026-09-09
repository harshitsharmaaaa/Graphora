# `@eraser/editor-core`

Framework-free editor engine: document model, scene, camera, selection,
commands, transactions, clipboard, serialization, and persistence contracts.
No React. No DOM.

## Architecture

```text
React UI / tools / renderer
   │  (call methods, subscribe to events, pull snapshots)
   ▼
Editor  ── owns ──▶  Document (source of truth, plain data)
   │                  Camera (ephemeral) · Selection (ephemeral)
   ├─ dispatch(cmd) ─▶ CommandContext ─▶ HistoryStore (injected)
   └─ events ── document | selection | camera | history (with version)
```

The `Editor` never imports the history implementation: `HistoryStore` is an
interface defined in `src/history/types.ts` and implemented by
`@eraser/editor-history`. The frontend injects it
(`createEditor({ history: createHistory() })`).

## Modules

| Directory      | Contents                                                                |
| -------------- | ----------------------------------------------------------------------- |
| `document/`    | `Document`/`Page` types, seeds, pure model helpers, serialization       |
| `scene/`       | Z-ordered active-page view + `SpatialIndex` (naive today, R-tree later) |
| `camera/`      | Pure world↔screen mapping, cursor-anchored zoom, fit/reset              |
| `selection/`   | Ordered id set, selection bounds, locked filtering                      |
| `commands/`    | `EditorCommand` contract, element commands, pure transforms             |
| `history/`     | `HistoryStore`/`HistoryEntry` contracts only (no implementation)        |
| `clipboard/`   | Versioned element payloads, fail-safe parse, id remapping               |
| `persistence/` | `DocumentPersistence` contract (implemented in the frontend)            |
| `events/`      | Typed emitter; subscribers pull snapshots, never receive state          |
| `ids/`         | Re-export of element id generation (single implementation)              |

## Key rules

- **World coordinates are the source of truth.** Screen coordinates are
  derived per frame and never persisted.
- **Selection/camera are ephemeral**: never persisted, never in history.
- **One gesture = one undo step**: tools wrap drags in
  `beginTransaction`/`commitTransaction`; `cancelTransaction` rolls back.
- **Fail-safe boundaries**: `parseDocument`/`parseClipboardPayload` validate
  via `@eraser/shared-validation` and degrade (throw structured errors, drop
  single corrupt elements) instead of crashing.
- **Document upgrades** go through `migrateDocument` (currently v1 only).

## Coordinate model for elements

Every element owns an axis-aligned local frame (`x/y/width/height`, world
units). Point-based kinds (`line`, `arrow`, `freehand`) store geometry
**relative to (`x`, `y`)**; `rotation` (degrees) applies rigidly about the
frame center. Resize runs in the local frame (exact for rotated elements);
rotation re-derives point frames in world space (no drift).
