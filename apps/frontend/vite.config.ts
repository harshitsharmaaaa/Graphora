import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
  // Project convention: `PUBLIC_*` is the documented prefix for browser-safe
  // variables (see .env.example). `VITE_*` is also allowed because it is the
  // Vite default and third-party docs reference it. Anything else (notably
  // `SERVER_*`) is never exposed to client code.
  envPrefix: ["PUBLIC_", "VITE_"],
});
