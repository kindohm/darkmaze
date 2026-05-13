import type { WebSocket } from "ws";
import type { ClientMessage, ServerMessage } from "maze-shared";
import { MOVE_INTERVAL_MS, NPC_SPEED_MULTIPLIER, NPC_DEBUFF_DURATION_MS, NPC_COUNT_PER_PLAYER } from "maze-shared";
import {
  createRoom,
  getRoom,
  getRoomSummaries,
  getRoomSummary,
  joinRoom,
  removePlayerFromRoom,
  updatePlayerName,
  startGame,
  endGame,
  returnToLobby,
  type ServerRoom,
} from "../game/state.js";
import { movePlayer } from "../game/movement.js";
import { revealAround } from "../game/visibility.js";
import { checkObjective } from "../game/objective.js";
import { resetStats, initPlayerStats, recordStep, getStats } from "../game/stats.js";
import { getNpcs, resetNpcs, ensureNpcCount, moveNpcsRandom, checkNpcPlayerCollisions, removeNpc } from "../game/npc.js";
import { resetDebuffs, applyDebuff, canMove } from "../game/debuff.js";

type ClientSocket = WebSocket & {
  playerId?: string;
  username?: string;
  roomId?: string;
};

const clients = new Set<ClientSocket>();
const npcTickIntervals = new Map<string, ReturnType<typeof setInterval>>();

let nextId = 1;
let nextRoomId = 1;

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

const broadcastRoom = (roomId: string, msg: ServerMessage): void => {
  const data = JSON.stringify(msg);
  clients.forEach((ws) => {
    if (ws.roomId === roomId && ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  });
};

const broadcastRoomsUpdate = (): void => {
  broadcast({ type: "rooms-update", rooms: getRoomSummaries() });
};

const broadcastRoomUpdate = (roomId: string): void => {
  broadcastRoom(roomId, { type: "room-update", room: getRoomSummary(roomId) });
};

const broadcastStateUpdate = (room: ServerRoom): void => {
  broadcastRoom(room.id, {
    type: "state-update",
    players: room.players,
    revealedTiles: room.revealedTiles,
    npcs: getNpcs(room.id),
  });
};

const stopNpcTick = (roomId: string): void => {
  const interval = npcTickIntervals.get(roomId);
  if (!interval) return;
  clearInterval(interval);
  npcTickIntervals.delete(roomId);
};

const startNpcTick = (roomId: string): void => {
  stopNpcTick(roomId);
  const tickMs = MOVE_INTERVAL_MS * NPC_SPEED_MULTIPLIER;

  npcTickIntervals.set(roomId, setInterval(() => {
    const room = getRoom(roomId);
    if (!room || room.status !== "playing") {
      stopNpcTick(roomId);
      return;
    }

    moveNpcsRandom(room.maze, room.players, room.id);

    const collisions = checkNpcPlayerCollisions(room.players, room.id);
    for (const { npcId, playerId } of collisions) {
      removeNpc(npcId, room.id);
      applyDebuff(playerId, room.id);
      const hitPlayer = room.players.find((p) => p.id === playerId);
      broadcastRoom(room.id, {
        type: "debuff-applied",
        playerId,
        playerName: hitPlayer?.name ?? "Unknown",
        durationMs: NPC_DEBUFF_DURATION_MS,
      });
    }

    ensureNpcCount(room.players.length * NPC_COUNT_PER_PLAYER, room.maze, room.players, room.id);
    broadcastStateUpdate(room);
  }, tickMs));
};

const leaveCurrentRoom = (ws: ClientSocket): void => {
  if (!ws.playerId || !ws.roomId) return;

  const previousRoomId = ws.roomId;
  const room = removePlayerFromRoom(ws.playerId);
  ws.roomId = undefined;
  send(ws, { type: "room-update", room: null });

  if (!room) return;
  if (room.players.length === 0) {
    stopNpcTick(previousRoomId);
    resetNpcs(previousRoomId);
    resetDebuffs(previousRoomId);
    resetStats(previousRoomId);
  } else {
    broadcastRoomUpdate(previousRoomId);
  }
  broadcastRoomsUpdate();
};

const handleSetUsername = (ws: ClientSocket, name: string): void => {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  if (!ws.playerId) {
    ws.playerId = `player-${nextId++}`;
    send(ws, { type: "player-id", id: ws.playerId });
  }

  ws.username = trimmedName;
  updatePlayerName(ws.playerId, trimmedName);
  broadcastRoomsUpdate();
  if (ws.roomId) broadcastRoomUpdate(ws.roomId);
};

const handleCreateRoom = (ws: ClientSocket, name?: string): void => {
  if (!ws.playerId || !ws.username) return;

  leaveCurrentRoom(ws);

  const roomId = `room-${nextRoomId++}`;
  const roomName = name?.trim() || `${ws.username}'s room`;
  const room = createRoom(roomId, roomName, ws.playerId, ws.username);
  ws.roomId = room.id;

  send(ws, { type: "room-update", room: getRoomSummary(room.id) });
  broadcastRoomsUpdate();
};

const handleJoinRoom = (ws: ClientSocket, roomId: string): void => {
  if (!ws.playerId || !ws.username) return;

  const room = joinRoom(roomId, ws.playerId, ws.username);
  if (!room) return;

  ws.roomId = room.id;
  broadcastRoomUpdate(room.id);
  broadcastRoomsUpdate();
};

const handleStart = (ws: ClientSocket, mapSize?: number): void => {
  if (!ws.playerId || !ws.roomId) return;

  const room = getRoom(ws.roomId);
  if (!room || room.status !== "lobby" || room.players.length === 0) return;
  if (room.creatorId !== ws.playerId) return;

  startGame(mapSize, room.id);
  resetStats(room.id);
  resetNpcs(room.id);
  resetDebuffs(room.id);

  room.players.forEach((p) => {
    initPlayerStats(p.id, p.position, room.goalPosition!, room.id);
    revealAround(p.position, room.revealedTiles);
  });

  ensureNpcCount(room.players.length * NPC_COUNT_PER_PLAYER, room.maze, room.players, room.id);

  broadcastRoom(room.id, {
    type: "game-start",
    maze: room.maze,
    players: room.players,
    revealedTiles: room.revealedTiles,
    npcs: getNpcs(room.id),
  });
  broadcastRoomsUpdate();
  startNpcTick(room.id);
};

const handleMove = (ws: ClientSocket, msg: ClientMessage & { type: "move" }): void => {
  if (!ws.playerId || !ws.roomId) return;

  const room = getRoom(ws.roomId);
  if (!room || room.status !== "playing") return;

  const player = room.players.find((p) => p.id === ws.playerId);
  if (!player || !canMove(ws.playerId, room.id)) return;

  const newPos = movePlayer(player.position, msg.direction, room.maze);
  if (newPos.x === player.position.x && newPos.y === player.position.y) return;

  player.position = newPos;
  revealAround(newPos, room.revealedTiles);
  recordStep(player.id, newPos, room.goalPosition!, room.id);

  const collisions = checkNpcPlayerCollisions(room.players, room.id);
  for (const { npcId, playerId } of collisions) {
    removeNpc(npcId, room.id);
    applyDebuff(playerId, room.id);
    const hitPlayer = room.players.find((p) => p.id === playerId);
    broadcastRoom(room.id, {
      type: "debuff-applied",
      playerId,
      playerName: hitPlayer?.name ?? "Unknown",
      durationMs: NPC_DEBUFF_DURATION_MS,
    });
  }
  ensureNpcCount(room.players.length * NPC_COUNT_PER_PLAYER, room.maze, room.players, room.id);

  if (checkObjective(player, room.maze)) {
    stopNpcTick(room.id);
    endGame(player, room.id);
    broadcastRoom(room.id, {
      type: "game-over",
      winner: { id: player.id, name: player.name, color: player.color },
      players: room.players,
      revealedTiles: room.revealedTiles,
      maze: room.maze,
      playerStats: getStats(room.id),
    });
    broadcastRoomsUpdate();
    return;
  }

  broadcastStateUpdate(room);
};

const handleReturnToLobby = (ws: ClientSocket): void => {
  if (!ws.roomId) return;
  const room = getRoom(ws.roomId);
  if (!room) return;

  stopNpcTick(room.id);
  resetNpcs(room.id);
  resetDebuffs(room.id);
  returnToLobby(room.id);

  broadcastRoom(room.id, { type: "lobby-return", room: getRoomSummary(room.id)! });
  broadcastRoomUpdate(room.id);
  broadcastRoomsUpdate();
};

const handleDisconnect = (ws: ClientSocket): void => {
  clients.delete(ws);
  leaveCurrentRoom(ws);
};

export const handleConnection = (ws: ClientSocket): void => {
  clients.add(ws);
  send(ws, { type: "rooms-update", rooms: getRoomSummaries() });

  ws.on("message", (data) => {
    try {
      const msg: ClientMessage = JSON.parse(data.toString());

      switch (msg.type) {
        case "set-username":
          handleSetUsername(ws, msg.name);
          break;
        case "create-room":
          handleCreateRoom(ws, msg.name);
          break;
        case "join-room":
          handleJoinRoom(ws, msg.roomId);
          break;
        case "leave-room":
          leaveCurrentRoom(ws);
          break;
        case "start":
          handleStart(ws, msg.mapSize);
          break;
        case "move":
          handleMove(ws, msg);
          break;
        case "return-to-lobby":
          handleReturnToLobby(ws);
          break;
      }
    } catch {
      // Ignore malformed messages
    }
  });

  ws.on("close", () => handleDisconnect(ws));
};

export const resetHandler = (): void => {
  npcTickIntervals.forEach((interval) => clearInterval(interval));
  npcTickIntervals.clear();
  clients.clear();
  nextId = 1;
  nextRoomId = 1;
};
