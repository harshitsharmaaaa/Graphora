/**
 * Typed access to browser-safe environment variables.
 *
 * Only `PUBLIC_*` (project convention) and `VITE_*` (Vite default) are ever
 * exposed here — Vite strips everything else at build time, so `SERVER_*`
 * secrets can never leak into the bundle. See `vite.config.ts` `envPrefix`.
 */
const browserEnv = import.meta.env as unknown as {
  readonly PUBLIC_API_URL?: string;
  readonly VITE_API_URL?: string;
  readonly PUBLIC_REALTIME_URL?: string;
};

export const env = {
  apiUrl: browserEnv.PUBLIC_API_URL ?? browserEnv.VITE_API_URL ?? "http://localhost:3001",
  realtimeUrl: browserEnv.PUBLIC_REALTIME_URL ?? "ws://localhost:3001/ws/collaboration",
} as const;
