import { Hono } from "hono";
import { createHealthRoutes } from "./health.js";
import { createDocumentRepository } from "@eraser/database";
import { env } from "../lib/env.js";
import { createShareService } from "../services/shares.js";
import { createShareRoutes } from "./shares.js";
import { createDocumentRoutes } from "./documents.js";
import { createAiRoutes } from "./ai.js";
import { auth } from "../lib/auth.js";

const repository = createDocumentRepository(env.databaseUrl);
/** Root router — mount every feature router here as the API grows. */
export const routes = new Hono()
  .all("/api/auth/*", async (c) => auth.handler(c.req.raw))
  .route("/health", createHealthRoutes(repository))
  .route("/ai", createAiRoutes())
  .route("/documents", createDocumentRoutes(repository))
  .route("/shares", createShareRoutes(createShareService(repository), repository));
