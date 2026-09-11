const API_BASE_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ?? "http://localhost:3001";

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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new Error((payload as { error?: string } | undefined)?.error ?? `Auth request failed: ${response.status}`);
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
