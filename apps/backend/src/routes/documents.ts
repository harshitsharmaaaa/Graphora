import { Hono } from "hono";
import { DOCUMENT_MAX_BYTES, validateDocumentPayload } from "@eraser/shared-validation";
import type { DocumentRepository } from "@eraser/database";
import { auth } from "../lib/auth.js";

function requestSize(c: { req: { header(name: string): string | undefined } }): boolean {
  const contentLength = Number(c.req.header("content-length") ?? 0);
  return contentLength > DOCUMENT_MAX_BYTES + 16_384;
}

async function getAuthenticatedUser(c: { req: { raw: Request } }) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers, asResponse: false });
  return session?.user ?? null;
}

export function createDocumentRoutes(repository: DocumentRepository) {
  return new Hono()
    .get("/", async (c) => {
      const user = await getAuthenticatedUser(c);
      if (user === null) return c.json({ error: "Unauthorized" }, 401);
      const documents = await repository.listDocuments(user.id);
      return c.json({ documents });
    })
    .post("/", async (c) => {
      const user = await getAuthenticatedUser(c);
      if (user === null) return c.json({ error: "Unauthorized" }, 401);
      if (requestSize(c)) return c.json({ error: "Document is too large" }, 413);
      let body: { readonly document?: unknown };
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: "Invalid JSON body" }, 400);
      }
      const document = body.document;
      const parsed = validateDocumentPayload(document);
      if (!parsed.success) return c.json({ error: parsed.error === "too_large" ? "Document is too large" : "Invalid document" }, parsed.error === "too_large" ? 413 : 400);
      const id = parsed.data.id;
      const saved = await repository.saveDocument({ id, ownerId: user.id, data: parsed.data });
      return c.json({ document: saved.document.data, revision: saved.document.revision, updatedAt: saved.document.updatedAt }, saved.status === "saved" ? 201 : 409);
    })
    .get("/:id", async (c) => {
      const user = await getAuthenticatedUser(c);
      const document = await repository.getDocument(c.req.param("id"));
      if (document === undefined) return c.json({ error: "Document not found" }, 404);
      if (user === null) return c.json({ error: "Unauthorized" }, 401);
      if (document.ownerId !== user.id) return c.json({ error: "Forbidden" }, 403);
      return c.json({ document: document.data, revision: document.revision, updatedAt: document.updatedAt });
    })
    .put("/:id", async (c) => {
      const user = await getAuthenticatedUser(c);
      if (user === null) return c.json({ error: "Unauthorized" }, 401);
      if (requestSize(c)) return c.json({ error: "Document is too large" }, 413);
      const current = await repository.getDocument(c.req.param("id"));
      if (current === undefined) return c.json({ error: "Document not found" }, 404);
      if (current.ownerId !== user.id) return c.json({ error: "Forbidden" }, 403);
      let body: { readonly document?: unknown; readonly revision?: number; readonly updatedAt?: string };
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: "Invalid JSON body" }, 400);
      }
      const parsed = validateDocumentPayload(body.document);
      if (!parsed.success) return c.json({ error: parsed.error === "too_large" ? "Document is too large" : "Invalid document" }, parsed.error === "too_large" ? 413 : 400);
      if (parsed.data.id !== c.req.param("id")) return c.json({ error: "Document id does not match route" }, 400);
      const saveInput = {
        id: parsed.data.id,
        ownerId: user.id,
        data: parsed.data,
        ...(body.revision === undefined ? {} : { expectedRevision: body.revision }),
        ...(body.updatedAt === undefined ? {} : { expectedUpdatedAt: body.updatedAt }),
      };
      const saved = await repository.saveDocument(saveInput);
      if (saved.status === "conflict") {
        return c.json({ error: "Document was updated by another client", document: saved.document.data, revision: saved.document.revision, updatedAt: saved.document.updatedAt }, 409);
      }
      return c.json({ document: saved.document.data, revision: saved.document.revision, updatedAt: saved.document.updatedAt });
    })
    .delete("/:id", async (c) => {
      const user = await getAuthenticatedUser(c);
      if (user === null) return c.json({ error: "Unauthorized" }, 401);
      const current = await repository.getDocument(c.req.param("id"));
      if (current === undefined) return c.json({ error: "Document not found" }, 404);
      if (current.ownerId !== user.id) return c.json({ error: "Forbidden" }, 403);
      if (!(await repository.deleteDocument(c.req.param("id")))) return c.json({ error: "Document not found" }, 404);
      return c.body(null, 204);
    });
}
