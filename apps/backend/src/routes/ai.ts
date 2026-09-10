import { Hono } from "hono";
import { aiDiagramSchema, aiGenerateRequestSchema } from "@eraser/shared-validation";

const keywords: readonly { readonly pattern: RegExp; readonly type: "service" | "database" | "queue" | "user" }[] = [
  { pattern: /\b(frontend|client|react|web)\b/i, type: "service" },
  { pattern: /\b(api|server|backend|node)\b/i, type: "service" },
  { pattern: /\b(database|postgres|postgresql|mysql|sql)\b/i, type: "database" },
  { pattern: /\b(redis|queue|kafka|worker)\b/i, type: "queue" },
  { pattern: /\b(user|customer|browser)\b/i, type: "user" },
];

function generate(prompt: string) {
  const nodes = keywords
    .filter(({ pattern }) => pattern.test(prompt))
    .map(({ type }, index) => {
      const labels = { service: "Application service", database: "Database", queue: "Queue", user: "User" };
      return { id: `${type}-${String(index + 1)}`, label: labels[type], type };
    });
  const fallback = nodes.length > 0
    ? nodes
    : [{ id: "service-1", label: prompt.slice(0, 64), type: "service" as const }];
  const first = fallback[0];
  if (first === undefined) throw new Error("Generated diagram is empty");
  return {
    nodes: fallback,
    edges: fallback.slice(1).map((node, index) => ({
      id: `edge-${String(index + 1)}`,
      source: fallback[index]?.id ?? first.id,
      target: node.id,
    })),
  };
}

export const aiRoutes = new Hono().post("/generate", async (c) => {
  const parsed = aiGenerateRequestSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid generation request" }, 400);
  const diagram = aiDiagramSchema.parse(generate(parsed.data.prompt));
  return c.json({ diagram });
});
