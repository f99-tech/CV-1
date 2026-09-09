import { copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = dirname(fileURLToPath(import.meta.url));

function pagesFallback(): Plugin {
  return {
    name: "pages-fallback",
    closeBundle() {
      const index = resolve(root, "docs/index.html");
      copyFileSync(index, resolve(root, "docs/404.html"));
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [tailwindcss(), viteReact(), pagesFallback()],
  resolve: {
    alias: { "@": resolve(root, "src") },
  },
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
});
