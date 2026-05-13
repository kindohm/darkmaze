import type { Player, GameState, Position, RoomSummary } from "maze-shared";
import { PLAYER_COLORS, DEFAULT_MAP_SIZE, MIN_MAP_SIZE, MAX_MAP_SIZE } from "maze-shared";
import { generateMaze, type MazeResult } from "../maze/generate.js";

export type ServerGameState = GameState & {
  spawnArea: Position[];
  goalPosition: Position | null;
};

export type ServerRoom = ServerGameState & {
  id: string;
  name: string;
  creatorId: string;
};

const createEmptyGameState = (): ServerGameState => ({
  status: "lobby",
  players: [],
  maze: [],
  revealedTiles: [],
  winner: null,
  spawnArea: [],
  goalPosition: null,
});

const createEmptyState = (): ServerGameState => createEmptyGameState();

let state: ServerGameState = createEmptyState();
let rooms: ServerRoom[] = [];

const createPlayer = (id: string, name: string): Player => ({
  id,
  name,
  color: PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)],
  position: { x: 0, y: 0 },
});

const summarizeRoom = (room: ServerRoom): RoomSummary => ({
  id: room.id,
  name: room.name,
  creatorId: room.creatorId,
  status: room.status,
  players: room.players.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
  })),
});

export const getState = (): ServerGameState => state;

export const resetState = (): void => {
  state = createEmptyState();
  rooms = [];
};

export const createRoom = (id: string, name: string, creatorId: string, creatorName: string): ServerRoom => {
  removePlayerFromRoom(creatorId);

  const room: ServerRoom = {
    ...createEmptyGameState(),
    id,
    name,
    creatorId,
    players: [createPlayer(creatorId, creatorName)],
  };

  rooms.push(room);
  return room;
};

export const getRooms = (): ServerRoom[] => rooms;

export const getRoom = (roomId: string): ServerRoom | undefined =>
  rooms.find((room) => room.id === roomId);

export const getRoomSummaries = (): RoomSummary[] => rooms.map(summarizeRoom);

export const getRoomSummary = (roomId: string): RoomSummary | null => {
  const room = getRoom(roomId);
  return room ? summarizeRoom(room) : null;
};

export const findPlayerRoom = (playerId: string): ServerRoom | undefined =>
  rooms.find((room) => room.players.some((player) => player.id === playerId));

export const joinRoom = (roomId: string, playerId: string, playerName: string): ServerRoom | null => {
  const room = getRoom(roomId);
  if (!room || room.status !== "lobby") return null;

  removePlayerFromRoom(playerId);

  const existing = room.players.find((player) => player.id === playerId);
  if (existing) {
    existing.name = playerName;
  } else {
    room.players.push(createPlayer(playerId, playerName));
  }

  return room;
};

export const updatePlayerName = (playerId: string, name: string): void => {
  const room = findPlayerRoom(playerId);
  const player = room?.players.find((p) => p.id === playerId);
  if (player) player.name = name;
};

export const removePlayerFromRoom = (playerId: string): ServerRoom | null => {
  const room = findPlayerRoom(playerId);
  if (!room) return null;

  const idx = room.players.findIndex((player) => player.id === playerId);
  if (idx === -1) return null;
  room.players.splice(idx, 1);

  if (room.players.length === 0) {
    rooms = rooms.filter((candidate) => candidate.id !== room.id);
    return room;
  }

  if (room.creatorId === playerId) {
    room.creatorId = room.players[0].id;
  }

  return room;
};

export const addPlayer = (id: string, name: string): Player => {
  const player = createPlayer(id, name);
  state.players.push(player);
  return player;
};

export const removePlayer = (id: string): boolean => {
  const idx = state.players.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  state.players.splice(idx, 1);
  return true;
};

export const getPlayer = (id: string, roomId?: string): Player | undefined => {
  if (!roomId) return state.players.find((p) => p.id === id);
  return getRoom(roomId)?.players.find((p) => p.id === id);
};

export const isLastPlayer = (roomId?: string): boolean =>
  roomId ? (getRoom(roomId)?.players.length ?? 0) === 0 : state.players.length === 0;

const startGameForState = (gameState: ServerGameState, mapSize?: number): MazeResult => {
  const size = Math.max(MIN_MAP_SIZE, Math.min(MAX_MAP_SIZE, mapSize ?? DEFAULT_MAP_SIZE));
  const mazeResult = generateMaze(size, size);
  gameState.maze = mazeResult.grid;
  gameState.spawnArea = mazeResult.spawnArea;
  gameState.goalPosition = mazeResult.goalPosition;
  gameState.status = "playing";
  gameState.winner = null;

  gameState.revealedTiles = Array.from({ length: mazeResult.grid.length }, () =>
    Array.from({ length: mazeResult.grid[0].length }, () => false)
  );

  gameState.players.forEach((player, i) => {
    const spawnIdx = i % mazeResult.spawnArea.length;
    player.position = { ...mazeResult.spawnArea[spawnIdx] };
  });

  return mazeResult;
};

export const startGame = (mapSize?: number, roomId?: string): MazeResult => {
  const gameState = roomId ? getRoom(roomId) : state;
  if (!gameState) throw new Error(`Unknown room: ${roomId}`);
  return startGameForState(gameState, mapSize);
};

export const endGame = (winner: Player, roomId?: string): void => {
  const gameState = roomId ? getRoom(roomId) : state;
  if (!gameState) return;
  gameState.status = "finished";
  gameState.winner = winner;
};

export const returnToLobby = (roomId?: string): void => {
  const gameState = roomId ? getRoom(roomId) : state;
  if (!gameState) return;

  gameState.status = "lobby";
  gameState.maze = [];
  gameState.revealedTiles = [];
  gameState.spawnArea = [];
  gameState.goalPosition = null;
  gameState.winner = null;
  gameState.players.forEach((p) => {
    p.position = { x: 0, y: 0 };
  });
};
