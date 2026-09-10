import { Hono } from "hono";
import type { ShareService } from "../services/shares.js";

export function createShareRoutes(shares: ShareService) {
  return new Hono()
    .post("/", async (c) => {
      const body = await c.req.json<{
        readonly documentId?: string;
        readonly document?: unknown;
      }>();
      if (
        typeof body.documentId !== "string" ||
        body.documentId.length === 0 ||
        body.document === undefined
      ) {
        return c.json({ error: "documentId and document are required" }, 400);
      }
      const record = shares.create(body.documentId, body.document);
      return c.json({
        token: record.token,
        documentId: record.documentId,
        createdAt: record.createdAt,
      }, 201);
    })
    .get("/:token", (c) => {
      const record = shares.get(c.req.param("token"));
      if (record === undefined) return c.json({ error: "Share not found" }, 404);
      return c.json({ token: record.token, documentId: record.documentId, document: record.document });
    })
    .delete("/:token", (c) => {
      if (!shares.revoke(c.req.param("token"))) return c.json({ error: "Share not found" }, 404);
      return c.body(null, 204);
    });
}
