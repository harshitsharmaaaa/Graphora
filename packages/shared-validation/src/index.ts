/**
 * Shared runtime validation (Zod) for the monorepo.
 *
 * Rules:
 * - Framework-free: no React, no frontend imports. Safe for `apps/backend`.
 * - Schemas here must mirror the contracts in `@eraser/shared-types`.
 */
import { z } from "zod";

/** Mirrors `HealthStatus` from `@eraser/shared-types`. */
export const healthStatusSchema = z.object({
  status: z.literal("ok"),
});

export type HealthStatusInput = z.infer<typeof healthStatusSchema>;

/**
 * Minimal example schema proving Zod is wired up end-to-end.
 * Replaced by real board/diagram schemas in a later phase.
 */
export const exampleEntitySchema = z.object({
  id: z.string().min(1, "id must not be empty"),
  name: z.string().min(1).max(120),
  createdAt: z.string().datetime({ offset: true }),
});

export type ExampleEntityInput = z.infer<typeof exampleEntitySchema>;
