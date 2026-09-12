const API_BASE_URL =
  (import.meta.env as unknown as { readonly VITE_API_URL?: string }).VITE_API_URL ??
  "http://localhost:3001";

export interface AuthUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly image?: string | null;
}

interface AuthSessionResponse {
  readonly session: { readonly userId: string } | null;
  readonly user: AuthUser | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => undefined);
    const error =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : undefined;
    throw new Error(error ?? `Auth request failed: ${String(response.status)}`);
  }

  return (await response.json()) as T;
}

export const authClient = {
  async signUp(input: { name: string; email: string; password: string }) {
    return request<{ user: AuthUser }>("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  async signIn(input: { email: string; password: string }) {
    return request<{ user: AuthUser }>("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  async signOut() {
    return request<{ success: boolean }>("/api/auth/sign-out", {
      method: "POST",
    });
  },
  async getSession(): Promise<AuthSessionResponse> {
    return request<AuthSessionResponse>("/api/auth/get-session", {
      method: "GET",
    });
  },
};

export type AuthClient = typeof authClient;
