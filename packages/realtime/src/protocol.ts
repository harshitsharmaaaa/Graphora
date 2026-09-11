export type CollaborationRole = "owner" | "editor" | "viewer";

export interface HelloMessage {
  readonly type: "hello";
  readonly documentId: string;
  readonly clientId: string;
}

export interface UpdateMessage {
  readonly type: "update";
  readonly update: string;
}

export interface AwarenessMessage {
  readonly type: "awareness";
  readonly state: Record<string, unknown> | null;
}

export type ClientMessage = HelloMessage | UpdateMessage | AwarenessMessage;

export interface WelcomeMessage {
  readonly type: "welcome";
  readonly documentId: string;
  readonly clientId: string;
  readonly role: CollaborationRole;
  readonly update: string;
  readonly awareness: readonly PresenceState[];
}

export interface SyncMessage {
  readonly type: "sync";
  readonly update: string;
}

export interface PresenceState {
  readonly clientId: string;
  readonly userId: string;
  readonly name: string;
  readonly role: CollaborationRole;
  readonly state: Record<string, unknown> | null;
}

export interface AwarenessBroadcastMessage {
  readonly type: "awareness";
  readonly presence: PresenceState;
}

export interface ErrorMessage {
  readonly type: "error";
  readonly code: "invalid_message" | "unauthorized" | "forbidden" | "not_found" | "read_only" | "server_error";
  readonly message: string;
}

export type ServerMessage = WelcomeMessage | SyncMessage | AwarenessBroadcastMessage | ErrorMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function validBase64(value: unknown): value is string {
  return typeof value === "string" && value.length <= 7_500_000 && /^[A-Za-z0-9+/]*={0,2}$/.test(value);
}

function validRole(value: unknown): value is CollaborationRole {
  return value === "owner" || value === "editor" || value === "viewer";
}

function validPresence(value: unknown): value is PresenceState {
  if (!isRecord(value) || !boundedString(value.clientId, 128) || !boundedString(value.userId, 256) ||
      !boundedString(value.name, 512) || !validRole(value.role)) return false;
  return value.state === null || isRecord(value.state);
}

function validPresenceMessage(value: unknown): value is PresenceState {
  if (validPresence(value)) return true;
  if (!isRecord(value) || !boundedString(value.clientId, 128)) return false;
  return value.userId === "" && value.name === "" && value.role === "viewer" && value.state === null;
}

export function parseClientMessage(raw: string | Uint8Array): ClientMessage | undefined {
  const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
  if (text.length > 8_000_000) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
  if (!isRecord(value) || typeof value.type !== "string") return undefined;
  if (value.type === "hello" && boundedString(value.documentId, 128) && boundedString(value.clientId, 128)) {
    return { type: "hello", documentId: value.documentId, clientId: value.clientId };
  }
  if (value.type === "update" && validBase64(value.update)) return { type: "update", update: value.update };
  if (value.type === "awareness") {
    if (value.state !== null && !isRecord(value.state)) return undefined;
    return { type: "awareness", state: value.state };
  }
  return undefined;
}

export function parseServerMessage(raw: string | Uint8Array): ServerMessage | undefined {
  const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
  if (text.length > 8_000_000) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
  if (!isRecord(value) || typeof value.type !== "string") return undefined;
  if (value.type === "welcome" && boundedString(value.documentId, 128) && boundedString(value.clientId, 128) &&
      validRole(value.role) && validBase64(value.update) && Array.isArray(value.awareness) &&
      value.awareness.every(validPresence)) {
    return {
      type: "welcome",
      documentId: value.documentId,
      clientId: value.clientId,
      role: value.role,
      update: value.update,
      awareness: value.awareness,
    };
  }
  if (value.type === "sync" && validBase64(value.update)) return { type: "sync", update: value.update };
  if (value.type === "awareness" && validPresenceMessage(value.presence)) {
    return { type: "awareness", presence: value.presence };
  }
  const errorCodes = ["invalid_message", "unauthorized", "forbidden", "not_found", "read_only", "server_error"] as const;
  if (value.type === "error" && typeof value.message === "string" && errorCodes.includes(value.code as typeof errorCodes[number])) {
    return { type: "error", code: value.code as ErrorMessage["code"], message: value.message };
  }
  return undefined;
}

export function encodeMessage(message: ServerMessage | ClientMessage): string {
  return JSON.stringify(message);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let text = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    text += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(text);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
