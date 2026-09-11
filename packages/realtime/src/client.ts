import * as Y from "yjs";
import { applyYDocUpdate, yDocToDocument } from "./conversion.js";
import { base64ToBytes, encodeMessage, parseServerMessage, bytesToBase64, type CollaborationRole, type PresenceState } from "./protocol.js";
import type { Document } from "@eraser/editor-core";

export interface CollaborationClientOptions {
  readonly url: string;
  readonly documentId: string;
  readonly clientId: string;
  readonly reconnectMs?: number;
}

export class RealtimeCollaborationClient {
  readonly yDoc = new Y.Doc();
  private socket: WebSocket | undefined;
  private stopped = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly listeners = new Set<(document: Document) => void>();
  private readonly presenceListeners = new Set<(presence: readonly PresenceState[]) => void>();
  private readonly presence = new Map<string, PresenceState>();
  private _role: CollaborationRole | undefined;

  constructor(private readonly options: CollaborationClientOptions) {
    this.yDoc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === this || this.socket?.readyState !== WebSocket.OPEN || this._role === "viewer") return;
      this.socket.send(encodeMessage({ type: "update", update: bytesToBase64(update) }));
    });
  }

  get role(): CollaborationRole | undefined {
    return this._role;
  }

  connect(): void {
    this.stopped = false;
    this.open();
  }

  disconnect(): void {
    this.stopped = true;
    if (this.reconnectTimer !== undefined) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.socket?.close();
    this.socket = undefined;
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

  private open(): void {
    if (this.stopped) return;
    const socket = new WebSocket(this.options.url);
    this.socket = socket;
    socket.onopen = () => {
      socket.send(encodeMessage({ type: "hello", documentId: this.options.documentId, clientId: this.options.clientId }));
    };
    socket.onmessage = (event) => {
      const message = parseServerMessage(typeof event.data === "string" ? event.data : new Uint8Array(event.data as ArrayBuffer));
      if (message === undefined) return;
      const type = message.type;
      if (type === "welcome") {
        this._role = message.role;
        applyYDocUpdate(this.yDoc, base64ToBytes(message.update), this);
        for (const item of message.awareness) this.presence.set(item.clientId, item);
        this.emit();
        this.emitPresence();
        if (this._role !== "viewer") {
          socket.send(encodeMessage({ type: "update", update: bytesToBase64(Y.encodeStateAsUpdate(this.yDoc)) }));
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
        if (message.code === "unauthorized" || message.code === "forbidden" || message.code === "not_found") {
          this.stopped = true;
        }
      }
    };
    socket.onclose = () => {
      if (this.socket === socket) this.socket = undefined;
      if (!this.stopped) {
        this.reconnectTimer = setTimeout(() => {
          this.open();
        }, this.options.reconnectMs ?? 1000);
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
}
