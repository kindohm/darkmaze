import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "maze-shared": path.resolve(__dirname, "../shared/src"),
    },
  },
});
