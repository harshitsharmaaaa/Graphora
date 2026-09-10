import { Hono } from "hono";
import { healthRoutes } from "./health.js";
import { createMemoryShareService } from "../services/shares.js";
import { createShareRoutes } from "./shares.js";
import { aiRoutes } from "./ai.js";

/** Root router — mount every feature router here as the API grows. */
export const routes = new Hono()
  .route("/health", healthRoutes)
  .route("/ai", aiRoutes)
  .route("/shares", createShareRoutes(createMemoryShareService()));
