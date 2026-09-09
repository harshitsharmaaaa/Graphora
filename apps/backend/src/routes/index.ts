import { Hono } from "hono";
import { healthRoutes } from "./health.js";

/** Root router — mount every feature router here as the API grows. */
export const routes = new Hono().route("/health", healthRoutes);
