import type { Context, Next } from "hono";

/**
 * Minimal request logger. Hono ships its own (`hono/logger`); this local
 * version keeps the `middleware/` boundary explicit and dependency-free
 * while the API surface is still tiny.
 */
export async function requestLogger(c: Context, next: Next): Promise<void> {
  const started = Date.now();
  await next();
  const elapsed = Date.now() - started;
  // Intentional: minimal stdout access log until a structured logger lands.
  // eslint-disable-next-line no-console
  console.log(`${c.req.method} ${c.req.path} -> ${String(c.res.status)} (${String(elapsed)}ms)`);
}
