export type DocumentPermissionRole = "owner" | "editor" | "viewer";

export interface DocumentAccess {
  readonly ownerId?: string | null;
  readonly members?: ReadonlyArray<{ readonly userId: string; readonly role: DocumentPermissionRole }>;
}

export class AuthorizationService {
  canView(document: DocumentAccess, userId?: string | null): boolean {
    if (userId === undefined || userId === null) return false;
    if (document.ownerId === userId) return true;
    return document.members?.some((member) => member.userId === userId && (member.role === "viewer" || member.role === "editor" || member.role === "owner")) ?? false;
  }

  canEdit(document: DocumentAccess, userId?: string | null): boolean {
    if (userId === undefined || userId === null) return false;
    if (document.ownerId === userId) return true;
    return document.members?.some((member) => member.userId === userId && (member.role === "editor" || member.role === "owner")) ?? false;
  }

  canDelete(document: DocumentAccess, userId?: string | null): boolean {
    return document.ownerId === userId;
  }

  canShare(document: DocumentAccess, userId?: string | null): boolean {
    return document.ownerId === userId;
  }

  canManagePermissions(document: DocumentAccess, userId?: string | null): boolean {
    return document.ownerId === userId;
  }
}

export const authorizationService = new AuthorizationService();
