import { parseDocument } from "@eraser/editor-core";
import type { Document } from "@eraser/editor-core";
import * as Y from "yjs";

const ROOT_KEY = "graphora";

function mapFor(value: unknown): Y.Map<unknown> {
  if (!(value instanceof Y.Map)) throw new Error("Invalid Graphora Y.Doc map");
  return value;
}

function arrayFor(value: unknown): Y.Array<unknown> {
  if (!(value instanceof Y.Array)) throw new Error("Invalid Graphora Y.Doc array");
  return value;
}

function stringFor(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`Invalid Graphora field: ${field}`);
  return value;
}

function numberFor(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid Graphora field: ${field}`);
  }
  return value;
}

function writeMetadata(metadata: Document["metadata"]): Y.Map<unknown> {
  const result = new Y.Map<unknown>();
  result.set("createdAt", metadata.createdAt);
  result.set("updatedAt", metadata.updatedAt);
  if (metadata.appVersion !== undefined) result.set("appVersion", metadata.appVersion);
  return result;
}

function writePage(page: Document["pages"][number]): Y.Map<unknown> {
  const result = new Y.Map<unknown>();
  result.set("id", page.id);
  result.set("name", page.name);
  const elements = new Y.Array<unknown>();
  elements.push(page.elements.map((element) => structuredClone(element)));
  result.set("elements", elements);
  return result;
}

function writeAsset(asset: Document["assets"][string]): Y.Map<unknown> {
  const result = new Y.Map<unknown>();
  result.set("id", asset.id);
  result.set("mimeType", asset.mimeType);
  if (asset.byteSize !== undefined) result.set("byteSize", asset.byteSize);
  if (asset.width !== undefined) result.set("width", asset.width);
  if (asset.height !== undefined) result.set("height", asset.height);
  return result;
}

/** Replace the canonical Graphora root in a Y.Doc without touching camera/editor state. */
export function documentToYDoc(document: Document, yDoc: Y.Doc = new Y.Doc()): Y.Doc {
  const root = yDoc.getMap<unknown>(ROOT_KEY);
  yDoc.transact(() => {
    root.clear();
    root.set("id", document.id);
    root.set("version", document.version);
    root.set("name", document.name);
    root.set("activePageId", document.activePageId);

    const pages = new Y.Array<unknown>();
    pages.push(document.pages.map(writePage));
    root.set("pages", pages);

    const assets = new Y.Map<unknown>();
    for (const id of Object.keys(document.assets).sort()) {
      const asset = document.assets[id];
      if (asset !== undefined) assets.set(id, writeAsset(asset));
    }
    root.set("assets", assets);
    root.set("metadata", writeMetadata(document.metadata));
  });
  return yDoc;
}

function readPage(value: unknown): unknown {
  const page = mapFor(value);
  const elements = arrayFor(page.get("elements")).toArray().map((element) => structuredClone(element));
  return {
    id: stringFor(page.get("id"), "page.id"),
    name: stringFor(page.get("name"), "page.name"),
    elements,
  };
}

function readAsset(value: unknown): unknown {
  const asset = mapFor(value);
  return {
    id: stringFor(asset.get("id"), "asset.id"),
    mimeType: stringFor(asset.get("mimeType"), "asset.mimeType"),
    ...(asset.get("byteSize") === undefined ? {} : { byteSize: numberFor(asset.get("byteSize"), "asset.byteSize") }),
    ...(asset.get("width") === undefined ? {} : { width: numberFor(asset.get("width"), "asset.width") }),
    ...(asset.get("height") === undefined ? {} : { height: numberFor(asset.get("height"), "asset.height") }),
  };
}

/** Convert the canonical Y.Doc root back through the shared document validator. */
export function yDocToDocument(yDoc: Y.Doc): Document {
  const root = mapFor(yDoc.getMap<unknown>(ROOT_KEY));
  const pages = arrayFor(root.get("pages")).toArray().map(readPage);
  const assetsMap = mapFor(root.get("assets"));
  const assets: Record<string, unknown> = {};
  for (const id of [...assetsMap.keys()].sort()) {
    const asset = assetsMap.get(id);
    if (asset !== undefined) assets[id] = readAsset(asset);
  }
  const metadata = mapFor(root.get("metadata"));
  return parseDocument({
    id: stringFor(root.get("id"), "id"),
    version: numberFor(root.get("version"), "version"),
    name: stringFor(root.get("name"), "name"),
    activePageId: stringFor(root.get("activePageId"), "activePageId"),
    pages,
    assets,
    metadata: {
      createdAt: numberFor(metadata.get("createdAt"), "metadata.createdAt"),
      updatedAt: numberFor(metadata.get("updatedAt"), "metadata.updatedAt"),
      ...(metadata.get("appVersion") === undefined ? {} : { appVersion: stringFor(metadata.get("appVersion"), "metadata.appVersion") }),
    },
  });
}

export function encodeYDoc(yDoc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(yDoc);
}

export function applyYDocUpdate(yDoc: Y.Doc, update: Uint8Array, origin?: unknown): void {
  Y.applyUpdate(yDoc, update, origin);
}
