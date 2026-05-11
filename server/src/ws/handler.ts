import type { WebSocket } from "ws";
import type {
  ClientMessage,
  ServerMessage,
} from "maze-shared";
import { MOVE_INTERVAL_MS, NPC_SPEED_MULTIPLIER, NPC_DEBUFF_DURATION_MS, NPC_COUNT_PER_PLAYER } from "maze-shared";
import {
  getState,
  addPlayer,
  removePlayer,
  getPlayer,
  isLastPlayer,
  startGame,
  endGame,
  returnToLobby,
} from "../game/state.js";
import { movePlayer } from "../game/movement.js";
import { revealAround } from "../game/visibility.js";
import { checkObjective } from "../game/objective.js";
import { resetStats, initPlayerStats, recordStep, getStats } from "../game/stats.js";
import { getNpcs, resetNpcs, ensureNpcCount, moveNpcsRandom, checkNpcPlayerCollisions, removeNpc } from "../game/npc.js";
import { resetDebuffs, applyDebuff, canMove } from "../game/debuff.js";

type ClientSocket = WebSocket & { playerId?: string };

const clients = new Set<ClientSocket>();

const send = (ws: ClientSocket, msg: ServerMessage): void => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
};

const broadcast = (msg: ServerMessage): void => {
  const data = JSON.stringify(msg);
  clients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  });
};

const broadcastLobbyUpdate = (): void => {
  const state = getState();
  broadcast({
    type: "lobby-update",
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
    })),
  });
};

const broadcastStateUpdate = (): void => {
  const state = getState();
  broadcast({
    type: "state-update",
    players: state.players,
    revealedTiles: state.revealedTiles,
    npcs: getNpcs(),
  });
};

let nextId = 1;
let npcTickInterval: ReturnType<typeof setInterval> | null = null;

const stopNpcTick = (): void => {
  if (npcTickInterval) {
    clearInterval(npcTickInterval);
    npcTickInterval = null;
  }
};

const startNpcTick = (): void => {
  stopNpcTick();
  const tickMs = MOVE_INTERVAL_MS * NPC_SPEED_MULTIPLIER;
  npcTickInterval = setInterval(() => {
    const state = getState();
    if (state.status !== "playing") {
      stopNpcTick();
      return;
    }

    moveNpcsRandom(state.maze, state.players);

    // Check collisions
    const collisions = checkNpcPlayerCollisions(state.players);
    for (const { npcId, playerId } of collisions) {
      removeNpc(npcId);
      applyDebuff(playerId);
      const hitPlayer = state.players.find((p) => p.id === playerId);
      broadcast({ type: "debuff-applied", playerId, playerName: hitPlayer?.name ?? "Unknown", durationMs: NPC_DEBUFF_DURATION_MS });
    }

    // Respawn to maintain count
    ensureNpcCount(state.players.length * NPC_COUNT_PER_PLAYER, state.maze, state.players);

    broadcastStateUpdate();
  }, tickMs);
};

const handleJoin = (ws: ClientSocket, name: string): void => {
  // If already joined, update name instead of creating new player
  if (ws.playerId) {
    const existing = getPlayer(ws.playerId);
    if (existing) {
      existing.name = name;
      broadcastLobbyUpdate();
      return;
    }
  }

  const id = `player-${nextId++}`;
  addPlayer(id, name);
  ws.playerId = id;

  send(ws, { type: "player-id", id });
  broadcastLobbyUpdate();
};

const handleStart = (mapSize?: number): void => {
  const state = getState();
  if (state.status !== "lobby" || state.players.length === 0) return;

  startGame(mapSize);
  resetStats();
  resetNpcs();
  resetDebuffs();

  // Init stats and reveal initial area around each player
  state.players.forEach((p) => {
    initPlayerStats(p.id, p.position, state.goalPosition!);
    revealAround(p.position, state.revealedTiles);
  });

  // Spawn NPCs equal to player count
  ensureNpcCount(state.players.length * NPC_COUNT_PER_PLAYER, state.maze, state.players);

  broadcast({
    type: "game-start",
    maze: state.maze,
    players: state.players,
    revealedTiles: state.revealedTiles,
    npcs: getNpcs(),
  });

  startNpcTick();
};

const handleMove = (ws: ClientSocket, direction: ClientMessage & { type: "move" }): void => {
  const state = getState();
  if (state.status !== "playing" || !ws.playerId) return;

  const player = getPlayer(ws.playerId);
  if (!player) return;

  // Rate-limit moves (debuffed players move at half speed)
  if (!canMove(ws.playerId)) return;

  const newPos = movePlayer(player.position, direction.direction, state.maze);
  if (newPos.x === player.position.x && newPos.y === player.position.y) return;

  player.position = newPos;
  revealAround(newPos, state.revealedTiles);
  recordStep(player.id, newPos, state.goalPosition!);

  // Check NPC collisions after player move
  const collisions = checkNpcPlayerCollisions(state.players);
  for (const { npcId, playerId } of collisions) {
    removeNpc(npcId);
    applyDebuff(playerId);
    const hitPlayer = state.players.find((p) => p.id === playerId);
    broadcast({ type: "debuff-applied", playerId, playerName: hitPlayer?.name ?? "Unknown", durationMs: NPC_DEBUFF_DURATION_MS });
  }
  ensureNpcCount(state.players.length * NPC_COUNT_PER_PLAYER, state.maze, state.players);

  if (checkObjective(player, state.maze)) {
    stopNpcTick();
    endGame(player);
    broadcast({
      type: "game-over",
      winner: { id: player.id, name: player.name, color: player.color },
      players: state.players,
      revealedTiles: state.revealedTiles,
      maze: state.maze,
      playerStats: getStats(),
    });
    return;
  }

  broadcastStateUpdate();
};

const handleReturnToLobby = (): void => {
  stopNpcTick();
  resetNpcs();
  resetDebuffs();
  returnToLobby();
  broadcast({ type: "lobby-return" });
  broadcastLobbyUpdate();
};

const handleDisconnect = (ws: ClientSocket): void => {
  clients.delete(ws);
  if (!ws.playerId) return;

  removePlayer(ws.playerId);
  const state = getState();

  if (state.status === "playing" && isLastPlayer()) {
    stopNpcTick();
    resetNpcs();
    resetDebuffs();
    returnToLobby();
    return;
  }

  if (state.status === "lobby") {
    broadcastLobbyUpdate();
  } else if (state.status === "playing") {
    broadcastStateUpdate();
  }
};

export const handleConnection = (ws: ClientSocket): void => {
  clients.add(ws);

  ws.on("message", (data) => {
    try {
      const msg: ClientMessage = JSON.parse(data.toString());

      switch (msg.type) {
        case "join":
          handleJoin(ws, msg.name);
          break;
        case "start":
          handleStart(msg.mapSize);
          break;
        case "move":
          handleMove(ws, msg);
          break;
        case "return-to-lobby":
          handleReturnToLobby();
          break;
      }
    } catch {
      // Ignore malformed messages
    }
  });

  ws.on("close", () => handleDisconnect(ws));
};

// For testing
export const resetHandler = (): void => {
  stopNpcTick();
  resetNpcs();
  resetDebuffs();
  clients.clear();
  nextId = 1;
};

export { clients, broadcast, send };
