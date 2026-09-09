/**
 * Shared domain types for the whiteboard monorepo.
 *
 * Rules:
 * - No runtime code here (types only) so this package stays dependency-free.
 * - NO React imports — this package is consumed by both `apps/frontend` and `apps/backend`.
 * - Backend/frontend-specific shapes live in their own workspaces; only
 *   genuinely shared contracts move here.
 */

/** RFC 3339 / ISO-8601 date-time string (opaque alias keeps intent explicit). */
export type IsoDateTimeString = string;

/** Minimal health payload returned by `GET /health`. */
export interface HealthStatus {
  status: "ok";
}

/**
 * Smoke-test entity proving the package resolves from both apps.
 * Will be replaced by real diagram/board types in a later phase.
 */
export interface ExampleEntity {
  readonly id: string;
  readonly name: string;
  readonly createdAt: IsoDateTimeString;
}

/** Helper used by the web smoke-test page. */
export function isExampleEntity(value: unknown): value is ExampleEntity {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.createdAt === "string"
  );
}
