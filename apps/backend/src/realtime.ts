import type { IncomingMessage } from "node:http";
import type { RawData, WebSocket } from "ws";
import { authorizationService } from "./services/authorization.js";
import type { DocumentRepository } from "@eraser/database";
import { parseDocument } from "@eraser/editor-core";
import { auth } from "./lib/auth.js";
import {
  encodeMessage,
  parseClientMessage,
  RealtimeRoomManager,
  type RoomClient,
} from "@eraser/realtime";

function requestHeaders(request: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    headers.set(name, Array.isArray(value) ? value.join(",") : value);
  }
  return headers;
}

function rawMessage(raw: RawData): string | Uint8Array | undefined {
  if (typeof raw === "string") return raw;
  if (Buffer.isBuffer(raw)) return raw;
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
  return undefined;
}

function roleFor(value: string): "owner" | "editor" | "viewer" | undefined {
  return value === "owner" || value === "editor" || value === "viewer" ? value : undefined;
}

export function createRealtimeGateway(repository: DocumentRepository) {
  const rooms = new RealtimeRoomManager(async (documentId, document) => {
    await repository.saveDocument({ id: documentId, data: document });
  });

  function handle(socket: WebSocket, request: IncomingMessage): void {
    let roomId: string | undefined;
    let clientId: string | undefined;
    let joined = false;
    let client: RoomClient | undefined;
    const handshakeTimer = setTimeout(() => {
      if (!joined) socket.close(1008, "Collaboration handshake timed out");
    }, 10_000);

    const fail = (code: "invalid_message" | "unauthorized" | "forbidden" | "not_found" | "server_error", message: string): void => {
      socket.send(encodeMessage({ type: "error", code, message }));
      socket.close(1008, message);
    };

    socket.on("message", (raw) => {
      void (async () => {
      const payload = rawMessage(raw);
      if (payload === undefined) {
        fail("invalid_message", "Invalid collaboration message");
        return;
      }
      const message = parseClientMessage(payload);
      if (message === undefined) {
        fail("invalid_message", "Invalid collaboration message");
        return;
      }
      if (!joined) {
        if (message.type !== "hello") {
          fail("invalid_message", "The first message must be hello");
          return;
        }
        const session = await auth.api.getSession({ headers: requestHeaders(request), asResponse: false });
        const user = session?.user;
        if (user === undefined) {
          fail("unauthorized", "A signed-in session is required");
          return;
        }
        const access = await repository.getDocumentAccess(message.documentId);
        if (access === undefined) {
          fail("not_found", "Document not found");
          return;
        }
        const member = access.members.find((candidate) => candidate.userId === user.id);
        const role = access.ownerId === user.id ? "owner" : roleFor(member?.role ?? "");
        if (role === undefined || !authorizationService.canView(access, user.id)) {
          fail("forbidden", "You do not have access to this document");
          return;
        }
        roomId = message.documentId;
        clientId = message.clientId;
        client = {
          clientId,
          userId: user.id,
          name: user.name,
          role,
          send: (payload) => {
            if (socket.readyState === socket.OPEN) socket.send(payload);
          },
          close: (code, reason) => {
            socket.close(code, reason);
          },
        };
        const record = await repository.getDocument(message.documentId);
        if (record === undefined) {
          fail("not_found", "Document not found");
          return;
        }
        try {
          rooms.join(parseDocument(record.data), client);
        } catch {
          fail("server_error", "Stored document is invalid");
          return;
        }
        joined = true;
        clearTimeout(handshakeTimer);
        return;
      }
      if (message.type === "hello") {
        fail("invalid_message", "A collaboration session can only send one hello");
        return;
      }
      if (client !== undefined && roomId !== undefined) rooms.receive(client, roomId, message);
      })().catch(() => {
        fail("server_error", "Collaboration request failed");
      });
    });

    socket.on("close", () => {
      clearTimeout(handshakeTimer);
      if (joined && roomId !== undefined && clientId !== undefined) rooms.leave(roomId, clientId);
    });
    socket.on("error", () => {
      clearTimeout(handshakeTimer);
      if (joined && roomId !== undefined && clientId !== undefined) rooms.leave(roomId, clientId);
    });
  }

  return { handle, rooms };
}
