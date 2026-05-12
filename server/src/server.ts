import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { SERVER_PORT } from "maze-shared";
import { handleConnection } from "./ws/handler.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? SERVER_PORT);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Serve client static files
app.use(express.static(path.join(__dirname, "../../client/dist")));

// Fallback to index.html for SPA
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
});

wss.on("connection", handleConnection);

server.listen(port, () => {
  console.log(`Maze server running on http://localhost:${port}`);
});
