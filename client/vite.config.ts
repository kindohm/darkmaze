import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
  },
  server: {
    proxy: {
      // Proxy WebSocket connections to the game server
      "/": {
        target: "ws://localhost:3000",
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      "maze-shared": path.resolve(__dirname, "../shared/src"),
    },
  },
});
