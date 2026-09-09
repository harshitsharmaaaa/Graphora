import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { env } from "./lib/env.js";

/** Process entry point — the only module with side effects on import. */
const app = createApp();

serve(
  {
    fetch: app.fetch,
    port: env.port,
    hostname: env.host,
  },
  (info) => {
    // Intentional: single startup line; no logger dependency yet.
    // eslint-disable-next-line no-console
    console.log(`API listening on http://${info.address}:${String(info.port)}`);
  },
);
