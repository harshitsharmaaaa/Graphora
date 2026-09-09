import { healthStatusSchema } from "@eraser/shared-validation";
import type { Context } from "hono";
import { getHealthStatus } from "../services/health.js";

/** `GET /health` — validated against the shared contract before responding. */
export function getHealth(c: Context) {
  const payload = healthStatusSchema.parse(getHealthStatus());
  return c.json(payload, 200);
}
