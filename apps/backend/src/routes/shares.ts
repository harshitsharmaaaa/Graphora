import { Hono } from "hono";
import { validateDocumentPayload, DOCUMENT_MAX_BYTES } from "@eraser/shared-validation";
import type { ShareService } from "../services/shares.js";
import { auth } from "../lib/auth.js";
import type { DocumentRepository } from "@eraser/database";

async function getAuthenticatedUser(c: { req: { raw: Request } }) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers, asResponse: false });
  return session?.user ?? null;
}

export function createShareRoutes(shares: ShareService, repository?: DocumentRepository) {
  return new Hono()
    .post("/", async (c) => {
      const user = await getAuthenticatedUser(c);
      if (user === null) return c.json({ error: "Unauthorized" }, 401);
      const contentLength = Number(c.req.header("content-length") ?? 0);
      if (contentLength > DOCUMENT_MAX_BYTES + 16_384) return c.json({ error: "Document is too large" }, 413);
      let body: { readonly documentId?: string; readonly document?: unknown };
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: "Invalid JSON body" }, 400);
      }
      if (
        typeof body.documentId !== "string" ||
        body.documentId.length === 0 ||
        body.document === undefined
      ) {
        return c.json({ error: "documentId and document are required" }, 400);
      }
      const parsed = validateDocumentPayload(body.document);
      if (!parsed.success) return c.json({ error: parsed.error === "too_large" ? "Document is too large" : "Invalid document" }, parsed.error === "too_large" ? 413 : 400);
      if (parsed.data.id !== body.documentId) return c.json({ error: "documentId does not match document.id" }, 400);
      if (repository !== undefined) {
        const existing = await repository.getDocument(body.documentId);
        if (existing === undefined) return c.json({ error: "Document not found" }, 404);
        if (existing.ownerId !== user.id) return c.json({ error: "Forbidden" }, 403);
      }
      const record = await shares.create(body.documentId, parsed.data);
      return c.json({
        token: record.token,
        documentId: record.documentId,
        createdAt: record.createdAt,
        revision: record.revision,
        updatedAt: record.updatedAt,
      }, 201);
    })
    .get("/:token", async (c) => {
      const record = await shares.get(c.req.param("token"));
      if (record === undefined) return c.json({ error: "Share not found" }, 404);
      return c.json({ token: record.token, documentId: record.documentId, document: record.document, revision: record.revision, updatedAt: record.updatedAt });
    })
    .delete("/:token", async (c) => {
      const user = await getAuthenticatedUser(c);
      if (user === null) return c.json({ error: "Unauthorized" }, 401);
      const share = await shares.get(c.req.param("token"));
      if (share === undefined) return c.json({ error: "Share not found" }, 404);
      if (repository !== undefined) {
        const document = await repository.getDocument(share.documentId);
        if (document === undefined) return c.json({ error: "Share not found" }, 404);
        if (document.ownerId !== user.id) return c.json({ error: "Forbidden" }, 403);
      }
      if (!(await shares.revoke(c.req.param("token")))) return c.json({ error: "Share not found" }, 404);
      return c.body(null, 204);
    });
}
