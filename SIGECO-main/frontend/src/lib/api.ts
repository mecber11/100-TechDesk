import { mockApi } from "./mockApi";

// MODO DEMO: se activa con VITE_DEMO_MODE=true en .env.local
// En modo demo todas las llamadas se interceptan localmente (sin backend).
const IS_DEMO = import.meta.env.VITE_DEMO_MODE === "true";

const USER_KEY = "nexus.user";
const TOKEN_KEY = "nexus.token";

export type AuthUser = {
  id: number;
  email: string;
  slack_user_id?: string | null;
  name: string;
  roles?: string[];
  is_manager?: boolean;
  is_lead?: boolean;
  area?: { id: number; code: string; name: string } | null;
  must_change_password?: boolean;
  modules?: { ia: boolean; documentos: boolean; slack: boolean };
};

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(user: AuthUser | null, token?: string | null): void {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (token) localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export type Paged<T> = {
  data: T[];
  total: number;
  current_page: number;
  last_page: number;
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // ── MODO DEMO ─────────────────────────────────────────────────────────────
  if (IS_DEMO) return mockApi<T>(path, init);
  // ─────────────────────────────────────────────────────────────────────────
  const isFormData = init?.body instanceof FormData;
  const token = getStoredToken();
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401 && !path.startsWith("/auth/login")) {
    setSession(null);
    if (window.location.pathname !== "/login") window.location.assign("/login");
    throw new Error("Sesión expirada");
  }
  if (res.status === 428 && window.location.pathname !== "/cambiar-contrasena") {
    window.location.assign("/cambiar-contrasena");
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { message?: string }).message ?? `Error ${res.status}`);
  }
  return json as T;
}

export async function apiList<T>(path: string, q = "", params: Record<string, string | number | undefined> = {}): Promise<Paged<T>> {
  const search = new URLSearchParams({ per_page: "50" });
  if (q) search.set("q", q);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  const json = await api<Record<string, unknown>>(`${path}?${search.toString()}`);
  const data = (json.data as T[]) ?? [];
  const meta = (json.meta as { total?: number; current_page?: number; last_page?: number } | undefined) ?? {};
  return {
    data,
    total: Number(json.total ?? meta.total ?? data.length),
    current_page: Number(json.current_page ?? meta.current_page ?? 1),
    last_page: Number(json.last_page ?? meta.last_page ?? 1),
  };
}

export async function apiDownload(path: string, fallbackFilename?: string): Promise<Blob> {
  let blob: Blob;
  if (IS_DEMO) {
    blob = await mockApi<Blob>(path, { method: "GET", headers: { Accept: "text/csv" } });
  } else {
    const res = await fetch(`/api/v1${path}`, {
      method: "GET",
      credentials: "same-origin",
    });
    if (!res.ok) {
      throw new Error(`Error al descargar archivo (${res.status})`);
    }
    blob = await res.blob();
  }

  if (fallbackFilename && typeof window !== "undefined") {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fallbackFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  return blob;
}
