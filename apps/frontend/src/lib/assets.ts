/**
 * In-memory image asset store (blob-backed). The document holds metadata
 * (`assetId`) only; binary pixels live here behind object URLs. A future
 * S3-backed store implements the same `resolve` shape the renderer consumes.
 */
import { createElementId } from "@eraser/editor-elements";

export interface StoredImageInfo {
  readonly assetId: string;
  readonly width: number;
  readonly height: number;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error("Could not decode image file"));
    };
    image.src = url;
  });
}

export class AssetStore {
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly objectUrls: string[] = [];

  /** Register a blob, returning its asset ref (rejects when undecodable). */
  async storeBlob(blob: Blob): Promise<StoredImageInfo> {
    const url = URL.createObjectURL(blob);
    let image: HTMLImageElement;
    try {
      image = await loadImage(url);
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
    const assetId = createElementId();
    this.images.set(assetId, image);
    this.objectUrls.push(url);
    return { assetId, width: image.naturalWidth, height: image.naturalHeight };
  }

  /** Renderer hook: asset id → drawable image (or `undefined`). */
  resolve = (assetId: string): CanvasImageSource | undefined => {
    return this.images.get(assetId);
  };

  dispose(): void {
    for (const url of this.objectUrls) URL.revokeObjectURL(url);
    this.objectUrls.length = 0;
    this.images.clear();
  }
}

/** Native file picker restricted to images (resolves `undefined` on cancel). */
export function pickImageFile(): Promise<Blob | undefined> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(undefined);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    let settled = false;
    const settle = (blob: Blob | undefined): void => {
      if (settled) return;
      settled = true;
      resolve(blob);
    };
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      settle(file ?? undefined);
    });
    input.addEventListener("cancel", () => {
      settle(undefined);
    });
    input.click();
  });
}
