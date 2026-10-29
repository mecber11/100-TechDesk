import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isDemo = env.VITE_DEMO_MODE === "true";

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("recharts")) return "charts";
            if (id.includes("framer-motion")) return "motion";
            if (id.includes("react") || id.includes("@tanstack")) return "react-vendor";
            if (id.includes("lucide-react")) return "icons";
          },
        },
      },
    },
    server: {
      port: 5173,
      // En modo demo no hay proxy — todas las llamadas las intercepta mockApi.ts
      ...(isDemo ? {} : {
        proxy: { "/api": { target: "http://127.0.0.1:8000", changeOrigin: true } },
      }),
    },
  };
});
