import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestLogger } from "./middleware/logger.js";
import { routes } from "./routes/index.js";
import { env } from "./lib/env.js";

/**
 * Assemble the HTTP application (no listening here — see `server.ts`).
 * Keeping creation separate from listening makes the app importable in
 * future integration tests without binding a port.
 */
export function createApp() {
  const app = new Hono();

  app.use("*", cors({
    origin: env.corsOrigins,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }));
  app.use(requestLogger);

  app.notFound((c) => c.json({ error: "Not Found" }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  });

  app.route("/", routes);

  return app;
}

export type App = ReturnType<typeof createApp>;
