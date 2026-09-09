/**
 * Typed access to browser-safe environment variables.
 *
 * Only `PUBLIC_*` (project convention) and `VITE_*` (Vite default) are ever
 * exposed here — Vite strips everything else at build time, so `SERVER_*`
 * secrets can never leak into the bundle. See `vite.config.ts` `envPrefix`.
 */
export const env = {
  apiUrl: import.meta.env.PUBLIC_API_URL ?? import.meta.env.VITE_API_URL ?? "http://localhost:3001",
} as const;
