import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    port: 8080,
    strictPort: true,
    watch: { usePolling: true, interval: 300 },
  },
  preview: {
    port: 8080,
    strictPort: true,
  },
});
