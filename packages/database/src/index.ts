/* eslint-disable @typescript-eslint/require-await */
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

export interface DocumentRecord {
  readonly id: string;
  readonly ownerId?: string | null;
  readonly data: unknown;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ShareRecord {
  readonly token: string;
  readonly documentId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revokedAt?: string;
  readonly expiresAt?: string;
}

export interface SaveDocumentInput {
  readonly id: string;
  readonly ownerId?: string | null;
  readonly data: unknown;
  readonly expectedRevision?: number;
  readonly expectedUpdatedAt?: string;
}

export type SaveDocumentResult =
  | { readonly status: "saved"; readonly document: DocumentRecord }
  | { readonly status: "conflict"; readonly document: DocumentRecord };

export interface DocumentRepository {
  healthCheck(): Promise<void>;
  getDocument(id: string): Promise<DocumentRecord | undefined>;
  listDocuments(userId?: string): Promise<DocumentRecord[]>;
  saveDocument(input: SaveDocumentInput): Promise<SaveDocumentResult>;
  deleteDocument(id: string): Promise<boolean>;
  createShare(documentId: string): Promise<ShareRecord>;
  getShare(token: string): Promise<(ShareRecord & { readonly document: DocumentRecord }) | undefined>;
  revokeShare(token: string): Promise<boolean>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function toRecord(row: {
  id: string;
  ownerId?: string | null;
  data: unknown;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}): DocumentRecord {
  return {
    id: row.id,
    ownerId: row.ownerId ?? null,
    data: clone(row.data),
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createMemoryDocumentRepository(): DocumentRepository {
  const documents = new Map<string, DocumentRecord>();
  const shares = new Map<string, ShareRecord>();

  return {
    async healthCheck() {},
    async getDocument(id) {
      const document = documents.get(id);
      return document === undefined ? undefined : clone(document);
    },
    async listDocuments(userId) {
      const items: DocumentRecord[] = [];
      for (const document of documents.values()) {
        if (userId === undefined || document.ownerId === userId) items.push(clone(document));
      }
      return items;
    },
    async saveDocument(input) {
      const current = documents.get(input.id);
      const matches = current === undefined ||
        (input.expectedRevision === undefined || current.revision === input.expectedRevision) &&
        (input.expectedUpdatedAt === undefined || current.updatedAt === input.expectedUpdatedAt);
      if (!matches) {
        return { status: "conflict", document: clone(current) };
      }
      const now = new Date().toISOString();
      const document: DocumentRecord = {
        id: input.id,
        ownerId: input.ownerId ?? current?.ownerId ?? null,
        data: clone(input.data),
        revision: current === undefined ? 1 : current.revision + 1,
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
      };
      documents.set(input.id, document);
      return { status: "saved", document: clone(document) };
    },
    async deleteDocument(id) {
      const deleted = documents.delete(id);
      for (const [token, share] of shares) {
        if (share.documentId === id) shares.delete(token);
      }
      return deleted;
    },
    async createShare(documentId) {
      if (!documents.has(documentId)) throw new Error("Document not found");
      const now = new Date().toISOString();
      const record = { token: randomBytes(32).toString("base64url"), documentId, createdAt: now, updatedAt: now };
      shares.set(record.token, record);
      return clone(record);
    },
    async getShare(token) {
      const share = shares.get(token);
      if (share === undefined) return undefined;
      if (share.revokedAt !== undefined || (share.expiresAt !== undefined && share.expiresAt <= new Date().toISOString())) return undefined;
      const document = documents.get(share.documentId);
      return document === undefined ? undefined : { ...clone(share), document: clone(document) };
    },
    async revokeShare(token) {
      return shares.delete(token);
    },
  };
}

export function createPrismaDocumentRepository(prisma = new PrismaClient()): DocumentRepository {
  return {
    async healthCheck() {
      await prisma.$queryRaw`SELECT 1`;
    },
    async getDocument(id) {
      const row = await prisma.document.findUnique({ where: { id } });
      return row === null ? undefined : toRecord(row);
    },
    async listDocuments(userId) {
      if (userId === undefined) return [];
      const rows = await prisma.document.findMany({ where: { ownerId: userId } });
      return rows.map((row) => toRecord(row));
    },
    async saveDocument(input) {
      const current = await prisma.document.findUnique({ where: { id: input.id } });
      const matches = current === null ||
        (input.expectedRevision === undefined || current.revision === input.expectedRevision) &&
        (input.expectedUpdatedAt === undefined || current.updatedAt.toISOString() === input.expectedUpdatedAt);
      if (!matches) {
        if (current === null) throw new Error("Unexpected conflict state when current document is missing");
        return { status: "conflict", document: toRecord(current) };
      }
      const row = current === null
        ? await prisma.document.create({ data: { id: input.id, ownerId: input.ownerId ?? null, data: input.data as never } as never })
        : await prisma.document.update({
          where: { id: input.id },
          data: {
            ...(input.ownerId === undefined ? {} : { ownerId: input.ownerId }),
            data: input.data as never,
            revision: { increment: 1 },
          } as never,
        });
      return { status: "saved", document: toRecord(row) };
    },
    async deleteDocument(id) {
      try {
        await prisma.document.delete({ where: { id } });
        return true;
      } catch (error) {
        if (error instanceof Error && error.name === "PrismaClientKnownRequestError") return false;
        throw error;
      }
    },
    async createShare(documentId) {
      const row = await prisma.share.create({
        data: { token: randomBytes(32).toString("base64url"), documentId },
      });
      return { token: row.token, documentId: row.documentId, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), ...(row.revokedAt === null ? {} : { revokedAt: row.revokedAt.toISOString() }), ...(row.expiresAt === null ? {} : { expiresAt: row.expiresAt.toISOString() }) };
    },
    async getShare(token) {
      const row = await prisma.share.findUnique({ where: { token }, include: { document: true } });
      if (row === null) return undefined;
      if (row.revokedAt !== null || (row.expiresAt !== null && row.expiresAt <= new Date())) return undefined;
      return {
        token: row.token,
        documentId: row.documentId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        ...(row.expiresAt === null ? {} : { expiresAt: row.expiresAt.toISOString() }),
        document: toRecord(row.document),
      };
    },
    async revokeShare(token) {
      try {
        await prisma.share.update({ where: { token }, data: { revokedAt: new Date() } });
        return true;
      } catch (error) {
        if (error instanceof Error && error.name === "PrismaClientKnownRequestError") return false;
        throw error;
      }
    },
  };
}

export function createDocumentRepository(databaseUrl = process.env.DATABASE_URL): DocumentRepository {
  return databaseUrl === undefined || databaseUrl.trim() === ""
    ? createMemoryDocumentRepository()
    : createPrismaDocumentRepository();
}
