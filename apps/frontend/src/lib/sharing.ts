import { parseDocument, serializeDocument } from "@eraser/editor-core";
import type { Document, DocumentPersistence } from "@eraser/editor-core";
import { env } from "./env.js";

interface CreateShareResponse {
  readonly token: string;
}

export async function createShareLink(document: Document): Promise<string> {
  const response = await fetch(`${env.apiUrl}/shares`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      documentId: document.id,
      document: JSON.parse(serializeDocument(document)) as unknown,
    }),
  });
  if (!response.ok) throw new Error(`Share creation failed (${String(response.status)})`);
  const result = (await response.json()) as CreateShareResponse;
  if (typeof result.token !== "string" || result.token.length < 20) {
    throw new Error("Share service returned an invalid token");
  }
  return `${window.location.origin}/share/${encodeURIComponent(result.token)}`;
}

export async function revokeShareLink(token: string): Promise<void> {
  const response = await fetch(`${env.apiUrl}/shares/${encodeURIComponent(token)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`Share revocation failed (${String(response.status)})`);
}

export function createSharedDocumentPersistence(token: string): DocumentPersistence {
  return {
    async load() {
      const response = await fetch(`${env.apiUrl}/shares/${encodeURIComponent(token)}`);
      if (!response.ok) return null;
      const payload = (await response.json()) as { readonly document?: unknown };
      return payload.document === undefined ? null : parseDocument(payload.document);
    },
    async save() {
      // Public viewers never write.
    },
    async delete() {
      // Public viewers never write.
    },
  };
}
