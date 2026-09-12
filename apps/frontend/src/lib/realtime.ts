import { CollaborativeEditorAdapter, RealtimeCollaborationClient } from "@eraser/realtime";
import { env } from "./env.js";

export { CollaborativeEditorAdapter };

/**
 * Collaboration is intentionally an opt-in adapter. The existing Editor
 * remains the source of truth; callers may subscribe and dispatch through
 * editor commands rather than replacing editor state behind its back.
 */
export function createCollaborationClient(
  documentId: string,
  clientId: string,
  persistence = false,
): RealtimeCollaborationClient {
  return new RealtimeCollaborationClient({
    url: env.realtimeUrl,
    documentId,
    clientId,
    persistence,
  });
}
