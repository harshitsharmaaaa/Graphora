import { describe, expect, it } from "vitest";
import { createMemoryDocumentRepository } from "./index.js";

describe("memory document repository", () => {
  it("stores revisions and rejects stale writes", async () => {
    const repository = createMemoryDocumentRepository();
    const first = await repository.saveDocument({ id: "doc-1", data: { value: 1 } });
    expect(first.status).toBe("saved");
    if (first.status !== "saved") return;

    const conflict = await repository.saveDocument({
      id: "doc-1",
      data: { value: 2 },
      expectedRevision: 0,
    });
    expect(conflict.status).toBe("conflict");
    const saved = await repository.saveDocument({
      id: "doc-1",
      data: { value: 2 },
      expectedRevision: first.document.revision,
      expectedUpdatedAt: first.document.updatedAt,
    });
    expect(saved.status).toBe("saved");
    if (saved.status === "saved") expect(saved.document.revision).toBe(2);
  });

  it("tracks ownership while listing documents for an authenticated user", async () => {
    const repository = createMemoryDocumentRepository();
    await repository.saveDocument({ id: "owned-1", ownerId: "user-a", data: { value: 1 } });
    await repository.saveDocument({ id: "owned-2", ownerId: "user-b", data: { value: 2 } });

    const userA = await repository.listDocuments("user-a");
    const userB = await repository.listDocuments("user-b");

    expect(userA.map((doc) => doc.id)).toEqual(["owned-1"]);
    expect(userB.map((doc) => doc.id)).toEqual(["owned-2"]);
  });
});
