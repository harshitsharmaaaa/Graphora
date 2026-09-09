import type { HealthStatus } from "@eraser/shared-types";

/**
 * Health domain logic. Trivial today (no DB/probes yet) but kept behind a
 * service boundary so readiness checks can grow without touching routes.
 */
export function getHealthStatus(): HealthStatus {
  return { status: "ok" };
}
