import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  test: {
    include: ["main/**/*.test.ts", "renderer/**/*.test.ts"],
    environmentMatchGlobs: [["renderer/**/*.test.ts", "jsdom"]],
    setupFiles: ["./renderer/test/setup.ts"],
  },
});
