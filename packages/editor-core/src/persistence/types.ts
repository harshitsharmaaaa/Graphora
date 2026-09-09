/**
 * Storage contract. Implementations (`MemoryPersistence`,
 * `IndexedDBPersistence`) live in the frontend — core must never touch
 * browser APIs. Documents cross the boundary serialized (see
 * `document/serialization.ts`); the store is a dumb string bucket.
 */
import type { Document } from "../document/types.js";

export interface DocumentPersistence {
  save(document: Document): Promise<void>;
  load(documentId: string): Promise<Document | null>;
  delete(documentId: string): Promise<void>;
}
