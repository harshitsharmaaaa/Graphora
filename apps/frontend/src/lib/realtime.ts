import { RealtimeCollaborationClient } from "@eraser/realtime";
import { env } from "./env.js";

/**
 * Collaboration is intentionally an opt-in adapter. The existing Editor
 * remains the source of truth; callers may subscribe and dispatch through
 * editor commands rather than replacing editor state behind its back.
 */
export function createCollaborationClient(documentId: string, clientId: string): RealtimeCollaborationClient {
  return new RealtimeCollaborationClient({
    url: env.realtimeUrl,
    documentId,
    clientId,
  });
}
