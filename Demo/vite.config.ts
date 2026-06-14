import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { execSync } from "child_process";

const buildHash = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();

export default defineConfig({
  base: "./",
  plugins: [svelte()],
  define: {
    __BUILD_HASH__: JSON.stringify(buildHash),
  },
  server: { port: 5173, open: true },
});
