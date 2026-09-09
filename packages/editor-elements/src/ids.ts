/**
 * Unique element ids. Implemented here (element identity belongs to this
 * package); `@eraser/editor-core` re-exports it from its `ids/` module so
 * there is exactly one implementation.
 */
export function createElementId(): string {
  const cryptoRef =
    typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto
      : undefined;
  if (cryptoRef !== undefined) return cryptoRef.randomUUID();
  return `el-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffff)
    .toString(36)
    .padStart(4, "0")}`;
}
