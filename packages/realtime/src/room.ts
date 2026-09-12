import type { Document } from "@eraser/editor-core";
import * as Y from "yjs";
import {
  base64ToBytes,
  bytesToBase64,
  type AwarenessMessage,
  type CollaborationRole,
  type PresenceState,
  type UpdateMessage,
} from "./protocol.js";
import { documentToYDoc, yDocToDocument } from "./conversion.js";

export interface RoomClient {
  readonly clientId: string;
  readonly userId: string;
  readonly name: string;
  readonly role: CollaborationRole;
  send(message: string): void;
  close(code: number, reason: string): void;
}

export type SnapshotHook = (documentId: string, document: Document) => Promise<void> | void;

export interface RealtimeRoomOptions {
  readonly snapshotDebounceMs?: number;
  readonly idleRoomMs?: number;
  readonly maxClientsPerRoom?: number;
  readonly maxUsersPerRoom?: number;
  readonly maxRooms?: number;
  readonly maxConnections?: number;
  readonly maxAwarenessEntries?: number;
  readonly maxUpdateBytes?: number;
}

class DebouncedSnapshot {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending: Document | undefined;

  constructor(
    private readonly delayMs: number,
    private readonly hook: SnapshotHook,
    private readonly documentId: string,
  ) {}

  schedule(document: Document): void {
    this.pending = document;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      const pending = this.pending;
      this.pending = undefined;
      if (pending !== undefined) {
        void Promise.resolve(this.hook(this.documentId, pending)).catch(() => undefined);
      }
    }, this.delayMs);
  }

  async flush(): Promise<void> {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    const pending = this.pending;
    this.pending = undefined;
    if (pending !== undefined) await this.hook(this.documentId, pending);
  }
}

class Room {
  yDoc: Y.Doc;
  private currentDocument: Document;
  private readonly clients = new Map<string, RoomClient>();
  private readonly presence = new Map<string, PresenceState>();
  private readonly snapshot: DebouncedSnapshot;

  constructor(
    readonly documentId: string,
    document: Document,
    snapshotHook: SnapshotHook,
    snapshotDebounceMs: number,
    private readonly limits: RealtimeRoomOptions = {},
  ) {
    this.yDoc = documentToYDoc(document);
    this.currentDocument = document;
    this.snapshot = new DebouncedSnapshot(snapshotDebounceMs, snapshotHook, documentId);
  }

  get size(): number {
    return this.clients.size;
  }

  hasUser(userId: string): boolean {
    return [...this.clients.values()].some((client) => client.userId === userId);
  }

  add(client: RoomClient): boolean {
    if (this.clients.has(client.clientId)) {
      client.close(1008, "Duplicate collaboration client");
      return false;
    }
    if (
      this.limits.maxClientsPerRoom !== undefined &&
      this.clients.size >= this.limits.maxClientsPerRoom
    ) {
      client.close(1013, "Collaboration room is full");
      return false;
    }
    if (
      this.limits.maxUsersPerRoom !== undefined &&
      !this.hasUser(client.userId) &&
      new Set([...this.clients.values()].map((item) => item.userId)).size >=
        this.limits.maxUsersPerRoom
    ) {
      client.close(1013, "Collaboration user limit reached");
      return false;
    }
    this.clients.set(client.clientId, client);
    client.send(
      JSON.stringify({
        type: "welcome",
        documentId: this.documentId,
        clientId: client.clientId,
        role: client.role,
        update: bytesToBase64(Y.encodeStateAsUpdate(this.yDoc)),
        awareness: [...this.presence.values()],
      }),
    );
    this.broadcastPresence(client, null);
    return true;
  }

  remove(clientId: string): void {
    this.clients.delete(clientId);
    this.presence.delete(clientId);
    for (const client of this.clients.values()) {
      client.send(
        JSON.stringify({
          type: "awareness",
          presence: { clientId, userId: "", name: "", role: "viewer", state: null },
        }),
      );
    }
  }

  receive(client: RoomClient, message: UpdateMessage | AwarenessMessage): void {
    if (!this.clients.has(client.clientId)) return;
    if (message.type === "update") {
      if (client.role === "viewer") {
        client.send(
          JSON.stringify({
            type: "error",
            code: "read_only",
            message: "Viewer connections cannot edit this document",
          }),
        );
        return;
      }
      let update: Uint8Array;
      try {
        update = base64ToBytes(message.update);
        if (
          this.limits.maxUpdateBytes !== undefined &&
          update.byteLength > this.limits.maxUpdateBytes
        ) {
          client.send(
            JSON.stringify({
              type: "error",
              code: "invalid_message",
              message: "Collaboration update is too large",
            }),
          );
          return;
        }
        Y.applyUpdate(this.yDoc, update, client);
      } catch {
        client.send(
          JSON.stringify({ type: "error", code: "invalid_message", message: "Invalid Yjs update" }),
        );
        return;
      }
      try {
        const nextDocument = yDocToDocument(this.yDoc);
        this.currentDocument = nextDocument;
        this.snapshot.schedule(nextDocument);
      } catch {
        this.yDoc = documentToYDoc(this.currentDocument);
        client.send(
          JSON.stringify({
            type: "error",
            code: "invalid_message",
            message: "Update would invalidate the document",
          }),
        );
        client.close(1008, "Invalid document update");
        return;
      }
      const encoded = bytesToBase64(update);
      for (const peer of this.clients.values()) {
        if (peer.clientId !== client.clientId)
          peer.send(JSON.stringify({ type: "sync", update: encoded }));
      }
      return;
    }
    if (
      this.limits.maxAwarenessEntries !== undefined &&
      !this.presence.has(client.clientId) &&
      this.presence.size >= this.limits.maxAwarenessEntries
    ) {
      client.send(
        JSON.stringify({
          type: "error",
          code: "invalid_message",
          message: "Awareness limit reached",
        }),
      );
      return;
    }
    const state = message.state;
    const presence: PresenceState = {
      clientId: client.clientId,
      userId: client.userId,
      name: client.name,
      role: client.role,
      state,
    };
    this.presence.set(client.clientId, presence);
    this.broadcastPresence(client, state);
  }

  async flush(): Promise<void> {
    await this.snapshot.flush();
  }

  closeAll(code: number, reason: string): void {
    for (const client of this.clients.values()) client.close(code, reason);
    this.clients.clear();
    this.presence.clear();
  }

  private broadcastPresence(source: RoomClient, state: Record<string, unknown> | null): void {
    const presence: PresenceState = {
      clientId: source.clientId,
      userId: source.userId,
      name: source.name,
      role: source.role,
      state,
    };
    for (const peer of this.clients.values()) {
      if (peer.clientId !== source.clientId)
        peer.send(JSON.stringify({ type: "awareness", presence }));
    }
  }
}

export class RealtimeRoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly limits: RealtimeRoomOptions;
  private readonly idleTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly snapshotHook: SnapshotHook,
    options: number | RealtimeRoomOptions = 750,
  ) {
    this.limits = typeof options === "number" ? {} : options;
    this.snapshotDebounceMs =
      typeof options === "number" ? options : (options.snapshotDebounceMs ?? 750);
  }

  private readonly snapshotDebounceMs: number;

  join(document: Document, client: RoomClient): void {
    if (
      this.limits.maxConnections !== undefined &&
      this.connectionCount() >= this.limits.maxConnections
    ) {
      client.close(1013, "Collaboration connection limit reached");
      return;
    }
    let room = this.rooms.get(document.id);
    if (room === undefined) {
      if (this.limits.maxRooms !== undefined && this.rooms.size >= this.limits.maxRooms) {
        client.close(1013, "Collaboration room limit reached");
        return;
      }
      room = new Room(
        document.id,
        document,
        this.snapshotHook,
        this.snapshotDebounceMs,
        this.limits,
      );
      this.rooms.set(document.id, room);
    }
    const timer = this.idleTimers.get(document.id);
    if (timer !== undefined) clearTimeout(timer);
    this.idleTimers.delete(document.id);
    room.add(client);
  }

  receive(client: RoomClient, documentId: string, message: UpdateMessage | AwarenessMessage): void {
    this.rooms.get(documentId)?.receive(client, message);
  }

  leave(documentId: string, clientId: string): void {
    const room = this.rooms.get(documentId);
    if (room === undefined) return;
    room.remove(clientId);
    if (room.size === 0) {
      void room.flush().catch(() => undefined);
      this.scheduleIdleCleanup(documentId);
    }
  }

  async flush(): Promise<void> {
    await Promise.all([...this.rooms.values()].map((room) => room.flush()));
  }

  revoke(documentId: string, reason = "Document access revoked"): void {
    const room = this.rooms.get(documentId);
    if (room === undefined) return;
    room.closeAll(1008, reason);
    this.rooms.delete(documentId);
  }

  roomCount(): number {
    return this.rooms.size;
  }

  private connectionCount(): number {
    let total = 0;
    for (const room of this.rooms.values()) total += room.size;
    return total;
  }

  private scheduleIdleCleanup(documentId: string): void {
    if (this.idleTimers.has(documentId)) return;
    const delay = this.limits.idleRoomMs ?? 60_000;
    const timer = setTimeout(() => {
      this.idleTimers.delete(documentId);
      const room = this.rooms.get(documentId);
      if (room?.size !== 0) return;
      void room.flush().finally(() => {
        if (room.size === 0 && this.rooms.get(documentId) === room) this.rooms.delete(documentId);
      });
    }, delay);
    if ("unref" in timer && typeof timer.unref === "function") timer.unref();
    this.idleTimers.set(documentId, timer);
  }
}
