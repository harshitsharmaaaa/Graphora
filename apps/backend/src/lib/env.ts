/**
 * Typed access to backend-only environment variables.
 *
 * ONLY `SERVER_*` is read here. These values must never be imported by
 * `apps/frontend` — Vite never exposes them (see `apps/frontend/vite.config.ts`
 * `envPrefix`), and the `apps/backend -> packages/*` dependency rule forbids
 * the frontend from reaching into this module.
 */
function readEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value === undefined || value === "" ? undefined : value;
}

function readPort(): number {
  const raw = readEnv("SERVER_PORT", "3001");
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid SERVER_PORT: ${JSON.stringify(raw)}`);
  }
  return parsed;
}

export const env = {
  port: readPort(),
  host: readEnv("SERVER_HOST", "0.0.0.0"),
  corsOrigins: readEnv("SERVER_CORS_ORIGINS", "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
  logLevel: readEnv("SERVER_LOG_LEVEL", "info"),
  databaseUrl: process.env.DATABASE_URL,
  betterAuthSecret: readOptionalEnv("BETTER_AUTH_SECRET") ?? "development-secret-change-me",
  betterAuthUrl: readEnv("BETTER_AUTH_URL", "http://localhost:3001"),
  googleClientId: readOptionalEnv("GOOGLE_CLIENT_ID"),
  googleClientSecret: readOptionalEnv("GOOGLE_CLIENT_SECRET"),
  aiProvider: readEnv("AI_PROVIDER", "openai"),
  aiApiKey: readOptionalEnv("GEMINI_API_KEY") ?? readOptionalEnv("AI_API_KEY") ?? readOptionalEnv("OPENAI_API_KEY"),
  aiModel: readEnv("AI_MODEL", "gemini-2.5-flash"),
  aiBaseUrl: readEnv("AI_BASE_URL", "https://api.openai.com/v1"),
} as const;

export type Env = typeof env;
