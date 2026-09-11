import { Hono } from "hono";
import { aiEditRequestSchema, aiGenerateRequestSchema } from "@eraser/shared-validation";
import { env } from "../lib/env.js";
import { createAiService } from "../services/ai.js";

const ai = createAiService({
  apiKey: env.aiApiKey,
  provider: env.aiProvider,
  model: env.aiModel,
  baseUrl: env.aiBaseUrl,
});
const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

function allowed(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (bucket === undefined || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_REQUESTS) return false;
  bucket.count += 1;
  return true;
}

export function createAiRoutes() {
  return new Hono()
    .post("/generate", async (c) => {
      const key = c.req.header("x-forwarded-for") ?? "local";
      if (!allowed(key)) return c.json({ error: "Rate limit exceeded" }, 429);
      let body: unknown;
      try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }
      const parsed = aiGenerateRequestSchema.safeParse(body);
      if (!parsed.success) return c.json({ error: "Invalid generation request" }, 400);
      try {
        return c.json({ diagram: await ai.generate(parsed.data) });
      } catch {
        return c.json({ error: "AI generation failed" }, 502);
      }
    })
    .post("/edit", async (c) => {
      const key = c.req.header("x-forwarded-for") ?? "local";
      if (!allowed(key)) return c.json({ error: "Rate limit exceeded" }, 429);
      let body: unknown;
      try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }
      const parsed = aiEditRequestSchema.safeParse(body);
      if (!parsed.success) return c.json({ error: "Invalid edit request" }, 400);
      try {
        return c.json({ diagram: await ai.edit({ ...parsed.data, kind: "edit" }) });
      } catch {
        return c.json({ error: "AI edit failed" }, 502);
      }
    });
}

export const aiRoutes = createAiRoutes();
