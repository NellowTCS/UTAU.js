import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";
import { execSync } from "child_process";

const buildHash = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();

export default defineConfig(() => {
  const isSingleFile = process.env.SINGLE_FILE === "true";

  return {
    base: "./",
    plugins: [svelte(), ...(isSingleFile ? [viteSingleFile()] : [])],
    define: {
      __BUILD_HASH__: JSON.stringify(buildHash),
    },
    server: { port: 5173, open: true },
    build: {
      chunkSizeWarningLimit: isSingleFile ? 3000 : 13000,
    },
  };
});
