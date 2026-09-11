import { createMemoryDocumentRepository } from "@eraser/database";
import type { DocumentRepository } from "@eraser/database";

export interface ShareRecord {
  readonly token: string;
  readonly documentId: string;
  readonly document: unknown;
  readonly createdAt: string;
  readonly revision: number;
  readonly updatedAt: string;
}

export interface ShareService {
  create(documentId: string, document: unknown): Promise<ShareRecord>;
  get(token: string): Promise<ShareRecord | undefined>;
  revoke(token: string): Promise<boolean>;
}

export function createShareService(repository: DocumentRepository): ShareService {
  return {
    async create(documentId, document) {
      const saved = await repository.saveDocument({ id: documentId, data: document });
      const share = await repository.createShare(documentId);
      return {
        token: share.token,
        documentId,
        document: saved.document.data,
        createdAt: share.createdAt,
        revision: saved.document.revision,
        updatedAt: saved.document.updatedAt,
      };
    },
    async get(token) {
      const result = await repository.getShare(token);
      if (result === undefined) return undefined;
      return {
        token: result.token,
        documentId: result.documentId,
        document: result.document.data,
        createdAt: result.createdAt,
        revision: result.document.revision,
        updatedAt: result.document.updatedAt,
      };
    },
    revoke(token) {
      return repository.revokeShare(token);
    },
  };
}

export function createMemoryShareService(): ShareService {
  return createShareService(createMemoryDocumentRepository());
}
