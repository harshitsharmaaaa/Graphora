import { serve } from "@hono/node-server";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import type { Server } from "node:http";
import { WebSocketServer } from "ws";
import { createApp } from "./app.js";
import { env } from "./lib/env.js";
import { createDocumentRepository } from "@eraser/database";
import { createRealtimeGateway } from "./realtime.js";

/** Process entry point — the only module with side effects on import. */
const app = createApp();
const repository = createDocumentRepository(env.databaseUrl);
const gateway = createRealtimeGateway(repository, {
  snapshotDebounceMs: env.realtimeSnapshotDebounceMs,
  idleRoomMs: env.realtimeIdleRoomMs,
  maxClientsPerRoom: env.realtimeMaxClientsPerRoom,
  maxUsersPerRoom: env.realtimeMaxUsersPerRoom,
  maxRooms: env.realtimeMaxRooms,
  maxConnections: env.realtimeMaxConnections,
  maxAwarenessEntries: env.realtimeMaxAwarenessEntries,
  maxUpdateBytes: env.realtimeMaxUpdateBytes,
});
const websocketServer = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 * 1024 });

const server = serve(
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

const httpServer = server as Server;
httpServer.on("upgrade", (request: IncomingMessage, socket: Duplex, head: Buffer) => {
  const pathname = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`)
    .pathname;
  const origin = request.headers.origin;
  if (
    pathname !== env.websocketPath ||
    (origin !== undefined && !env.corsOrigins.includes(origin))
  ) {
    socket.destroy();
    return;
  }
  websocketServer.handleUpgrade(request, socket, head, (websocket) => {
    websocketServer.emit("connection", websocket, request);
  });
});

websocketServer.on("connection", (socket, request) => {
  gateway.handle(socket, request);
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  await gateway.rooms.flush();
  websocketServer.close();
  httpServer.close(() => {
    // eslint-disable-next-line no-console
    console.log(`Graphora stopped (${signal})`);
  });
}

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
