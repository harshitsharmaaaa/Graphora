import { describe, expect, it } from "vitest";
import { bytesToBase64, parseClientMessage } from "./protocol.js";

describe("collaboration protocol", () => {
  it("rejects malformed and oversized messages", () => {
    expect(parseClientMessage("{")).toBeUndefined();
    expect(parseClientMessage(JSON.stringify({ type: "update", update: "not base64?" }))).toBeUndefined();
  });

  it("round-trips binary payloads through base64", () => {
    const encoded = bytesToBase64(new Uint8Array([0, 1, 255]));
    expect(parseClientMessage(JSON.stringify({ type: "update", update: encoded }))).toEqual({ type: "update", update: encoded });
  });
});
