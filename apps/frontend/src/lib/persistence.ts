/**
 * Document storage implementations for the `DocumentPersistence` contract.
 * Documents cross the boundary serialized; corrupt payloads never throw —
 * `load` returns `null` (IndexedDB additionally quarantines the bad row so
 * no data is silently lost).
 */
import { parseDocument, serializeDocument } from "@eraser/editor-core";
import type { Document, DocumentPersistence } from "@eraser/editor-core";

export class MemoryPersistence implements DocumentPersistence {
  private readonly rows = new Map<string, string>();

  save(document: Document): Promise<void> {
    this.rows.set(document.id, serializeDocument(document));
    return Promise.resolve();
  }

  load(documentId: string): Promise<Document | null> {
    const raw = this.rows.get(documentId);
    if (raw === undefined) return Promise.resolve(null);
    try {
      return Promise.resolve(parseDocument(raw));
    } catch {
      return Promise.resolve(null);
    }
  }

  delete(documentId: string): Promise<void> {
    this.rows.delete(documentId);
    return Promise.resolve();
  }
}

const DB_NAME = "graphora";
const STORE_NAME = "documents";

interface StoredRow {
  readonly id: string;
  readonly json: string;
  readonly updatedAt: number;
}

function openDatabase(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB open failed"));
    };
  });
}

function runTransaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  task: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let value: T | undefined;
    let done = false;
    const request = task(store);
    request.onsuccess = () => {
      value = request.result as T;
      done = true;
    };
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB request failed"));
    };
    transaction.oncomplete = () => {
      if (done) resolve(value as T);
      else reject(new Error("IndexedDB transaction ended without a result"));
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    };
  });
}

export class IndexedDBPersistence implements DocumentPersistence {
  private readonly dbName: string;
  private database: IDBDatabase | undefined;

  constructor(dbName: string = DB_NAME) {
    this.dbName = dbName;
  }

  async save(document: Document): Promise<void> {
    const db = await this.databaseHandle();
    const row: StoredRow = {
      id: document.id,
      json: serializeDocument(document),
      updatedAt: Date.now(),
    };
    await runTransaction(db, "readwrite", (store) => store.put(row));
  }

  async load(documentId: string): Promise<Document | null> {
    const db = await this.databaseHandle();
    const row = await runTransaction<StoredRow | undefined>(db, "readonly", (store) =>
      store.get(documentId),
    );
    if (row === undefined) return null;
    try {
      return parseDocument(row.json);
    } catch {
      // Quarantine the corrupt row instead of dropping user data.
      const backup: StoredRow = {
        id: `${documentId}.corrupt-${String(Date.now())}`,
        json: row.json,
        updatedAt: Date.now(),
      };
      await runTransaction(db, "readwrite", (store) => store.put(backup));
      return null;
    }
  }

  async delete(documentId: string): Promise<void> {
    const db = await this.databaseHandle();
    await runTransaction(db, "readwrite", (store) => store.delete(documentId));
  }

  private async databaseHandle(): Promise<IDBDatabase> {
    this.database ??= await openDatabase(this.dbName);
    return this.database;
  }
}
