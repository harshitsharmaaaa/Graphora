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

function readLimit(name: string, fallback: number): number {
  const value = Number.parseInt(readEnv(name, String(fallback)), 10);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${name}`);
  return value;
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
  websocketPath: readEnv("SERVER_WEBSOCKET_PATH", "/ws/collaboration"),
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
  aiApiKey:
    readOptionalEnv("GEMINI_API_KEY") ??
    readOptionalEnv("AI_API_KEY") ??
    readOptionalEnv("OPENAI_API_KEY"),
  aiModel: readEnv("AI_MODEL", "gemini-2.5-flash"),
  aiBaseUrl: readEnv("AI_BASE_URL", "https://api.openai.com/v1"),
  realtimeSnapshotDebounceMs: readLimit("SERVER_REALTIME_SNAPSHOT_DEBOUNCE_MS", 750),
  realtimeIdleRoomMs: readLimit("SERVER_REALTIME_IDLE_ROOM_MS", 60_000),
  realtimeMaxClientsPerRoom: readLimit("SERVER_REALTIME_MAX_CLIENTS_PER_ROOM", 100),
  realtimeMaxUsersPerRoom: readLimit("SERVER_REALTIME_MAX_USERS_PER_ROOM", 100),
  realtimeMaxRooms: readLimit("SERVER_REALTIME_MAX_ROOMS", 1_000),
  realtimeMaxConnections: readLimit("SERVER_REALTIME_MAX_CONNECTIONS", 2_000),
  realtimeMaxAwarenessEntries: readLimit("SERVER_REALTIME_MAX_AWARENESS_ENTRIES", 100),
  realtimeMaxUpdateBytes: readLimit("SERVER_REALTIME_MAX_UPDATE_BYTES", 5 * 1024 * 1024),
} as const;

export type Env = typeof env;
