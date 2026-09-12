/**
 * Serialization, migration, and boundary validation.
 *
 * - `serializeDocument` is total (the in-memory model is always serializable).
 * - `parseDocument` never lets corrupt input crash the editor: it migrates,
 *   validates via `@eraser/shared-validation`, and throws a structured
 *   `DocumentParseError` the caller can recover from (e.g. seed a fresh doc).
 * - `migrateDocument` is the explicit upgrade path — add a step per version.
 */
import { DOCUMENT_SCHEMA_VERSION, documentSchema } from "@eraser/shared-validation";
import type { Document } from "./types.js";

/** Current on-disk schema version. Must equal `DOCUMENT_SCHEMA_VERSION`. */
export const DOCUMENT_VERSION = 1;

export class DocumentParseError extends Error {
  readonly issues: unknown;
  constructor(message: string, issues?: unknown) {
    super(message);
    this.name = "DocumentParseError";
    this.issues = issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Upgrade raw persisted data toward the current schema. Pure and total for
 * plain-JSON input; unknown shapes pass through untouched so validation can
 * reject them with a precise error.
 */
export function migrateDocument(data: unknown): unknown {
  if (!isRecord(data)) return data;
  const versionRaw = data.version;
  const version = typeof versionRaw === "number" ? versionRaw : 1;
  if (!Number.isInteger(version) || version < 1) return data;
  if (version > DOCUMENT_VERSION) {
    throw new DocumentParseError(
      `Unsupported document version ${String(version)} (max ${String(DOCUMENT_VERSION)})`,
    );
  }
  // v1 is the only schema today: fill structural defaults so older payloads
  // missing newer optional sections still validate.
  const migrated: Record<string, unknown> = { ...data, version };
  if (migrated.assets === undefined) migrated.assets = {};
  const pages = migrated.pages;
  if (Array.isArray(pages)) {
    migrated.pages = pages.map((page: unknown) => {
      if (!isRecord(page) || !Array.isArray(page.elements)) return page;
      return {
        ...page,
        elements: page.elements.map((element: unknown) => {
          if (!isRecord(element) || element.fillStyle !== undefined) return element;
          return {
            ...element,
            fillStyle: element.backgroundColor === "transparent" ? "none" : "solid",
          };
        }),
      };
    });
  }
  return migrated;
}

/** Serialize to a JSON string (throws only on programmer error). */
export function serializeDocument(document: Document): string {
  return JSON.stringify({ ...document, version: DOCUMENT_VERSION });
}

/**
 * Parse + migrate + validate unknown input into a `Document`.
 * Repairs a stale `activePageId` by falling back to the first page.
 * @throws {DocumentParseError} when the payload is unusable.
 */
export function parseDocument(data: unknown): Document {
  let migrated: unknown;
  try {
    migrated = migrateDocument(data);
  } catch (error) {
    if (error instanceof DocumentParseError) throw error;
    throw new DocumentParseError("Migration failed", error);
  }
  if (typeof migrated === "string") {
    try {
      migrated = JSON.parse(migrated) as unknown;
    } catch {
      throw new DocumentParseError("Document is not valid JSON");
    }
  }
  const result = documentSchema.safeParse(migrated);
  if (!result.success) {
    throw new DocumentParseError("Document failed validation", result.error.issues);
  }
  const document: Document = result.data;
  const activeExists = document.pages.some((page) => page.id === document.activePageId);
  if (activeExists) return document;
  const first = document.pages[0];
  if (first === undefined) throw new DocumentParseError("Document has no pages");
  return { ...document, activePageId: first.id };
}

/** Compile-time assertion that both version constants agree. */
export const _assertVersionParity: typeof DOCUMENT_VERSION = DOCUMENT_SCHEMA_VERSION;
