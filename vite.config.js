import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";

function framingLog() {
  const directory = new URL("../.local/", import.meta.url);
  return { name: "lunar-framing-log", configureServer(server) {
    server.middlewares.use("/__booth/framing", async (request, response) => {
      try {
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");
        if (request.method === "GET") {
          response.end(await readFile(new URL("framing-latest.json", directory), "utf8"));
          return;
        }
        if (request.method !== "POST") { response.statusCode = 405; response.end('{}'); return; }
        let body = "";
        for await (const chunk of request) {
          body += chunk;
          if (body.length > 20000) throw new Error("Framing snapshot too large");
        }
        const snapshot = JSON.parse(body);
        if (![snapshot.camera?.position, snapshot.camera?.target, snapshot.camera?.up]
          .every(v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite)))
          throw new Error("Invalid camera framing");
        snapshot.savedAt = new Date().toISOString();
        await mkdir(directory, { recursive: true });
        await writeFile(new URL("framing-latest.json", directory), JSON.stringify(snapshot, null, 2));
        await appendFile(new URL("framing-history.jsonl", directory), JSON.stringify(snapshot) + "\n");
        if (snapshot.selected) await writeFile(new URL("framing-selected.json", directory), JSON.stringify(snapshot, null, 2));
        response.end('{"saved":true}');
      } catch (error) {
        response.statusCode = error.code === "ENOENT" ? 404 : 400;
        response.end(JSON.stringify({ message: error.message }));
      }
    });
  } };
}

export default defineConfig({
  plugins: [react(), framingLog()],
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
