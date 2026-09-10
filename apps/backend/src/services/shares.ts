import { randomBytes } from "node:crypto";
export interface ShareRecord {
  readonly token: string;
  readonly documentId: string;
  readonly document: unknown;
  readonly createdAt: string;
}

export interface ShareService {
  create(documentId: string, document: unknown): ShareRecord;
  get(token: string): ShareRecord | undefined;
  revoke(token: string): boolean;
}

export function createMemoryShareService(): ShareService {
  const records = new Map<string, ShareRecord>();
  return {
    create(documentId, document) {
      const token = randomBytes(32).toString("base64url");
      const record: ShareRecord = {
        token,
        documentId,
        document: structuredClone(document),
        createdAt: new Date().toISOString(),
      };
      records.set(token, record);
      return record;
    },
    get(token) {
      return records.get(token);
    },
    revoke(token) {
      return records.delete(token);
    },
  };
}
