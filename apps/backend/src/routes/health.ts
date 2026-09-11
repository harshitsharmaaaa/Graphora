import { Hono } from "hono";
import { getHealth } from "../controllers/health.js";
import type { DocumentRepository } from "@eraser/database";

/** Health routes, mounted at `/health` by the root router. */
export function createHealthRoutes(repository: DocumentRepository) {
  return new Hono()
    .get("/", getHealth)
    .get("/database", async (c) => {
      try {
        await repository.healthCheck();
        return c.json({ status: "ok", database: "reachable" }, 200);
      } catch {
        return c.json({ status: "error", database: "unreachable" }, 503);
      }
    });
}
