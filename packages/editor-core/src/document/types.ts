/**
 * Persisted document model. Plain data only — no class instances, no Maps,
 * no functions — so `JSON.stringify` round-trips losslessly.
 */
import type { Element } from "@eraser/editor-elements";

export interface Page {
  readonly id: string;
  readonly name: string;
  readonly elements: Element[];
}

export interface AssetMetadata {
  readonly id: string;
  readonly mimeType: string;
  readonly byteSize?: number | undefined;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
}

export interface DocumentMetadata {
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly appVersion?: string | undefined;
}

export interface Document {
  readonly id: string;
  /** On-disk schema version (see `DOCUMENT_VERSION`). */
  readonly version: number;
  readonly name: string;
  readonly pages: Page[];
  readonly activePageId: string;
  /** Asset metadata by id (binary blobs live in the asset store, not here). */
  readonly assets: Record<string, AssetMetadata>;
  readonly metadata: DocumentMetadata;
}
