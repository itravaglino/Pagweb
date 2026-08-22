import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: dir,
  base: "./",
  resolve: {
    alias: {
      "@shared": path.resolve(dir, "../shared"),
    },
  },
  build: {
    outDir: path.resolve(dir, "../dist"),
    emptyOutDir: true,
  },
  server: {
    host: true,
  },
});
