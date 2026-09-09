import { Hono } from "hono";
import { getHealth } from "../controllers/health.js";

/** Health routes, mounted at `/health` by the root router. */
export const healthRoutes = new Hono().get("/", getHealth);
