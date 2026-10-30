import { create } from "zustand";
import { api, getStoredUser, setSession, type AuthUser } from "../lib/api";
import { queryClient } from "../lib/queryClient";


type AuthState = {
  user: AuthUser | null;
  initialized: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, area: string, slackUserId: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  user: getStoredUser(),
  initialized: false,
  hydrate: async () => {
    try {
      const user = await api<AuthUser>("/auth/me");
      setSession(user);
      set({ user });
    } catch {
      setSession(null);
      queryClient.clear();
      set({ user: null });
    } finally {
      set({ initialized: true });
    }
  },
  login: async (email, password) => {
    const res = await api<{ user: AuthUser; token?: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    queryClient.clear();
    setSession(res.user, res.token);
    set({ user: res.user, initialized: true });
  },
  register: async (name, email, password, area, slackUserId) => {
    await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, area, slack_user_id: slackUserId }),
    });
  },
  logout: async () => {
    try {
      if (get().user) await api("/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setSession(null);
    queryClient.clear();
    set({ user: null, initialized: true });
  },
}));
