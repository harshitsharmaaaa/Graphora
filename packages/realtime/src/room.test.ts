import { describe, expect, it, vi } from "vitest";
import { createEmptyDocument } from "@eraser/editor-core";
import { documentToYDoc } from "./conversion.js";
import { bytesToBase64, type CollaborationRole, type RoomClient } from "./index.js";
import { RealtimeRoomManager } from "./room.js";
import * as Y from "yjs";

function client(clientId: string, role: CollaborationRole, messages: string[]): RoomClient {
  return {
    clientId,
    userId: `user-${clientId}`,
    name: clientId,
    role,
    send: (message) => messages.push(message),
    close: vi.fn(),
  };
}

describe("realtime rooms", () => {
  it("broadcasts updates while keeping viewers read-only", async () => {
    const snapshots: string[] = [];
    const manager = new RealtimeRoomManager((id) => {
      snapshots.push(id);
    }, 1);
    const document = createEmptyDocument();
    const ownerMessages: string[] = [];
    const viewerMessages: string[] = [];
    const owner = client("owner", "owner", ownerMessages);
    const viewer = client("viewer", "viewer", viewerMessages);
    manager.join(document, owner);
    manager.join(document, viewer);

    const changed = documentToYDoc(document);
    changed.getMap("graphora").set("name", "Changed");
    const update = Y.encodeStateAsUpdate(changed);
    manager.receive(owner, document.id, { type: "update", update: bytesToBase64(update) });
    manager.receive(viewer, document.id, { type: "update", update: bytesToBase64(update) });
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(ownerMessages.some((message) => message.includes('"type":"welcome"'))).toBe(true);
    expect(viewerMessages.some((message) => message.includes('"code":"read_only"'))).toBe(true);
    expect(viewerMessages.some((message) => message.includes('"type":"sync"'))).toBe(true);
    expect(snapshots).toEqual([document.id]);
  });
});
