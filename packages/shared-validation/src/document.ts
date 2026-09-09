/**
 * Document/page schemas — the runtime mirror of the `Document` model in
 * `@eraser/editor-core`. Structural only (see `elements.ts` for the rules).
 */
import { z } from "zod";
import { elementSchema } from "./elements.js";

/** Current on-disk schema version. Must match `DOCUMENT_VERSION` in core. */
export const DOCUMENT_SCHEMA_VERSION = 1 as const;

const nonEmptyString = z.string().min(1).max(4096);

export const pageSchema = z.object({
  id: nonEmptyString.max(128),
  name: z.string().max(256),
  elements: z.array(elementSchema).max(100_000),
});

export const documentMetadataSchema = z.object({
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  appVersion: z.string().max(64).optional(),
});

export const assetMetadataSchema = z.object({
  id: nonEmptyString.max(128),
  mimeType: z.string().max(128),
  byteSize: z.number().int().nonnegative().optional(),
  width: z.number().min(1).max(100_000).optional(),
  height: z.number().min(1).max(100_000).optional(),
});

export const documentSchema = z.object({
  id: nonEmptyString.max(128),
  version: z.number().int().min(1),
  name: z.string().max(512),
  pages: z.array(pageSchema).min(1).max(1000),
  activePageId: nonEmptyString.max(128),
  assets: z.record(assetMetadataSchema).default({}),
  metadata: documentMetadataSchema,
});

export type DocumentInput = z.infer<typeof documentSchema>;
export type PageInput = z.infer<typeof pageSchema>;
