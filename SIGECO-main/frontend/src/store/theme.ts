import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

const savedTheme = localStorage.getItem("nexus.theme") as Theme | null;
const initialTheme: Theme = savedTheme === "light" || savedTheme === "dark"
  ? savedTheme
  : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

document.documentElement.setAttribute("data-theme", initialTheme);

export const useTheme = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  toggle: () => {
    const next = get().theme === "light" ? "dark" : "light";
    document.documentElement.classList.add("theme-switching");
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("nexus.theme", next);
    set({ theme: next });
    window.setTimeout(() => document.documentElement.classList.remove("theme-switching"), 400);
  },
}));
