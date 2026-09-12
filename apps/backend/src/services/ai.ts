import { aiDiagramSchema } from "@eraser/shared-validation";
import type { AiDiagram } from "@eraser/shared-validation";

export interface AiGenerationInput {
  readonly prompt: string;
  readonly kind: string;
}

export interface AiEditInput extends AiGenerationInput {
  readonly diagram: AiDiagram;
}

export interface AiProvider {
  generate(input: AiGenerationInput): Promise<AiDiagram>;
  edit(input: AiEditInput): Promise<AiDiagram>;
}

const keywords: readonly {
  readonly pattern: RegExp;
  readonly type: "service" | "database" | "queue" | "user";
}[] = [
  { pattern: /\b(frontend|client|react|web)\b/i, type: "service" },
  { pattern: /\b(api|server|backend|node)\b/i, type: "service" },
  { pattern: /\b(database|postgres|postgresql|mysql|sql)\b/i, type: "database" },
  { pattern: /\b(redis|queue|kafka|worker)\b/i, type: "queue" },
  { pattern: /\b(user|customer|browser)\b/i, type: "user" },
];

function fallback(prompt: string): AiDiagram {
  const nodes = keywords
    .filter(({ pattern }) => pattern.test(prompt))
    .map(({ type }, index) => {
      const labels = {
        service: "Application service",
        database: "Database",
        queue: "Queue",
        user: "User",
      };
      return { id: `${type}-${String(index + 1)}`, label: labels[type], type };
    });
  const resolved =
    nodes.length > 0
      ? nodes
      : [{ id: "service-1", label: prompt.slice(0, 64), type: "service" as const }];
  return aiDiagramSchema.parse({
    nodes: resolved,
    edges: resolved.slice(1).map((node, index) => ({
      id: `edge-${String(index + 1)}`,
      source: resolved[index]?.id ?? resolved[0]?.id ?? "service-1",
      target: node.id,
    })),
  });
}

function parseProviderContent(content: unknown): AiDiagram {
  if (typeof content !== "string") throw new Error("AI provider returned no structured content");
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const value = JSON.parse(cleaned) as unknown;
  return aiDiagramSchema.parse(normalizeProviderDiagram(value));
}

function normalizeProviderDiagram(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  const nodes = record.nodes;
  if (!Array.isArray(nodes)) return value;
  const typeAliases: Record<string, "service" | "database" | "queue" | "user" | "group"> = {
    client: "service",
    frontend: "service",
    server: "service",
    backend: "service",
    api: "service",
    gateway: "service",
    compute: "service",
    worker: "service",
    lambda: "service",
    container: "group",
    cache: "queue",
    db: "database",
    storage: "database",
    actor: "user",
  };
  const edges = record.edges;
  return {
    ...record,
    nodes: nodes.map((node: unknown) => {
      if (typeof node !== "object" || node === null || Array.isArray(node)) return node;
      const nodeRecord = node as Record<string, unknown>;
      const type = nodeRecord.type;
      const normalizedType = typeof type === "string" ? typeAliases[type] : undefined;
      const label =
        typeof nodeRecord.label === "string"
          ? nodeRecord.label
          : typeof nodeRecord.name === "string"
            ? nodeRecord.name
            : typeof nodeRecord.id === "string"
              ? nodeRecord.id
              : undefined;
      return {
        ...nodeRecord,
        ...(normalizedType === undefined ? {} : { type: normalizedType }),
        ...(label === undefined ? {} : { label }),
      };
    }),
    ...(Array.isArray(edges)
      ? {
          edges: edges.map((edge: unknown, index) => {
            if (typeof edge !== "object" || edge === null || Array.isArray(edge)) return edge;
            const edgeRecord = edge as Record<string, unknown>;
            const id =
              typeof edgeRecord.id === "string" ? edgeRecord.id : `edge-${String(index + 1)}`;
            const source =
              typeof edgeRecord.source === "string" ? edgeRecord.source : edgeRecord.from;
            const target =
              typeof edgeRecord.target === "string" ? edgeRecord.target : edgeRecord.to;
            return { ...edgeRecord, id, source, target };
          }),
        }
      : {}),
  };
}

function createOpenAiProvider(apiKey: string, model: string, baseUrl: string): AiProvider {
  async function request(instruction: string): Promise<AiDiagram> {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Return only JSON with nodes and edges. Nodes have id, label, type. Edges have id, source, target, optional label.",
          },
          { role: "user", content: instruction },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI provider returned ${String(response.status)}`);
    const body = (await response.json()) as {
      readonly choices?: readonly { readonly message?: { readonly content?: unknown } }[];
    };
    return parseProviderContent(body.choices?.[0]?.message?.content);
  }

  return {
    generate: (input) => request(`Generate a ${input.kind} diagram for: ${input.prompt}`),
    edit: (input) =>
      request(`Edit this diagram according to "${input.prompt}": ${JSON.stringify(input.diagram)}`),
  };
}

function createGeminiProvider(apiKey: string, model: string, baseUrl: string): AiProvider {
  async function request(instruction: string): Promise<AiDiagram> {
    const endpoint = `${baseUrl.replace(/\/$/, "")}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: instruction }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    });
    if (!response.ok) throw new Error(`AI provider returned ${String(response.status)}`);
    const body = (await response.json()) as {
      readonly candidates?: readonly {
        readonly content?: { readonly parts?: readonly { readonly text?: unknown }[] };
      }[];
    };
    return parseProviderContent(body.candidates?.[0]?.content?.parts?.[0]?.text);
  }
  return {
    generate: (input) => request(`Generate a ${input.kind} diagram for: ${input.prompt}`),
    edit: (input) =>
      request(`Edit this diagram according to "${input.prompt}": ${JSON.stringify(input.diagram)}`),
  };
}

async function withRetries<T>(task: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts)
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI provider failed");
}

export function createAiService(
  config: {
    readonly apiKey?: string | undefined;
    readonly provider?: string | undefined;
    readonly model?: string | undefined;
    readonly baseUrl?: string | undefined;
  } = {},
): AiProvider {
  const hasKey = config.apiKey !== undefined && config.apiKey.length > 0;
  const providerName = (config.provider ?? "openai").toLowerCase();
  const provider =
    hasKey && providerName === "openai"
      ? createOpenAiProvider(
          config.apiKey,
          config.model ?? "gpt-4o-mini",
          config.baseUrl ?? "https://api.openai.com/v1",
        )
      : hasKey && (providerName === "google" || providerName === "gemini")
        ? createGeminiProvider(
            config.apiKey,
            (config.model ?? "gemini-2.5-flash").trim().replace(/\s+/g, "-"),
            config.baseUrl?.includes("generativelanguage.googleapis.com")
              ? config.baseUrl
              : "https://generativelanguage.googleapis.com",
          )
        : undefined;
  return {
    generate: async (input) => {
      if (provider !== undefined) return withRetries(() => provider.generate(input));
      if (hasKey) throw new Error(`Unsupported AI provider: ${config.provider ?? "openai"}`);
      return fallback(input.prompt);
    },
    edit: async (input) => {
      if (provider !== undefined) return withRetries(() => provider.edit(input));
      if (hasKey) throw new Error(`Unsupported AI provider: ${config.provider ?? "openai"}`);
      return input.diagram;
    },
  };
}
