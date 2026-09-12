import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { applyYDocUpdate, yDocToDocument } from "./conversion.js";
import {
  base64ToBytes,
  encodeMessage,
  parseServerMessage,
  bytesToBase64,
  type CollaborationRole,
  type PresenceState,
} from "./protocol.js";
import type { Document } from "@eraser/editor-core";

export interface CollaborationClientOptions {
  readonly url: string;
  readonly documentId: string;
  readonly clientId: string;
  readonly reconnectMs?: number;
  /** Enable durable browser-side Yjs persistence for offline editing. */
  readonly persistence?: boolean | string;
}

export type CollaborationConnectionState = "offline" | "connecting" | "connected" | "reconnecting";

export class RealtimeCollaborationClient {
  readonly yDoc = new Y.Doc();
  private socket: WebSocket | undefined;
  private stopped = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly listeners = new Set<(document: Document) => void>();
  private readonly presenceListeners = new Set<(presence: readonly PresenceState[]) => void>();
  private readonly presence = new Map<string, PresenceState>();
  private readonly stateListeners = new Set<(state: CollaborationConnectionState) => void>();
  private readonly persistence: IndexeddbPersistence | undefined;
  private _state: CollaborationConnectionState = "offline";
  private _connected = false;
  private _role: CollaborationRole | undefined;

  constructor(private readonly options: CollaborationClientOptions) {
    const browserIndexedDb = (globalThis as { readonly indexedDB?: unknown }).indexedDB;
    if (options.persistence !== undefined && browserIndexedDb !== undefined) {
      const name =
        typeof options.persistence === "string"
          ? options.persistence
          : `graphora:${options.documentId}`;
      this.persistence = new IndexeddbPersistence(name, this.yDoc);
    }
    this.yDoc.on("update", (update: Uint8Array, origin: unknown) => {
      if (
        origin === this ||
        !this._connected ||
        this.socket?.readyState !== WebSocket.OPEN ||
        this._role === "viewer"
      )
        return;
      this.socket.send(encodeMessage({ type: "update", update: bytesToBase64(update) }));
    });
  }

  get role(): CollaborationRole | undefined {
    return this._role;
  }

  get state(): CollaborationConnectionState {
    return this._state;
  }

  get isConnected(): boolean {
    return this._connected;
  }

  connect(): void {
    this.stopped = false;
    this.setState(this.socket === undefined ? "connecting" : "reconnecting");
    this.open();
  }

  disconnect(): void {
    this.stopped = true;
    if (this.reconnectTimer !== undefined) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this._connected = false;
    this.socket?.close();
    this.socket = undefined;
    this.setState("offline");
  }

  async destroy(): Promise<void> {
    this.disconnect();
    this.yDoc.destroy();
    await this.persistence?.destroy();
  }

  setAwareness(state: Record<string, unknown> | null): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(encodeMessage({ type: "awareness", state }));
    }
  }

  onDocument(listener: (document: Document) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onPresence(listener: (presence: readonly PresenceState[]) => void): () => void {
    this.presenceListeners.add(listener);
    return () => this.presenceListeners.delete(listener);
  }

  onState(listener: (state: CollaborationConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this._state);
    return () => this.stateListeners.delete(listener);
  }

  private open(): void {
    if (this.stopped) return;
    this.setState("connecting");
    const socket = new WebSocket(this.options.url);
    this.socket = socket;
    socket.onopen = () => {
      this._connected = false;
      socket.send(
        encodeMessage({
          type: "hello",
          documentId: this.options.documentId,
          clientId: this.options.clientId,
        }),
      );
    };
    socket.onmessage = (event) => {
      const message = parseServerMessage(
        typeof event.data === "string" ? event.data : new Uint8Array(event.data as ArrayBuffer),
      );
      if (message === undefined) return;
      const type = message.type;
      if (type === "welcome") {
        this._connected = true;
        this.setState("connected");
        this._role = message.role;
        applyYDocUpdate(this.yDoc, base64ToBytes(message.update), this);
        for (const item of message.awareness) this.presence.set(item.clientId, item);
        this.emit();
        this.emitPresence();
        if (this._role !== "viewer") {
          socket.send(
            encodeMessage({
              type: "update",
              update: bytesToBase64(Y.encodeStateAsUpdate(this.yDoc)),
            }),
          );
        }
      } else if (type === "sync") {
        applyYDocUpdate(this.yDoc, base64ToBytes(message.update), this);
        this.emit();
      } else if (type === "awareness") {
        const item: PresenceState = message.presence;
        if (item.state === null) this.presence.delete(item.clientId);
        else this.presence.set(item.clientId, item);
        this.emitPresence();
      } else {
        if (
          message.code === "unauthorized" ||
          message.code === "forbidden" ||
          message.code === "not_found"
        ) {
          this.stopped = true;
          this._connected = false;
          this.setState("offline");
        }
      }
    };
    socket.onclose = () => {
      this._connected = false;
      if (this.socket === socket) this.socket = undefined;
      if (!this.stopped) {
        this.setState("reconnecting");
        this.reconnectTimer = setTimeout(() => {
          this.open();
        }, this.options.reconnectMs ?? 1000);
      } else {
        this.setState("offline");
      }
    };
  }

  private emit(): void {
    const document = yDocToDocument(this.yDoc);
    for (const listener of this.listeners) listener(document);
  }

  private emitPresence(): void {
    const values = [...this.presence.values()];
    for (const listener of this.presenceListeners) listener(values);
  }

  private setState(state: CollaborationConnectionState): void {
    if (this._state === state) return;
    this._state = state;
    for (const listener of [...this.stateListeners]) listener(state);
  }
}
