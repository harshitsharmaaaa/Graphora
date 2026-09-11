import type { Document } from "@eraser/editor-core";
import * as Y from "yjs";
import { base64ToBytes, bytesToBase64, type AwarenessMessage, type CollaborationRole, type PresenceState, type UpdateMessage } from "./protocol.js";
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

class DebouncedSnapshot {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending: Document | undefined;

  constructor(private readonly delayMs: number, private readonly hook: SnapshotHook, private readonly documentId: string) {}

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
  ) {
    this.yDoc = documentToYDoc(document);
    this.currentDocument = document;
    this.snapshot = new DebouncedSnapshot(snapshotDebounceMs, snapshotHook, documentId);
  }

  add(client: RoomClient): void {
    this.clients.set(client.clientId, client);
    client.send(JSON.stringify({
      type: "welcome",
      documentId: this.documentId,
      clientId: client.clientId,
      role: client.role,
      update: bytesToBase64(Y.encodeStateAsUpdate(this.yDoc)),
      awareness: [...this.presence.values()],
    }));
    this.broadcastPresence(client, null);
  }

  remove(clientId: string): void {
    this.clients.delete(clientId);
    this.presence.delete(clientId);
    for (const client of this.clients.values()) {
      client.send(JSON.stringify({
        type: "awareness",
        presence: { clientId, userId: "", name: "", role: "viewer", state: null },
      }));
    }
  }

  receive(client: RoomClient, message: UpdateMessage | AwarenessMessage): void {
    if (!this.clients.has(client.clientId)) return;
    if (message.type === "update") {
      if (client.role === "viewer") {
        client.send(JSON.stringify({ type: "error", code: "read_only", message: "Viewer connections cannot edit this document" }));
        return;
      }
      let update: Uint8Array;
      try {
        update = base64ToBytes(message.update);
        Y.applyUpdate(this.yDoc, update, client);
      } catch {
        client.send(JSON.stringify({ type: "error", code: "invalid_message", message: "Invalid Yjs update" }));
        return;
      }
      try {
        const nextDocument = yDocToDocument(this.yDoc);
        this.currentDocument = nextDocument;
        this.snapshot.schedule(nextDocument);
      } catch {
        this.yDoc = documentToYDoc(this.currentDocument);
        client.send(JSON.stringify({ type: "error", code: "invalid_message", message: "Update would invalidate the document" }));
        client.close(1008, "Invalid document update");
        return;
      }
      const encoded = bytesToBase64(update);
      for (const peer of this.clients.values()) {
        if (peer.clientId !== client.clientId) peer.send(JSON.stringify({ type: "sync", update: encoded }));
      }
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

  private broadcastPresence(source: RoomClient, state: Record<string, unknown> | null): void {
    const presence: PresenceState = {
      clientId: source.clientId,
      userId: source.userId,
      name: source.name,
      role: source.role,
      state,
    };
    for (const peer of this.clients.values()) {
      if (peer.clientId !== source.clientId) peer.send(JSON.stringify({ type: "awareness", presence }));
    }
  }
}

export class RealtimeRoomManager {
  private readonly rooms = new Map<string, Room>();

  constructor(
    private readonly snapshotHook: SnapshotHook,
    private readonly snapshotDebounceMs = 750,
  ) {}

  join(document: Document, client: RoomClient): void {
    let room = this.rooms.get(document.id);
    if (room === undefined) {
      room = new Room(document.id, document, this.snapshotHook, this.snapshotDebounceMs);
      this.rooms.set(document.id, room);
    }
    room.add(client);
  }

  receive(client: RoomClient, documentId: string, message: UpdateMessage | AwarenessMessage): void {
    this.rooms.get(documentId)?.receive(client, message);
  }

  leave(documentId: string, clientId: string): void {
    const room = this.rooms.get(documentId);
    if (room === undefined) return;
    room.remove(clientId);
  }

  async flush(): Promise<void> {
    await Promise.all([...this.rooms.values()].map((room) => room.flush()));
  }
}
